import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DatabaseProvider, McpServerRow, McpToolRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';
import type { McpManager } from '../services/mcp-manager.js';

// MCP Register routes — the control plane (CRUD + lifecycle) and data plane
// (session-aware RPC + the tool-router) for registered MCP servers. Modelled
// on Microsoft's mcp-gateway adapter/tool APIs, mapped onto DevDock's stack.
//
// The DB row is the durable registration; the McpManager owns live status,
// logs, and the active JSON-RPC connections. Reads merge the two so the client
// always sees real status rather than the last-persisted value.

const TRANSPORTS = ['stdio', 'sse', 'websocket'] as const;
const SESSION_STRATEGIES = ['sticky', 'stateless'] as const;

export function registerMcpRoutes(
  app: FastifyInstance,
  db: DatabaseProvider,
  jwtSecret: string,
  manager: McpManager,
) {
  const guard = authGuard(jwtSecret);

  // Mutations (create/update/delete/lifecycle/tool-calls) are writer-only;
  // viewers get read access. Mirrors the page-permission split elsewhere.
  const requireWriter = (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = getRequestUser(request);
    if (role === 'viewer') {
      reply.status(403).send({ error: 'Requires editor or admin role' });
      return false;
    }
    return true;
  };

  // ─── Control plane: registry CRUD ───────────────────────────────────────────

  app.get('/api/mcp/servers', { preHandler: guard }, async () => {
    const [rows, tools] = await Promise.all([db.getMcpServers(), db.getMcpTools()]);
    const toolCounts = new Map<string, number>();
    for (const t of tools) toolCounts.set(t.server_id, (toolCounts.get(t.server_id) ?? 0) + 1);
    return rows.map((row) => serializeServer(row, manager, toolCounts.get(row.id) ?? 0));
  });

  app.get('/api/mcp/servers/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await db.getMcpServerById(id);
    if (!row) return reply.status(404).send({ error: 'MCP server not found' });
    const tools = await db.getMcpTools(id);
    return { ...serializeServer(row, manager, tools.length), tools: tools.map(serializeTool) };
  });

  app.post('/api/mcp/servers', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const name = String(body.name ?? '').trim();
    if (!name) return reply.status(400).send({ error: 'name is required' });

    const transport = String(body.transport ?? 'stdio');
    if (!TRANSPORTS.includes(transport as (typeof TRANSPORTS)[number])) {
      return reply.status(400).send({ error: `transport must be one of ${TRANSPORTS.join(', ')}` });
    }
    if (transport === 'stdio' && !body.command) {
      return reply.status(400).send({ error: 'stdio servers require a command' });
    }
    if ((transport === 'sse' || transport === 'websocket') && !body.url) {
      return reply.status(400).send({ error: `${transport} servers require a url` });
    }

    const sessionStrategy = String(body.sessionStrategy ?? 'sticky');
    if (!SESSION_STRATEGIES.includes(sessionStrategy as (typeof SESSION_STRATEGIES)[number])) {
      return reply.status(400).send({ error: `sessionStrategy must be one of ${SESSION_STRATEGIES.join(', ')}` });
    }

    const row: McpServerRow = {
      id: nanoid(),
      name,
      description: String(body.description ?? ''),
      transport,
      command: body.command ? String(body.command) : undefined,
      args: encodeArray(body.args),
      env: encodeObject(body.env),
      url: body.url ? String(body.url) : undefined,
      port: body.port !== undefined ? Number(body.port) : undefined,
      status: 'stopped',
      auto_start: body.autoStart ? 1 : 0,
      session_strategy: sessionStrategy,
      call_count: 0,
      capabilities: encodeArray(body.capabilities),
      last_used: undefined,
      last_error: undefined,
      added_by: caller.userId,
      created_at: now,
      updated_at: now,
    };
    const created = await db.createMcpServer(row);
    return reply.status(201).send(serializeServer(created, manager, 0));
  });

  app.patch('/api/mcp/servers/:id', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<McpServerRow> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) partial.name = String(body.name);
    if (body.description !== undefined) partial.description = String(body.description);
    if (body.transport !== undefined) {
      if (!TRANSPORTS.includes(String(body.transport) as (typeof TRANSPORTS)[number])) {
        return reply.status(400).send({ error: `transport must be one of ${TRANSPORTS.join(', ')}` });
      }
      partial.transport = String(body.transport);
    }
    if (body.command !== undefined) partial.command = body.command ? String(body.command) : undefined;
    if (body.args !== undefined) partial.args = encodeArray(body.args);
    if (body.env !== undefined) partial.env = encodeObject(body.env);
    if (body.url !== undefined) partial.url = body.url ? String(body.url) : undefined;
    if (body.port !== undefined) partial.port = body.port === null ? undefined : Number(body.port);
    if (body.autoStart !== undefined) partial.auto_start = body.autoStart ? 1 : 0;
    if (body.sessionStrategy !== undefined) {
      if (!SESSION_STRATEGIES.includes(String(body.sessionStrategy) as (typeof SESSION_STRATEGIES)[number])) {
        return reply.status(400).send({ error: `sessionStrategy must be one of ${SESSION_STRATEGIES.join(', ')}` });
      }
      partial.session_strategy = String(body.sessionStrategy);
    }
    if (body.capabilities !== undefined) partial.capabilities = encodeArray(body.capabilities);

    const updated = await db.updateMcpServer(id, partial);
    if (!updated) return reply.status(404).send({ error: 'MCP server not found' });
    const tools = await db.getMcpTools(id);
    // Connection-affecting edits only take effect on the next start.
    const restartRequired = manager.effectiveStatus(id) === 'running'
      && ['transport', 'command', 'args', 'env', 'url'].some((k) => k in partial);
    return { ...serializeServer(updated, manager, tools.length), restartRequired };
  });

  app.delete('/api/mcp/servers/:id', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const row = await db.getMcpServerById(id);
    if (!row) return reply.status(404).send({ error: 'MCP server not found' });
    if (row.added_by && row.added_by !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the registrant or admins can delete' });
    }
    await manager.stop(id).catch(() => {});
    await db.deleteMcpServer(id);
    return reply.status(204).send();
  });

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  app.post('/api/mcp/servers/:id/start', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const { id } = request.params as { id: string };
    const row = await db.getMcpServerById(id);
    if (!row) return reply.status(404).send({ error: 'MCP server not found' });
    const status = await manager.start(id);
    return { id, status, lastError: manager.getLastError(id), logs: manager.getLogs(id) };
  });

  app.post('/api/mcp/servers/:id/stop', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const { id } = request.params as { id: string };
    const status = await manager.stop(id);
    return { id, status };
  });

  app.get('/api/mcp/servers/:id/status', { preHandler: guard }, async (request) => {
    const { id } = request.params as { id: string };
    return {
      id,
      status: manager.effectiveStatus(id),
      lastError: manager.getLastError(id),
      toolCount: manager.getTools(id).length,
    };
  });

  app.get('/api/mcp/servers/:id/logs', { preHandler: guard }, async (request) => {
    const { id } = request.params as { id: string };
    return { id, logs: manager.getLogs(id) };
  });

  // Live tools when running; otherwise the last discovered set from the DB.
  app.get('/api/mcp/servers/:id/tools', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await db.getMcpServerById(id);
    if (!row) return reply.status(404).send({ error: 'MCP server not found' });
    if (manager.effectiveStatus(id) === 'running') {
      return { id, tools: manager.getTools(id) };
    }
    const tools = await db.getMcpTools(id);
    return { id, tools: tools.map(serializeTool) };
  });

  // ─── Data plane ─────────────────────────────────────────────────────────────

  // Arbitrary JSON-RPC passthrough to one server (session affinity honoured).
  app.post('/api/mcp/servers/:id/rpc', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = request.body as { method?: string; params?: unknown; sessionId?: string };
    if (!body.method) return reply.status(400).send({ error: 'method is required' });
    try {
      const result = await manager.rpc(id, body.method, body.params, body.sessionId);
      return { result };
    } catch (e) {
      return reply.status(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Call a tool on a specific server.
  app.post('/api/mcp/servers/:id/tools/:tool/call', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const { id, tool } = request.params as { id: string; tool: string };
    const body = (request.body ?? {}) as { arguments?: unknown; sessionId?: string };
    try {
      const result = await manager.callTool(id, tool, body.arguments, body.sessionId);
      return { serverId: id, tool, result };
    } catch (e) {
      return reply.status(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Tool Gateway Router: dispatch a bare tool name to whichever running server
  // owns it (sticky sessions prefer a server they've already used).
  app.post('/api/mcp/tools/:tool/call', { preHandler: guard }, async (request, reply) => {
    if (!requireWriter(request, reply)) return;
    const { tool } = request.params as { tool: string };
    const body = (request.body ?? {}) as { arguments?: unknown; sessionId?: string };
    try {
      const { serverId, result } = await manager.routeToolCall(tool, body.arguments, body.sessionId);
      return { serverId, tool, result };
    } catch (e) {
      return reply.status(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Registry view: every discovered tool across all servers.
  app.get('/api/mcp/tools', { preHandler: guard }, async () => {
    const tools = await db.getMcpTools();
    return tools.map(serializeTool);
  });
}

// ─── Serialization (row ⇄ client shape) ─────────────────────────────────────

function serializeServer(row: McpServerRow, manager: McpManager, toolCount: number) {
  const liveStatus = manager.effectiveStatus(row.id);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    transport: row.transport,
    command: row.command,
    args: decodeArray(row.args),
    env: decodeObject(row.env),
    url: row.url,
    port: row.port,
    status: liveStatus,
    storedStatus: row.status,
    autoStart: row.auto_start === 1,
    sessionStrategy: row.session_strategy,
    callCount: row.call_count,
    capabilities: decodeArray(row.capabilities),
    lastUsed: row.last_used,
    lastError: manager.getLastError(row.id) ?? row.last_error,
    toolCount: liveStatus === 'running' ? manager.getTools(row.id).length : toolCount,
    addedBy: row.added_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeTool(row: McpToolRow) {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    description: row.description ?? '',
    inputSchema: row.input_schema ? safeParse(row.input_schema) : {},
    callCount: row.call_count,
  };
}

function encodeArray(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return JSON.stringify(value.map(String));
  if (typeof value === 'string') {
    // Accept a whitespace/comma-free JSON array or a plain space-delimited string.
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) return trimmed;
    return JSON.stringify(trimmed.split(/\s+/).filter(Boolean));
  }
  return undefined;
}

function encodeObject(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.trim() ? value : undefined;
  if (typeof value === 'object') return JSON.stringify(value);
  return undefined;
}

function decodeArray(value?: string): string[] {
  if (!value) return [];
  const parsed = safeParse(value);
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

function decodeObject(value?: string): Record<string, string> {
  if (!value) return {};
  const parsed = safeParse(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) out[k] = String(v);
    return out;
  }
  return {};
}

function safeParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return undefined; }
}
