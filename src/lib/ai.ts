import { traceAICall } from '../otel';
import type { AIConfig, ChatMessage, AIProvider } from '../types';

const MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  local: 'llama3.2',
};

const SYSTEM_PROMPT = `You are Forge AI, an expert developer assistant embedded in a developer portal similar to Backstage.io.

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
- Forge Portal: this very developer portal (built with Vite/React/TypeScript)
- PhotoMind: a face-tagging app using FastAPI + Google Photos API
- MCP server integrations for Backstage

Be concise, technical, and insightful. Use markdown and code blocks liberally.
When discussing repos, mention you can help open them in VS Code or the browser.
When discussing MCP servers, offer to help configure or debug them.`;

export interface StreamCallback {
  onToken: (token: string) => void;
  onDone: (fullText: string, traceId?: string) => void;
  onError: (error: string) => void;
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

async function callOpenAI(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string
): Promise<void> {
  const tracer = traceAICall('openai', MODELS.openai);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: MODELS.openai,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt ?? SYSTEM_PROMPT },
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
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

export async function sendChatMessage(
  messages: ChatMessage[],
  config: AIConfig,
  callbacks: StreamCallback,
  systemPrompt?: string
): Promise<void> {
  switch (config.provider) {
    case 'anthropic':
      return callAnthropic(messages, config, callbacks, systemPrompt);
    case 'openai':
      return callOpenAI(messages, config, callbacks, systemPrompt);
    case 'gemini':
      // Gemini uses OpenAI-compatible API
      return callOpenAI(
        messages,
        { ...config, apiKeys: { ...config.apiKeys, openai: config.apiKeys.gemini } },
        callbacks,
        systemPrompt
      );
    case 'local':
      return callLocal(messages, config, callbacks, systemPrompt);
    default:
      callbacks.onError(`Unknown provider: ${config.provider}`);
  }
}
