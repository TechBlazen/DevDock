import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import Fastify, { type FastifyInstance } from 'fastify';
import type { DatabaseProvider, McpServerRow, McpToolRow } from '../../db/provider.js';
import { McpManager } from '../../services/mcp-manager.js';
import { registerMcpRoutes } from '../mcp.js';
import { createToken } from '../../middleware/auth.js';

// In-memory fake provider implementing only the MCP surface the routes +
// manager touch. Keeps the test free of the native sqlite binding while still
// exercising the real route/manager/JSON-RPC code paths.
class FakeDb {
  servers = new Map<string, McpServerRow>();
  tools = new Map<string, McpToolRow[]>();
  async getMcpServers() { return [...this.servers.values()]; }
  async getMcpServerById(id: string) { return this.servers.get(id) ?? null; }
  async createMcpServer(s: McpServerRow) { this.servers.set(s.id, s); return s; }
  async updateMcpServer(id: string, partial: Partial<McpServerRow>) {
    const existing = this.servers.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    this.servers.set(id, updated);
    return updated;
  }
  async deleteMcpServer(id: string) { this.servers.delete(id); this.tools.delete(id); }
  async getMcpTools(serverId?: string) {
    if (serverId) return this.tools.get(serverId) ?? [];
    return [...this.tools.values()].flat();
  }
  async getMcpToolByName(name: string) {
    return [...this.tools.values()].flat().find((t) => t.name === name) ?? null;
  }
  async replaceMcpTools(serverId: string, tools: McpToolRow[]) { this.tools.set(serverId, tools); }
  async deleteMcpToolsByServer(serverId: string) { this.tools.delete(serverId); }
}

const makeDb = () => new FakeDb() as unknown as DatabaseProvider;

// End-to-end MCP Register test: real SqliteProvider (in-memory), the real
// McpManager, Fastify via inject(), and a mock stdio MCP server (a tiny node
// script) so the JSON-RPC handshake, tool discovery, and tools/call dispatch
// are exercised for real — not mocked.

const SECRET = 'test-secret';
const auth = { authorization: `Bearer ${createToken({ userId: 'admin-001', username: 'admin', role: 'admin' }, SECRET)}` };

// A minimal MCP server speaking newline-framed JSON-RPC over stdio. Answers
// initialize + tools/list (one "echo" tool) + tools/call (echoes its args).
const MOCK_MCP_SERVER = `
let buf = '';
process.stdin.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'mock', version: '1' } } });
    else if (msg.method === 'tools/list') send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'echo', description: 'Echoes its arguments', inputSchema: { type: 'object' } }] } });
    else if (msg.method === 'tools/call') send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(msg.params.arguments) }] } });
    else if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, result: {} });
  }
});
function send(o) { process.stdout.write(JSON.stringify(o) + '\\n'); }
`;

describe('MCP Register routes', () => {
  let app: FastifyInstance;
  let manager: McpManager;

  beforeAll(async () => {
    const db = makeDb();
    manager = new McpManager(db);
    await manager.init();
    app = Fastify();
    registerMcpRoutes(app, db, SECRET, manager);
    await app.ready();
  });

  afterAll(async () => {
    await manager.shutdown();
    await app.close();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcp/servers' });
    expect(res.statusCode).toBe(401);
  });

  it('creates, lists, gets, and patches a server (control plane)', async () => {
    const create = await app.inject({
      method: 'POST', url: '/api/mcp/servers', headers: auth,
      payload: { name: 'echo-server', description: 'mock', transport: 'stdio', command: process.execPath, args: ['-e', MOCK_MCP_SERVER] },
    });
    expect(create.statusCode).toBe(201);
    const created = create.json();
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('echo-server');
    expect(created.status).toBe('stopped');
    expect(created.args).toEqual(['-e', MOCK_MCP_SERVER]);

    const list = await app.inject({ method: 'GET', url: '/api/mcp/servers', headers: auth });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((s: { id: string }) => s.id === created.id)).toBe(true);

    const patch = await app.inject({
      method: 'PATCH', url: `/api/mcp/servers/${created.id}`, headers: auth,
      payload: { description: 'updated', autoStart: true },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().description).toBe('updated');
    expect(patch.json().autoStart).toBe(true);
  });

  it('validates required fields on create', async () => {
    const noName = await app.inject({ method: 'POST', url: '/api/mcp/servers', headers: auth, payload: { transport: 'stdio', command: 'x' } });
    expect(noName.statusCode).toBe(400);
    const stdioNoCommand = await app.inject({ method: 'POST', url: '/api/mcp/servers', headers: auth, payload: { name: 'x', transport: 'stdio' } });
    expect(stdioNoCommand.statusCode).toBe(400);
    const wsNoUrl = await app.inject({ method: 'POST', url: '/api/mcp/servers', headers: auth, payload: { name: 'x', transport: 'websocket' } });
    expect(wsNoUrl.statusCode).toBe(400);
  });

  it('starts a real stdio server: handshake, tool discovery, and tools/call', async () => {
    const create = await app.inject({
      method: 'POST', url: '/api/mcp/servers', headers: auth,
      payload: { name: 'live-echo', transport: 'stdio', command: process.execPath, args: ['-e', MOCK_MCP_SERVER] },
    });
    const id = create.json().id;

    const start = await app.inject({ method: 'POST', url: `/api/mcp/servers/${id}/start`, headers: auth });
    expect(start.statusCode).toBe(200);
    expect(start.json().status).toBe('running');

    // Tools discovered via tools/list and persisted.
    const tools = await app.inject({ method: 'GET', url: `/api/mcp/servers/${id}/tools`, headers: auth });
    expect(tools.json().tools).toHaveLength(1);
    expect(tools.json().tools[0].name).toBe('echo');

    // Data plane: call the tool directly on the server.
    const call = await app.inject({
      method: 'POST', url: `/api/mcp/servers/${id}/tools/echo/call`, headers: auth,
      payload: { arguments: { hello: 'world' } },
    });
    expect(call.statusCode).toBe(200);
    expect(JSON.stringify(call.json().result)).toContain('world');

    // Tool Gateway Router: dispatch by bare tool name to the owning server.
    const routed = await app.inject({
      method: 'POST', url: '/api/mcp/tools/echo/call', headers: auth,
      payload: { arguments: { routed: true }, sessionId: 's1' },
    });
    expect(routed.statusCode).toBe(200);
    expect(routed.json().serverId).toBe(id);

    // Call count incremented on the row.
    const detail = await app.inject({ method: 'GET', url: `/api/mcp/servers/${id}`, headers: auth });
    expect(detail.json().callCount).toBeGreaterThanOrEqual(2);

    const stop = await app.inject({ method: 'POST', url: `/api/mcp/servers/${id}/stop`, headers: auth });
    expect(stop.json().status).toBe('stopped');
  }, 15_000);

  it('reports a graceful error when a server fails to connect', async () => {
    // Unreachable SSE endpoint → status 'error' with the failure surfaced,
    // never a hang or crash.
    const create = await app.inject({
      method: 'POST', url: '/api/mcp/servers', headers: auth,
      payload: { name: 'dead-sse', transport: 'sse', url: 'http://127.0.0.1:9/sse' },
    });
    const id = create.json().id;
    const start = await app.inject({ method: 'POST', url: `/api/mcp/servers/${id}/start`, headers: auth });
    expect(start.json().status).toBe('error');
    expect(start.json().lastError).toBeTruthy();
  }, 15_000);

  it('deletes a server', async () => {
    const create = await app.inject({
      method: 'POST', url: '/api/mcp/servers', headers: auth,
      payload: { name: 'temp', transport: 'stdio', command: 'echo' },
    });
    const id = create.json().id;
    const del = await app.inject({ method: 'DELETE', url: `/api/mcp/servers/${id}`, headers: auth });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/api/mcp/servers/${id}`, headers: auth });
    expect(get.statusCode).toBe(404);
  });
});

// Build a JSON-RPC reply for the mock MCP servers (shared by stdio + SSE). A
// notification (no id) yields null — nothing to send back.
function mockReply(msg: { id?: number; method?: string; params?: { arguments?: unknown } }) {
  if (msg.id === undefined) return null;
  if (msg.method === 'initialize') return { jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'mock-sse', version: '1' } } };
  if (msg.method === 'tools/list') return { jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'echo', description: 'Echoes its arguments', inputSchema: { type: 'object' } }] } };
  if (msg.method === 'tools/call') return { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(msg.params?.arguments) }] } };
  return { jsonrpc: '2.0', id: msg.id, result: {} };
}

describe('MCP HTTP+SSE transport', () => {
  let httpServer: HttpServer;
  let sseRes: ServerResponse | null = null;
  let sseUrl = '';

  beforeAll(async () => {
    // Mock MCP server speaking the classic HTTP+SSE transport: GET /sse opens
    // the stream and advertises POST /messages; responses are pushed back over
    // the stream.
    httpServer = createServer((req, res) => {
      if (req.method === 'GET' && req.url?.startsWith('/sse')) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write('event: endpoint\ndata: /messages\n\n');
        sseRes = res;
        return;
      }
      if (req.method === 'POST' && req.url?.startsWith('/messages')) {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const reply = mockReply(JSON.parse(body));
          if (reply && sseRes) sseRes.write(`event: message\ndata: ${JSON.stringify(reply)}\n\n`);
          res.writeHead(202); res.end();
        });
        return;
      }
      res.writeHead(404); res.end();
    });
    await new Promise<void>((r) => httpServer.listen(0, '127.0.0.1', r));
    sseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/sse`;
  });

  afterAll(async () => {
    sseRes?.end();
    await new Promise<void>((r) => httpServer.close(() => r()));
  });

  it('starts an SSE server: handshake, discovery, and tool call over the stream', async () => {
    const db = makeDb();
    const m = new McpManager(db);
    await m.init();
    const a = Fastify();
    registerMcpRoutes(a, db, SECRET, m);
    await a.ready();

    const create = await a.inject({
      method: 'POST', url: '/api/mcp/servers', headers: auth,
      payload: { name: 'sse-echo', transport: 'sse', url: sseUrl },
    });
    const id = create.json().id;

    const start = await a.inject({ method: 'POST', url: `/api/mcp/servers/${id}/start`, headers: auth });
    expect(start.json().status).toBe('running');

    const tools = await a.inject({ method: 'GET', url: `/api/mcp/servers/${id}/tools`, headers: auth });
    expect(tools.json().tools).toHaveLength(1);
    expect(tools.json().tools[0].name).toBe('echo');

    const call = await a.inject({
      method: 'POST', url: `/api/mcp/servers/${id}/tools/echo/call`, headers: auth,
      payload: { arguments: { over: 'sse' } },
    });
    expect(call.statusCode).toBe(200);
    expect(JSON.stringify(call.json().result)).toContain('sse');

    await m.shutdown();
    await a.close();
  }, 15_000);
});
