import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { DatabaseProvider, McpServerRow, McpToolRow } from '../../db/provider.js';
import { McpManager } from '../../services/mcp-manager.js';
import { registerAiProxyRoutes } from '../ai-proxy.js';

// Verifies the AI proxy's agentic tool loop end-to-end: a (stubbed) provider
// asks to call an MCP tool, the proxy dispatches it through the real manager +
// a live mock stdio MCP server, feeds the result back, and the provider's
// follow-up answer is returned along with a toolCalls log.

class FakeDb {
  servers = new Map<string, McpServerRow>();
  tools = new Map<string, McpToolRow[]>();
  async getMcpServers() { return [...this.servers.values()]; }
  async getMcpServerById(id: string) { return this.servers.get(id) ?? null; }
  async createMcpServer(s: McpServerRow) { this.servers.set(s.id, s); return s; }
  async updateMcpServer(id: string, p: Partial<McpServerRow>) {
    const e = this.servers.get(id); if (!e) return null;
    const u = { ...e, ...p }; this.servers.set(id, u); return u;
  }
  async deleteMcpServer(id: string) { this.servers.delete(id); this.tools.delete(id); }
  async getMcpTools(serverId?: string) { return serverId ? this.tools.get(serverId) ?? [] : [...this.tools.values()].flat(); }
  async getMcpToolByName(name: string) { return [...this.tools.values()].flat().find((t) => t.name === name) ?? null; }
  async replaceMcpTools(serverId: string, tools: McpToolRow[]) { this.tools.set(serverId, tools); }
  async deleteMcpToolsByServer(serverId: string) { this.tools.delete(serverId); }
}

const MOCK_MCP_SERVER = `
let buf = '';
process.stdin.on('data', (d) => {
  buf += d; let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'mock', version: '1' } } });
    else if (msg.method === 'tools/list') send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'get_weather', description: 'Get weather', inputSchema: { type: 'object', properties: { city: { type: 'string' } } } }] } });
    else if (msg.method === 'tools/call') send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'sunny in ' + (msg.params.arguments && msg.params.arguments.city) } ] } });
    else if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, result: {} });
  }
});
function send(o) { process.stdout.write(JSON.stringify(o) + '\\n'); }
`;

describe('AI proxy agentic tool loop', () => {
  let app: FastifyInstance;
  let manager: McpManager;
  let serverId = '';

  beforeAll(async () => {
    const db = new FakeDb();
    const now = new Date().toISOString();
    const row: McpServerRow = {
      id: 'weather', name: 'weather', description: 'weather', transport: 'stdio',
      command: process.execPath, args: JSON.stringify(['-e', MOCK_MCP_SERVER]),
      status: 'stopped', auto_start: 0, session_strategy: 'sticky', call_count: 0,
      created_at: now, updated_at: now,
    };
    await db.createMcpServer(row);
    serverId = row.id;

    manager = new McpManager(db as unknown as DatabaseProvider);
    await manager.init();
    await manager.start(serverId); // real handshake + tool discovery

    app = Fastify();
    registerAiProxyRoutes(app, db as unknown as DatabaseProvider, 'secret', manager);
    await app.ready();
  });

  afterAll(async () => {
    await manager.shutdown();
    await app.close();
    vi.unstubAllGlobals();
  });

  it('exposes a running tool, dispatches it, and returns the follow-up answer', async () => {
    expect(manager.listRunningTools().map((t) => t.name)).toContain('get_weather');

    // Stub the Anthropic HTTP call: turn 1 requests the tool, turn 2 answers.
    let turn = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      turn += 1;
      const content = turn === 1
        ? [{ type: 'text', text: 'let me check' }, { type: 'tool_use', id: 'tu1', name: 'get_weather', input: { city: 'Seattle' } }]
        : [{ type: 'text', text: 'It is sunny in Seattle.' }];
      return { ok: true, status: 200, json: async () => ({ content }) } as unknown as Response;
    }));

    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat',
      payload: {
        provider: 'anthropic', apiKey: 'test-key', model: 'claude-sonnet-4', maxTokens: 1024,
        systemPrompt: 'sys', messages: [{ role: 'user', content: "What's the weather in Seattle?" }],
        enableTools: true, sessionId: 's1',
      },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.content).toBe('It is sunny in Seattle.');
    expect(data.toolCalls).toHaveLength(1);
    expect(data.toolCalls[0]).toMatchObject({ name: 'get_weather', serverId, ok: true });
    expect(turn).toBe(2); // looped exactly twice
  }, 15_000);

  it('returns plain content with no tool calls when the model does not use tools', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'Hello!' }] }),
    } as unknown as Response)));

    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat',
      payload: {
        provider: 'anthropic', apiKey: 'test-key', model: 'claude-sonnet-4', maxTokens: 1024,
        systemPrompt: 'sys', messages: [{ role: 'user', content: 'hi' }], enableTools: true,
      },
    });
    expect(res.json().content).toBe('Hello!');
    expect(res.json().toolCalls).toHaveLength(0);
  });
});
