import { traceAICall } from '../otel';
import type { ChatMessage, OverwatchConfig, OverwatchToolCall } from '../types';

// ─── Overwatch AG-UI HTTP Client ──────────────────────────────────────────────
//
// The Overwatch backend exposes an AG-UI compatible endpoint (FastAPI + ADK).
// This client sends messages and parses streamed Server-Sent Events (SSE)
// to surface tool call progress (ServiceNow, Dynatrace, Splunk) and thinking
// indicators back to the DevDock chat UI.
//
// Refs:
//   gcp-overwatch-backend/overwatch_agent/server.py  — POST / (AG-UI endpoint)
//   gcp-overwatch-ui/src/app/api/copilotkit/route.ts — CopilotKit runtime proxy

const OVERWATCH_SYSTEM_PROMPT = `You are Overwatch Ask AI, an ITOps diagnostic assistant at Costco.
You have access to three enterprise tools via MCP:
- ServiceNow: Incidents, problems, changes, knowledge articles, configuration items
- Dynatrace: Application performance metrics, traces, entity health via DQL
- Splunk: Application and infrastructure logs

The user is Judge, a Staff Engineer at Costco. Be concise, technical, and actionable.
Always cite which data source(s) your answer draws from.`;

export interface OverwatchStreamCallback {
  onToken: (token: string) => void;
  onDone: (fullText: string, traceId?: string) => void;
  onError: (error: string) => void;
  onToolCallUpdate?: (toolCalls: OverwatchToolCall[]) => void;
  onThinkingChange?: (isThinking: boolean) => void;
}

// AG-UI event type constants (subset we care about parsing)
const AG_UI_EVENTS = {
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  TOOL_CALL_RESULT: 'TOOL_CALL_RESULT',
  THINKING_START: 'THINKING_START',
  THINKING_TEXT_MESSAGE_CONTENT: 'THINKING_TEXT_MESSAGE_CONTENT',
  THINKING_END: 'THINKING_END',
} as const;

/**
 * Send a chat message to the Overwatch agent via its AG-UI HTTP endpoint.
 *
 * For the initial integration we use a simplified REST approach:
 *  1. POST the message payload to the Overwatch backend
 *  2. Parse the streamed AG-UI events from the response body
 *  3. Aggregate TEXT_MESSAGE_CONTENT deltas into the final assistant reply
 *  4. Surface TOOL_CALL_* and THINKING_* events via callbacks
 *
 * Falls back to a non-streaming request if SSE parsing fails.
 */
export async function sendOverwatchMessage(
  messages: ChatMessage[],
  config: OverwatchConfig,
  callbacks: OverwatchStreamCallback,
): Promise<void> {
  const tracer = traceAICall('overwatch', 'overwatch-agent');
  const toolCalls: Map<string, OverwatchToolCall> = new Map();

  try {
    // First try the DevDock server-side proxy (avoids CORS)
    const proxyResult = await callViaProxy(messages, config, callbacks, toolCalls, tracer);
    if (proxyResult) return;

    // Fallback: direct call to Overwatch backend
    await callDirect(messages, config, callbacks, toolCalls, tracer);
  } catch (e) {
    tracer.end('error', String(e));
    callbacks.onError(
      `⚠️ **Overwatch Agent Error:** ${String(e)}\n\nMake sure the Overwatch backend is running at \`${config.endpoint}\``
    );
  }
}

// ─── Proxy route through DevDock server ──────────────────────────────────────
async function callViaProxy(
  messages: ChatMessage[],
  config: OverwatchConfig,
  callbacks: OverwatchStreamCallback,
  toolCalls: Map<string, OverwatchToolCall>,
  tracer: ReturnType<typeof traceAICall>,
): Promise<boolean> {
  try {
    const res = await fetch('/api/overwatch/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        messages: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
        systemPrompt: OVERWATCH_SYSTEM_PROMPT,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(data.error ?? `Proxy HTTP ${res.status}`);
    }

    // If streaming, parse SSE; otherwise handle JSON
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
      await parseSSEStream(res.body!, callbacks, toolCalls);
    } else {
      const data = await res.json();
      callbacks.onDone(data.content ?? data.message ?? '', undefined);
    }

    tracer.end('ok');
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
      tracer.end('error', 'proxy unavailable');
      return false; // fallback to direct
    }
    tracer.end('error', msg);
    callbacks.onError(msg);
    return true;
  }
}

// ─── Direct call to Overwatch backend ────────────────────────────────────────
async function callDirect(
  messages: ChatMessage[],
  config: OverwatchConfig,
  callbacks: OverwatchStreamCallback,
  toolCalls: Map<string, OverwatchToolCall>,
  tracer: ReturnType<typeof traceAICall>,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // AG-UI RunAgentInput format
  const payload = {
    thread_id: `devdock-${Date.now()}`,
    run_id: `run-${Date.now()}`,
    messages: messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    context: [
      {
        description: 'user_email',
        value: JSON.stringify({ userEmail: 'judge@costco.com', userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      },
    ],
  };

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Overwatch HTTP ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') || contentType.includes('text/plain') || res.body) {
    await parseSSEStream(res.body!, callbacks, toolCalls);
  } else {
    const data = await res.json();
    callbacks.onDone(data.content ?? '', undefined);
  }

  tracer.end('ok');
}

// ─── SSE Stream Parser ───────────────────────────────────────────────────────
async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  callbacks: OverwatchStreamCallback,
  toolCalls: Map<string, OverwatchToolCall>,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (double newline delimited)
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        // Parse SSE format: "event: TYPE\ndata: {...}"
        let eventType = '';
        let eventData = '';

        for (const line of event.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim();
          }
        }

        if (!eventData) continue;

        try {
          const data = JSON.parse(eventData);
          const type = eventType || data.type;

          switch (type) {
            case AG_UI_EVENTS.TEXT_MESSAGE_CONTENT: {
              const delta = data.delta || data.content || '';
              fullText += delta;
              callbacks.onToken(delta);
              break;
            }

            case AG_UI_EVENTS.TEXT_MESSAGE_END:
            case AG_UI_EVENTS.RUN_FINISHED: {
              if (fullText) {
                callbacks.onDone(fullText);
              }
              callbacks.onThinkingChange?.(false);
              callbacks.onToolCallUpdate?.([]);
              break;
            }

            case AG_UI_EVENTS.TOOL_CALL_START: {
              const tc: OverwatchToolCall = {
                toolCallId: data.toolCallId || data.tool_call_id || '',
                toolCallName: data.toolCallName || data.tool_call_name || 'unknown',
                status: 'started',
              };
              toolCalls.set(tc.toolCallId, tc);
              callbacks.onToolCallUpdate?.([...toolCalls.values()]);
              break;
            }

            case AG_UI_EVENTS.TOOL_CALL_ARGS:
            case AG_UI_EVENTS.TOOL_CALL_END: {
              const id = data.toolCallId || data.tool_call_id || '';
              const existing = toolCalls.get(id);
              if (existing) {
                existing.status = 'loading';
                callbacks.onToolCallUpdate?.([...toolCalls.values()]);
              }
              break;
            }

            case AG_UI_EVENTS.TOOL_CALL_RESULT: {
              const resultId = data.toolCallId || data.tool_call_id || '';
              const existingResult = toolCalls.get(resultId);
              if (existingResult) {
                existingResult.status = 'complete';
                callbacks.onToolCallUpdate?.([...toolCalls.values()]);
              }
              break;
            }

            case AG_UI_EVENTS.THINKING_START:
              callbacks.onThinkingChange?.(true);
              break;

            case AG_UI_EVENTS.THINKING_END:
              callbacks.onThinkingChange?.(false);
              break;

            case AG_UI_EVENTS.RUN_ERROR: {
              const errMsg = data.message || data.error || 'Unknown agent error';
              callbacks.onError(`Agent error: ${errMsg}`);
              break;
            }
          }
        } catch {
          // Non-JSON line or parse error — skip
        }
      }
    }

    // If we accumulated text but never got a TEXT_MESSAGE_END, flush it
    if (fullText) {
      callbacks.onDone(fullText);
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Health Check ────────────────────────────────────────────────────────────
export async function checkOverwatchHealth(
  config: OverwatchConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // The Overwatch backend exposes GET /healthz
    const baseUrl = config.endpoint.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/healthz`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const data = await res.json();
    return { ok: data.status === 'ok' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
