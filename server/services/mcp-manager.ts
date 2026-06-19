import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { WebSocket } from 'ws';
import type { DatabaseProvider, McpServerRow, McpToolRow } from '../db/provider.js';

// ─── MCP Manager ──────────────────────────────────────────────────────────────
// The runtime half of the MCP Register. Where mcp-gateway leans on Kubernetes
// for lifecycle, we manage MCP servers as local connections:
//   • stdio      → spawn a child process and speak newline-framed JSON-RPC 2.0
//   • websocket  → connect to a URL and speak JSON-RPC over text frames
//   • sse        → not yet supported (start() reports a clear error)
//
// Responsibilities mirror the gateway's Deployment Manager + Tool Gateway
// Router + Data Plane:
//   • start/stop a server, run the initialize → tools/list handshake
//   • own the LIVE status (the DB column is only last-known)
//   • keep a per-server log ring buffer
//   • dispatch tools/call and arbitrary JSON-RPC (the data plane)
//   • route a bare tool name to the server that owns it, with session affinity

const PROTOCOL_VERSION = '2024-11-05';
const REQUEST_TIMEOUT_MS = 30_000;
const HANDSHAKE_TIMEOUT_MS = 20_000;
const LOG_RING_SIZE = 500;

export type McpStatus = 'running' | 'idle' | 'stopped' | 'error';

export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: unknown;
  callCount: number;
}

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// A live, connected server. Absent from the map ⇒ effectively 'stopped'.
interface LiveConnection {
  id: string;
  status: McpStatus;
  transport: Transport;
  rpc: JsonRpcClient;
  logs: string[];
  tools: DiscoveredTool[];
  startedAt: number;
  lastError?: string;
}

// Minimal transport contract — a duplex JSON-RPC message channel.
interface Transport {
  send(message: JsonRpcMessage): void;
  close(): Promise<void>;
}

export class McpManager {
  private live = new Map<string, LiveConnection>();
  // sessionId → set of server ids the session has touched (sticky routing).
  private sessions = new Map<string, Set<string>>();

  constructor(private db: DatabaseProvider) {}

  // Nothing is connected at boot, so any persisted 'running'/'idle' is stale.
  // Reset rows to 'stopped' so the UI matches reality, then auto-start opt-ins.
  async init(): Promise<void> {
    const servers = await this.db.getMcpServers();
    for (const row of servers) {
      if (row.status !== 'stopped') {
        await this.db.updateMcpServer(row.id, { status: 'stopped', updated_at: new Date().toISOString() });
      }
    }
    for (const row of servers) {
      if (row.auto_start === 1) {
        this.start(row.id).catch(() => { /* surfaced via status/last_error */ });
      }
    }
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.live.keys()].map((id) => this.stop(id).catch(() => {})));
  }

  // Effective status: the live value when connected, else 'stopped'. The DB
  // column is only a last-known hint for cold reads before init reconciles.
  effectiveStatus(id: string): McpStatus {
    return this.live.get(id)?.status ?? 'stopped';
  }

  getTools(id: string): DiscoveredTool[] {
    return this.live.get(id)?.tools ?? [];
  }

  // Every tool exposed by a currently-running server, tagged with its owner.
  // This is what the AI chat advertises to the model as callable tools.
  listRunningTools(): Array<{ serverId: string; name: string; description: string; inputSchema: unknown }> {
    const out: Array<{ serverId: string; name: string; description: string; inputSchema: unknown }> = [];
    for (const conn of this.live.values()) {
      if (conn.status !== 'running') continue;
      for (const t of conn.tools) {
        out.push({ serverId: conn.id, name: t.name, description: t.description, inputSchema: t.inputSchema });
      }
    }
    return out;
  }

  getLogs(id: string): string[] {
    return this.live.get(id)?.logs ?? [];
  }

  getLastError(id: string): string | undefined {
    return this.live.get(id)?.lastError;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async start(id: string): Promise<McpStatus> {
    const existing = this.live.get(id);
    if (existing && existing.status === 'running') return existing.status;
    // A half-open/errored connection lingering in the map: tear it down first.
    if (existing) await this.stop(id);

    const row = await this.db.getMcpServerById(id);
    if (!row) throw new Error(`MCP server ${id} not found`);

    const conn: LiveConnection = {
      id,
      status: 'idle',
      transport: null as unknown as Transport,
      rpc: null as unknown as JsonRpcClient,
      logs: [],
      tools: [],
      startedAt: Date.now(),
    };
    this.live.set(id, conn);
    const log = (line: string) => pushLog(conn.logs, line);

    try {
      const transport = await this.openTransport(row, log);
      conn.transport = transport;
      conn.rpc = new JsonRpcClient(transport, (note) => log(`← notification ${note.method ?? ''}`));

      // initialize → notifications/initialized → tools/list
      log('→ initialize');
      await conn.rpc.request('initialize', {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'devdock-mcp-register', version: '1.0.0' },
      }, HANDSHAKE_TIMEOUT_MS);
      conn.rpc.notify('notifications/initialized', {});

      const tools = await this.discoverTools(conn, log);
      conn.tools = tools;
      conn.status = 'running';
      log(`✓ running — ${tools.length} tool(s) discovered`);

      await this.persistTools(id, tools);
      await this.db.updateMcpServer(id, { status: 'running', last_error: undefined, updated_at: new Date().toISOString() });
      return 'running';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      conn.status = 'error';
      conn.lastError = message;
      log(`✗ start failed: ${message}`);
      // Keep the errored connection's logs around for the UI, but drop any
      // transport so a retry starts clean.
      try { await conn.transport?.close(); } catch { /* ignore */ }
      await this.db.updateMcpServer(id, { status: 'error', last_error: message, updated_at: new Date().toISOString() });
      return 'error';
    }
  }

  async stop(id: string): Promise<McpStatus> {
    const conn = this.live.get(id);
    if (conn) {
      try { conn.rpc?.dispose(new Error('server stopped')); } catch { /* ignore */ }
      try { await conn.transport?.close(); } catch { /* ignore */ }
      this.live.delete(id);
    }
    await this.db.updateMcpServer(id, { status: 'stopped', updated_at: new Date().toISOString() }).catch(() => {});
    return 'stopped';
  }

  // ─── Data plane ─────────────────────────────────────────────────────────────

  // Arbitrary JSON-RPC passthrough to a specific server (session-aware).
  async rpc(id: string, method: string, params: unknown, sessionId?: string): Promise<unknown> {
    const conn = this.requireRunning(id);
    if (sessionId) this.recordSession(sessionId, id);
    return conn.rpc.request(method, params);
  }

  // Call a tool on a specific server and bump call counters.
  async callTool(id: string, toolName: string, args: unknown, sessionId?: string): Promise<unknown> {
    const conn = this.requireRunning(id);
    if (sessionId) this.recordSession(sessionId, id);
    const result = await conn.rpc.request('tools/call', { name: toolName, arguments: args ?? {} });
    const tool = conn.tools.find((t) => t.name === toolName);
    if (tool) tool.callCount += 1;
    const row = await this.db.getMcpServerById(id);
    await this.db.updateMcpServer(id, {
      call_count: (row?.call_count ?? 0) + 1,
      last_used: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).catch(() => {});
    return result;
  }

  // Tool Gateway Router: resolve a bare tool name to a running server that owns
  // it, then dispatch. Sticky sessions prefer a server they've already used.
  async routeToolCall(toolName: string, args: unknown, sessionId?: string): Promise<{ serverId: string; result: unknown }> {
    const candidates = [...this.live.values()].filter(
      (c) => c.status === 'running' && c.tools.some((t) => t.name === toolName),
    );
    if (candidates.length === 0) {
      throw new Error(`No running MCP server exposes tool "${toolName}"`);
    }
    let chosen = candidates[0];
    if (sessionId) {
      const bound = this.sessions.get(sessionId);
      const sticky = bound && candidates.find((c) => bound.has(c.id));
      if (sticky) chosen = sticky;
    }
    const result = await this.callTool(chosen.id, toolName, args, sessionId);
    return { serverId: chosen.id, result };
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private requireRunning(id: string): LiveConnection {
    const conn = this.live.get(id);
    if (!conn || conn.status !== 'running') {
      throw new Error(`MCP server ${id} is not running`);
    }
    return conn;
  }

  private recordSession(sessionId: string, serverId: string): void {
    let set = this.sessions.get(sessionId);
    if (!set) { set = new Set(); this.sessions.set(sessionId, set); }
    set.add(serverId);
  }

  private async discoverTools(conn: LiveConnection, log: (l: string) => void): Promise<DiscoveredTool[]> {
    log('→ tools/list');
    const res = (await conn.rpc.request('tools/list', {})) as { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> };
    const tools = res?.tools ?? [];
    return tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema ?? {},
      callCount: 0,
    }));
  }

  private async persistTools(serverId: string, tools: DiscoveredTool[]): Promise<void> {
    const now = new Date().toISOString();
    const { nanoid } = await import('nanoid');
    const rows: McpToolRow[] = tools.map((t) => ({
      id: nanoid(),
      server_id: serverId,
      name: t.name,
      description: t.description,
      input_schema: JSON.stringify(t.inputSchema ?? {}),
      call_count: 0,
      created_at: now,
      updated_at: now,
    }));
    await this.db.replaceMcpTools(serverId, rows);
  }

  // Build the right transport for the row's declared transport kind.
  private async openTransport(row: McpServerRow, log: (l: string) => void): Promise<Transport> {
    if (row.transport === 'stdio') return this.openStdio(row, log);
    if (row.transport === 'websocket') return this.openWebSocket(row, log);
    if (row.transport === 'sse') return this.openSse(row, log);
    throw new Error(`Transport "${row.transport}" is not supported (use stdio, sse, or websocket)`);
  }

  // Mark a running connection as errored when its transport drops unexpectedly.
  private markConnectionError(id: string, reason: string): void {
    const conn = this.live.get(id);
    if (conn && conn.status === 'running') {
      conn.status = 'error';
      conn.lastError = reason;
      this.db.updateMcpServer(id, { status: 'error', last_error: reason, updated_at: new Date().toISOString() }).catch(() => {});
    }
  }

  private openStdio(row: McpServerRow, log: (l: string) => void): Transport {
    if (!row.command) throw new Error('stdio server requires a command');
    const args: string[] = parseJsonArray(row.args);
    const env: Record<string, string> = parseJsonObject(row.env);
    log(`spawning: ${row.command} ${args.join(' ')}`);

    const child: ChildProcessWithoutNullStreams = spawn(row.command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let onMessage: (m: JsonRpcMessage) => void = () => {};
    let buffer = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      let nl: number;
      // MCP stdio framing: one JSON-RPC message per line, no embedded newlines.
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try { onMessage(JSON.parse(line) as JsonRpcMessage); }
        catch { log(`non-JSON stdout: ${line.slice(0, 200)}`); }
      }
    });
    child.stderr.on('data', (chunk: Buffer) => log(`[stderr] ${chunk.toString('utf8').trimEnd()}`));
    child.on('exit', (code, signal) => {
      log(`process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
      const conn = this.live.get(row.id);
      if (conn && conn.status === 'running') {
        conn.status = 'error';
        conn.lastError = `process exited (code=${code ?? 'null'})`;
        this.db.updateMcpServer(row.id, { status: 'error', last_error: conn.lastError, updated_at: new Date().toISOString() }).catch(() => {});
      }
    });
    child.on('error', (err) => log(`spawn error: ${err.message}`));

    return {
      send: (message) => child.stdin.write(JSON.stringify(message) + '\n'),
      close: async () => { child.kill('SIGTERM'); },
      // The client wires its handler in via this assignment.
      get _onMessage() { return onMessage; },
      set _onMessage(fn: (m: JsonRpcMessage) => void) { onMessage = fn; },
    } as Transport & { _onMessage: (m: JsonRpcMessage) => void };
  }

  private async openWebSocket(row: McpServerRow, log: (l: string) => void): Promise<Transport> {
    if (!row.url) throw new Error('websocket server requires a url');
    log(`connecting: ${row.url}`);
    const ws = new WebSocket(row.url);
    let onMessage: (m: JsonRpcMessage) => void = () => {};

    ws.on('message', (data: Buffer | string) => {
      const text = typeof data === 'string' ? data : data.toString('utf8');
      try { onMessage(JSON.parse(text) as JsonRpcMessage); }
      catch { log(`non-JSON frame: ${text.slice(0, 200)}`); }
    });
    ws.on('error', (err: Error) => log(`websocket error: ${err.message}`));
    ws.on('close', () => {
      log('websocket closed');
      const conn = this.live.get(row.id);
      if (conn && conn.status === 'running') {
        conn.status = 'error';
        conn.lastError = 'websocket closed';
        this.db.updateMcpServer(row.id, { status: 'error', last_error: 'websocket closed', updated_at: new Date().toISOString() }).catch(() => {});
      }
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('websocket connect timeout')), HANDSHAKE_TIMEOUT_MS);
      ws.on('open', () => { clearTimeout(timer); resolve(); });
      ws.on('error', (err: Error) => { clearTimeout(timer); reject(err); });
    });

    return {
      send: (message) => ws.send(JSON.stringify(message)),
      close: async () => { ws.close(); },
      get _onMessage() { return onMessage; },
      set _onMessage(fn: (m: JsonRpcMessage) => void) { onMessage = fn; },
    } as Transport & { _onMessage: (m: JsonRpcMessage) => void };
  }

  // HTTP+SSE transport (MCP's classic two-channel HTTP transport):
  //   • GET <url> opens an event-stream. The server's first event is named
  //     `endpoint` and its data is the URL to POST client messages to.
  //   • subsequent `message` events carry server→client JSON-RPC messages.
  //   • each client→server message is an HTTP POST to the endpoint URL; the
  //     JSON-RPC response comes back over the event-stream, not the POST body.
  private async openSse(row: McpServerRow, log: (l: string) => void): Promise<Transport> {
    if (!row.url) throw new Error('sse server requires a url');
    log(`connecting (SSE): ${row.url}`);

    const controller = new AbortController();
    let onMessage: (m: JsonRpcMessage) => void = () => {};
    let endpointUrl: string | null = null;
    let resolveEndpoint!: () => void;
    let rejectEndpoint!: (e: Error) => void;
    const endpointReady = new Promise<void>((res, rej) => { resolveEndpoint = res; rejectEndpoint = rej; });

    // Parse one SSE event block ("event:"/"data:" lines, blank-line delimited).
    const handleEvent = (raw: string) => {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith(':')) continue; // comment / keep-alive
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
      }
      const data = dataLines.join('\n');
      if (event === 'endpoint') {
        try {
          endpointUrl = new URL(data, row.url).toString();
          log(`SSE endpoint: ${endpointUrl}`);
          resolveEndpoint();
        } catch { rejectEndpoint(new Error(`invalid SSE endpoint: ${data}`)); }
        return;
      }
      if (!data) return;
      try { onMessage(JSON.parse(data) as JsonRpcMessage); }
      catch { log(`non-JSON SSE data: ${data.slice(0, 200)}`); }
    };

    const res = await fetch(row.url, {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`SSE connect failed: HTTP ${res.status}`);

    // Background pump: decode the stream into SSE event blocks (split on \n\n).
    (async () => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
          let sep: number;
          // SSE events are delimited by a blank line.
          while ((sep = buffer.indexOf('\n\n')) >= 0) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            handleEvent(raw);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) log(`SSE read error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        rejectEndpoint(new Error('SSE stream closed before endpoint'));
        log('SSE stream closed');
        this.markConnectionError(row.id, 'SSE stream closed');
      }
    })();

    // Don't return until we know where to POST, or time out.
    await withTimeout(endpointReady, HANDSHAKE_TIMEOUT_MS, 'SSE endpoint event not received');

    return {
      send: (message) => {
        if (!endpointUrl) { log('drop: SSE endpoint not ready'); return; }
        fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
          signal: controller.signal,
        })
          .then(async (r) => { if (!r.ok) log(`SSE POST ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`); })
          .catch((e) => { if (!controller.signal.aborted) log(`SSE POST error: ${e instanceof Error ? e.message : String(e)}`); });
      },
      close: async () => { controller.abort(); },
      get _onMessage() { return onMessage; },
      set _onMessage(fn: (m: JsonRpcMessage) => void) { onMessage = fn; },
    } as Transport & { _onMessage: (m: JsonRpcMessage) => void };
  }
}

// ─── JSON-RPC 2.0 client ────────────────────────────────────────────────────
// Correlates requests to responses by id; routes server-initiated messages
// (notifications/requests) to the supplied handler.
class JsonRpcClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();

  constructor(
    private transport: Transport,
    private onNotification: (msg: JsonRpcMessage) => void,
  ) {
    // The transports expose a settable _onMessage hook (see openStdio/WS).
    (transport as Transport & { _onMessage: (m: JsonRpcMessage) => void })._onMessage = (m) => this.handle(m);
  }

  request(method: string, params: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.transport.send({ jsonrpc: '2.0', id, method, params });
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  notify(method: string, params: unknown): void {
    this.transport.send({ jsonrpc: '2.0', method, params });
  }

  private handle(msg: JsonRpcMessage): void {
    if (msg.id !== undefined && msg.id !== null && this.pending.has(msg.id as number)) {
      const entry = this.pending.get(msg.id as number)!;
      this.pending.delete(msg.id as number);
      clearTimeout(entry.timer);
      if (msg.error) entry.reject(new Error(`${msg.error.message} (code ${msg.error.code})`));
      else entry.resolve(msg.result);
      return;
    }
    // Server-initiated message (notification or request we don't service).
    if (msg.method) this.onNotification(msg);
  }

  dispose(reason: Error): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(reason);
    }
    this.pending.clear();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Reject `promise` if it hasn't settled within `ms`. Used to bound the SSE
// endpoint-discovery wait so a dead URL fails fast instead of hanging start().
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function pushLog(ring: string[], line: string): void {
  ring.push(`${new Date().toISOString()}  ${line}`);
  if (ring.length > LOG_RING_SIZE) ring.splice(0, ring.length - LOG_RING_SIZE);
}

function parseJsonArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
}

function parseJsonObject(value?: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) out[k] = String(v);
      return out;
    }
    return {};
  } catch { return {}; }
}
