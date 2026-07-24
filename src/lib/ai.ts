import { traceAICall } from '../otel';
import type { AIConfig, ChatMessage, AIProvider, McpToolCall } from '../types';

const MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  local: 'llama3.2',
};

/** A provider is usable if it's local (no key needed) or has a non-empty key. */
export function providerHasKey(ai: AIConfig, provider: AIProvider): boolean {
  return provider === 'local' || !!ai.apiKeys[provider]?.trim();
}

/**
 * Resolve which provider to actually send to. Honor the user's selection when
 * it's usable; otherwise fall back to the first cloud provider that has a key
 * so the user isn't blocked just because the default (anthropic) has none.
 * If nothing is configured, return the selection unchanged so the truthful
 * "No API key provided for <provider>" error still surfaces. `local` is never
 * auto-selected — it's only used when the user explicitly picks it.
 */
export function resolveActiveProvider(ai: AIConfig): AIProvider {
  if (providerHasKey(ai, ai.provider)) return ai.provider;
  const cloudOrder: AIProvider[] = ['anthropic', 'openai', 'gemini'];
  return cloudOrder.find((p) => !!ai.apiKeys[p]?.trim()) ?? ai.provider;
}

/** Effective model for a provider — always derived from the provider, since
 *  there is no per-provider custom-model UI and the persisted `model` field
 *  would otherwise pin every provider to Anthropic's default. */
export function modelForProvider(provider: AIProvider): string {
  return MODELS[provider];
}

const SYSTEM_PROMPT = `You are DevDock AI, an expert developer assistant embedded in a developer portal similar to Backstage.io.

You specialize in:
- AI/MCP servers and the Model Context Protocol
- Kubernetes (GKE), Helm, Terraform, CI/CD pipelines
- OpenTelemetry, observability, distributed tracing
- Backstage.io, developer portals, and platform engineering  
- Full-stack development: Python, TypeScript, Go, React
- GitHub Actions, Azure DevOps pipelines
- Information Security, zero-trust architecture

The user is Judge, a Staff Engineer at Costco with 20+ years of IT experience. He's building:
- Overwatch: an Agentic AI diagnostics framework for Kubernetes infra
- DevDock: this very developer portal (built with Vite/React/TypeScript)
- PhotoMind: a face-tagging app using FastAPI + Google Photos API
- MCP server integrations for Backstage

Be concise, technical, and insightful. Use markdown and code blocks liberally.
When discussing repos, mention you can help open them in VS Code or the browser.
When discussing MCP servers, offer to help configure or debug them.`;

export interface ChatResultMeta {
  /** MCP tools the model invoked while producing this reply. */
  mcpToolCalls?: McpToolCall[];
}

export interface StreamCallback {
  onToken: (token: string) => void;
  onDone: (fullText: string, traceId?: string, meta?: ChatResultMeta) => void;
  onError: (error: string) => void;
}

/** Per-send options. Tools are only available through the server proxy. */
export interface ChatOptions {
  enableTools?: boolean;
  sessionId?: string;
}

async function callAnthropic(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string
): Promise<void> {
  const tracer = traceAICall('anthropic', config.model);

  const apiMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKeys.anthropic ? { 'x-api-key': config.apiKeys.anthropic } : {}),
      },
      body: JSON.stringify({
        model: config.model || MODELS.anthropic,
        max_tokens: config.maxTokens,
        system: systemPrompt ?? SYSTEM_PROMPT,
        messages: apiMessages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const traceId = tracer.end('ok');
    callbacks.onDone(text, traceId);
  } catch (e) {
    tracer.end('error', String(e));
    callbacks.onError(String(e));
  }
}

async function callOpenAICompatible(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string,
  overrides?: { baseUrl: string; apiKey: string; model: string; providerName: string }
): Promise<void> {
  const providerName = overrides?.providerName ?? 'openai';
  const model = overrides?.model ?? MODELS.openai;
  const apiKey = overrides?.apiKey ?? config.apiKeys.openai;
  const baseUrl = overrides?.baseUrl ?? 'https://api.openai.com/v1';

  const tracer = traceAICall(providerName, model);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt ?? SYSTEM_PROMPT },
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`${providerName} HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const traceId = tracer.end('ok');
    callbacks.onDone(text, traceId);
  } catch (e) {
    tracer.end('error', String(e));
    callbacks.onError(String(e));
  }
}

async function callLocal(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string
): Promise<void> {
  const tracer = traceAICall('local', config.apiKeys.local || 'ollama');
  try {
    const endpoint = config.localEndpoint || 'http://localhost:11434/v1';
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELS.local,
        messages: [
          { role: 'system', content: systemPrompt ?? SYSTEM_PROMPT },
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!res.ok) throw new Error(`Local LLM HTTP ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const traceId = tracer.end('ok');
    callbacks.onDone(text, traceId);
  } catch (e) {
    tracer.end('error', String(e));
    callbacks.onError(
      `⚠️ Local model error: ${String(e)}\n\nMake sure Ollama is running: \`ollama serve\``
    );
  }
}

// ─── Server-side proxy (avoids CORS) ────────────────────────────────────────
async function callViaProxy(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string,
  options?: ChatOptions
): Promise<boolean> {
  // Use whichever provider is actually usable (selected one if it has a key,
  // else the first configured cloud provider), and derive the model from it.
  const provider = resolveActiveProvider(config);
  const model = modelForProvider(provider);
  const apiKey = provider === 'local'
    ? (config.localEndpoint || 'http://localhost:11434/v1')
    : config.apiKeys[provider];
  const tracer = traceAICall(provider, model);
  try {
    // /api/ai/chat is JWT-guarded (authGuard). This raw fetch bypasses the axios
    // interceptor in src/lib/api.ts, so attach the token the same way it does.
    const token = localStorage.getItem('devdock-api-token');
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        provider,
        apiKey,
        model,
        maxTokens: config.maxTokens,
        systemPrompt: systemPrompt ?? SYSTEM_PROMPT,
        messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
        enableTools: options?.enableTools ?? false,
        sessionId: options?.sessionId,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(data.error ?? `Proxy HTTP ${res.status}`);
    }

    const data = await res.json();
    const traceId = tracer.end('ok');
    const mcpToolCalls: McpToolCall[] | undefined = Array.isArray(data.toolCalls) && data.toolCalls.length ? data.toolCalls : undefined;
    callbacks.onDone(data.content ?? '', traceId, { mcpToolCalls });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // If proxy is unreachable (server not running), signal to fall back
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
      tracer.end('error', 'proxy unavailable');
      return false; // signal: try direct
    }
    tracer.end('error', msg);
    callbacks.onError(msg);
    return true; // error was handled
  }
}

export async function sendChatMessage(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string,
  options?: ChatOptions
): Promise<void> {
  // Try server-side proxy first (avoids CORS issues, and is the only path with
  // MCP tool access — the manager lives on the server).
  const handled = await callViaProxy(messages, config, callbacks, systemPrompt, options);
  if (handled) return;

  // Fallback to direct browser calls (works for local/Ollama, may fail with CORS
  // for cloud providers). No MCP tools here — the server proxy was unreachable.
  if (options?.enableTools) {
    // Tools were requested but the server is down; proceed tool-less rather than fail.
    console.warn('MCP tools unavailable — server proxy unreachable, continuing without tools');
  }
  // Resolve the same effective provider used by the proxy path, and normalize
  // the config so each helper reads the right model/key for that provider.
  const provider = resolveActiveProvider(config);
  const effConfig: AIConfig = { ...config, provider, model: modelForProvider(provider) };
  switch (provider) {
    case 'anthropic':
      return callAnthropic(messages, effConfig, callbacks, systemPrompt);
    case 'openai':
      return callOpenAICompatible(messages, effConfig, callbacks, systemPrompt);
    case 'gemini':
      return callOpenAICompatible(messages, effConfig, callbacks, systemPrompt, {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: effConfig.apiKeys.gemini,
        model: MODELS.gemini,
        providerName: 'gemini',
      });
    case 'local':
      return callLocal(messages, effConfig, callbacks, systemPrompt);
    default:
      callbacks.onError(`Unknown provider: ${provider}`);
  }
}
