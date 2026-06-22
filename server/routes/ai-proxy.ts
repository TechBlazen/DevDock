import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import type { McpManager } from '../services/mcp-manager.js';

interface ChatRequest {
  provider: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: { role: string; content: string }[];
  /** When true, expose running MCP tools to the model and run the tool loop. */
  enableTools?: boolean;
  /** Stable per-conversation id for sticky tool routing across turns. */
  sessionId?: string;
}

// A record of one tool the model invoked during a turn — surfaced to the UI.
interface ToolCallLog {
  name: string;
  serverId: string;
  ok: boolean;
  error?: string;
}

// Cap the agentic loop so a misbehaving model can't spin forever.
const MAX_TOOL_ITERATIONS = 6;

export function registerAiProxyRoutes(app: FastifyInstance, _db: DatabaseProvider, _jwtSecret: string, manager?: McpManager) {
  app.post('/api/ai/chat', async (request, reply) => {
    const body = request.body as ChatRequest;
    const { provider, apiKey, model, enableTools, sessionId } = body;

    if (!apiKey && provider !== 'local') {
      return reply.status(400).send({ error: `No API key provided for ${provider}` });
    }

    // Build the tool catalogue from currently-running MCP servers. Same-named
    // tools from different servers are deduped here; the router resolves the
    // owning server at call time.
    const running = enableTools && manager ? dedupeByName(manager.listRunningTools()) : [];
    const toolCalls: ToolCallLog[] = [];

    // Dispatch a tool call through the Tool Gateway Router and log the outcome.
    const dispatch = async (name: string, args: unknown): Promise<{ result?: unknown; error?: string }> => {
      if (!manager) return { error: 'tools unavailable' };
      try {
        const { serverId, result } = await manager.routeToolCall(name, args, sessionId);
        toolCalls.push({ name, serverId, ok: true });
        return { result };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        toolCalls.push({ name, serverId: '', ok: false, error });
        return { error };
      }
    };

    try {
      const content = provider === 'anthropic'
        ? await runAnthropic(body, running, dispatch)
        : await runOpenAICompatible(body, running, dispatch);
      return { content, provider, model, toolCalls };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Proxy request failed';
      return reply.status(500).send({ error: msg });
    }
  });
}

// ─── Anthropic (Messages API, native tool_use blocks) ───────────────────────

interface AnthropicBlock { type: string; text?: string; id?: string; name?: string; input?: unknown }

async function runAnthropic(
  body: ChatRequest,
  tools: ReturnType<McpManager['listRunningTools']>,
  dispatch: (name: string, args: unknown) => Promise<{ result?: unknown; error?: string }>,
): Promise<string> {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': body.apiKey,
    'anthropic-version': '2023-06-01',
  };
  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: isObjectSchema(t.inputSchema) ? t.inputSchema : { type: 'object', properties: {} },
  }));
  // Anthropic messages: content is a string or an array of blocks.
  const messages: Array<{ role: string; content: unknown }> = body.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const data = await postJson('https://api.anthropic.com/v1/messages', headers, {
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: body.maxTokens || 2048,
      system: body.systemPrompt,
      messages,
      ...(toolDefs.length ? { tools: toolDefs } : {}),
    });

    const blocks: AnthropicBlock[] = Array.isArray(data.content) ? data.content : [];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
    const toolUses = blocks.filter((b) => b.type === 'tool_use');
    if (toolUses.length === 0) return text;

    // Echo the assistant's tool_use turn, then answer each with a tool_result.
    messages.push({ role: 'assistant', content: blocks });
    const results = [];
    for (const tu of toolUses) {
      const { result, error } = await dispatch(tu.name!, tu.input ?? {});
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: error ? `Error: ${error}` : toText(result),
        ...(error ? { is_error: true } : {}),
      });
    }
    messages.push({ role: 'user', content: results });
  }
  return 'Tool loop exceeded the maximum number of iterations.';
}

// ─── OpenAI-compatible (OpenAI, Gemini, local — function tool_calls) ─────────

interface OpenAIToolCall { id: string; function: { name: string; arguments: string } }
interface OpenAIMessage { role: string; content: string | null; tool_calls?: OpenAIToolCall[] }

async function runOpenAICompatible(
  body: ChatRequest,
  tools: ReturnType<McpManager['listRunningTools']>,
  dispatch: (name: string, args: unknown) => Promise<{ result?: unknown; error?: string }>,
): Promise<string> {
  const { url, headers, model } = openAiTarget(body);
  const toolDefs = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: isObjectSchema(t.inputSchema) ? t.inputSchema : { type: 'object', properties: {} },
    },
  }));
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: body.systemPrompt },
    ...body.messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const data = await postJson(url, headers, {
      model,
      max_tokens: body.maxTokens || 2048,
      messages,
      ...(toolDefs.length ? { tools: toolDefs, tool_choice: 'auto' } : {}),
    });

    const msg: OpenAIMessage | undefined = data.choices?.[0]?.message;
    const calls = msg?.tool_calls ?? [];
    if (!msg || calls.length === 0) return msg?.content ?? '';

    // The assistant tool-call turn must be echoed verbatim before tool replies.
    messages.push(msg as unknown as Record<string, unknown>);
    for (const call of calls) {
      let args: unknown = {};
      try { args = call.function.arguments ? JSON.parse(call.function.arguments) : {}; } catch { /* leave {} */ }
      const { result, error } = await dispatch(call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: error ? `Error: ${error}` : toText(result) });
    }
  }
  return 'Tool loop exceeded the maximum number of iterations.';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function openAiTarget(body: ChatRequest): { url: string; headers: Record<string, string>; model: string } {
  switch (body.provider) {
    case 'openai':
      return { url: 'https://api.openai.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.apiKey}` }, model: body.model || 'gpt-4o' };
    case 'gemini':
      return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.apiKey}` }, model: body.model || 'gemini-2.0-flash' };
    case 'local': {
      const endpoint = body.apiKey || 'http://localhost:11434/v1';
      return { url: `${endpoint}/chat/completions`, headers: { 'Content-Type': 'application/json' }, model: body.model || 'llama3.2' };
    }
    default:
      throw new Error(`Unknown provider: ${body.provider}`);
  }
}

async function postJson(url: string, headers: Record<string, string>, payload: unknown): Promise<{ content?: unknown; choices?: Array<{ message?: OpenAIMessage }>; error?: { message?: string } }> {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = (data as { error?: { message?: string } | string })?.error;
    throw new Error((typeof errMsg === 'object' ? errMsg?.message : errMsg) ?? `HTTP ${res.status}`);
  }
  return data as { content?: unknown; choices?: Array<{ message?: OpenAIMessage }> };
}

// MCP tool results are { content: [{type:'text', text}], ... }; flatten text
// blocks for the model, else stringify the raw payload.
function toText(result: unknown): string {
  if (result && typeof result === 'object' && Array.isArray((result as { content?: unknown }).content)) {
    const parts = (result as { content: Array<{ type?: string; text?: string }> }).content
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text as string);
    if (parts.length) return parts.join('\n');
  }
  try { return JSON.stringify(result); } catch { return String(result); }
}

function isObjectSchema(schema: unknown): schema is Record<string, unknown> {
  return !!schema && typeof schema === 'object' && !Array.isArray(schema);
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((t) => (seen.has(t.name) ? false : (seen.add(t.name), true)));
}
