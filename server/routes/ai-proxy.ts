import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';

interface ChatRequest {
  provider: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: { role: string; content: string }[];
}

export function registerAiProxyRoutes(app: FastifyInstance, _db: DatabaseProvider, _jwtSecret: string) {
  app.post('/api/ai/chat', async (request, reply) => {
    const body = request.body as ChatRequest;
    const { provider, apiKey, model, maxTokens, systemPrompt, messages } = body;

    if (!apiKey && provider !== 'local') {
      return reply.status(400).send({ error: `No API key provided for ${provider}` });
    }

    try {
      let url: string;
      let headers: Record<string, string>;
      let reqBody: unknown;

      switch (provider) {
        case 'anthropic': {
          url = 'https://api.anthropic.com/v1/messages';
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          };
          reqBody = {
            model: model || 'claude-sonnet-4-20250514',
            max_tokens: maxTokens || 2048,
            system: systemPrompt,
            messages: messages.filter((m) => m.role !== 'system'),
          };
          break;
        }
        case 'openai': {
          url = 'https://api.openai.com/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          };
          reqBody = {
            model: model || 'gpt-4o',
            max_tokens: maxTokens || 2048,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          };
          break;
        }
        case 'gemini': {
          url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          };
          reqBody = {
            model: model || 'gemini-2.0-flash',
            max_tokens: maxTokens || 2048,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          };
          break;
        }
        case 'local': {
          const endpoint = body.apiKey || 'http://localhost:11434/v1';
          url = `${endpoint}/chat/completions`;
          headers = { 'Content-Type': 'application/json' };
          reqBody = {
            model: model || 'llama3.2',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          };
          break;
        }
        default:
          return reply.status(400).send({ error: `Unknown provider: ${provider}` });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = provider === 'anthropic'
          ? data?.error?.message ?? `HTTP ${res.status}`
          : data?.error?.message ?? data?.error ?? `HTTP ${res.status}`;
        return reply.status(res.status).send({ error: errMsg });
      }

      // Normalize response
      let content: string;
      if (provider === 'anthropic') {
        content = data.content?.[0]?.text ?? '';
      } else {
        content = data.choices?.[0]?.message?.content ?? '';
      }

      return { content, provider, model };
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Proxy request failed' });
    }
  });
}
