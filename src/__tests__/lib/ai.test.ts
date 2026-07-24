import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../fixtures/msw-server';
import { sendChatMessage, resolveActiveProvider, providerHasKey } from '../../lib/ai';
import type { AIConfig, ChatMessage } from '../../types';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const baseConfig: AIConfig = {
  provider: 'anthropic',
  apiKeys: { anthropic: 'sk-test', openai: 'sk-oai', gemini: 'g-key', local: '' },
  localEndpoint: 'http://localhost:11434/v1',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024,
};

const userMessage: ChatMessage = {
  id: '1',
  role: 'user',
  content: 'Hi',
  timestamp: new Date(),
};

function makeCallbacks() {
  return {
    onToken: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  };
}

describe('ai / sendChatMessage — Anthropic', () => {
  it('calls onDone with the mocked Anthropic response text', async () => {
    const cb = makeCallbacks();
    await sendChatMessage([userMessage], baseConfig, cb);
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onDone).toHaveBeenCalledTimes(1);
    expect(cb.onDone.mock.calls[0][0]).toBe('Hello from mock Anthropic!');
  });

  it('calls onError on 401 from Anthropic', async () => {
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () =>
        HttpResponse.json({ error: { message: 'invalid api key' } }, { status: 401 })
      )
    );
    const cb = makeCallbacks();
    await sendChatMessage([userMessage], baseConfig, cb);
    expect(cb.onError).toHaveBeenCalledTimes(1);
    expect(cb.onError.mock.calls[0][0]).toContain('invalid api key');
  });

  it('includes x-api-key header in the request', async () => {
    let capturedHeader: string | null = null;
    server.use(
      http.post('https://api.anthropic.com/v1/messages', ({ request }) => {
        capturedHeader = request.headers.get('x-api-key');
        return HttpResponse.json({
          content: [{ type: 'text', text: 'ok' }],
        });
      })
    );
    const cb = makeCallbacks();
    await sendChatMessage([userMessage], baseConfig, cb);
    expect(capturedHeader).toBe('sk-test');
  });

  it('filters system messages from the API payload', async () => {
    let capturedBody: { messages: { role: string }[] } | null = null;
    server.use(
      http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
        capturedBody = (await request.json()) as { messages: { role: string }[] };
        return HttpResponse.json({ content: [{ type: 'text', text: 'ok' }] });
      })
    );
    const messages: ChatMessage[] = [
      { id: 'sys', role: 'system', content: 'system prompt', timestamp: new Date() },
      userMessage,
    ];
    const cb = makeCallbacks();
    await sendChatMessage(messages, baseConfig, cb);
    expect(capturedBody).toBeTruthy();
    expect(capturedBody!.messages.every((m) => m.role !== 'system')).toBe(true);
  });
});

describe('ai / sendChatMessage — OpenAI', () => {
  it('routes to OpenAI and returns the mocked text', async () => {
    const cb = makeCallbacks();
    await sendChatMessage([userMessage], { ...baseConfig, provider: 'openai' }, cb);
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onDone).toHaveBeenCalledWith('Hello from mock OpenAI!', expect.any(String));
  });

  it('passes Bearer token in Authorization header', async () => {
    let header: string | null = null;
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', ({ request }) => {
        header = request.headers.get('Authorization');
        return HttpResponse.json({
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        });
      })
    );
    const cb = makeCallbacks();
    await sendChatMessage([userMessage], { ...baseConfig, provider: 'openai' }, cb);
    expect(header).toBe('Bearer sk-oai');
  });
});

describe('ai / sendChatMessage — Gemini', () => {
  it('routes to the Gemini OpenAI-compatible endpoint', async () => {
    const cb = makeCallbacks();
    await sendChatMessage([userMessage], { ...baseConfig, provider: 'gemini' }, cb);
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onDone).toHaveBeenCalledWith('Hello from mock Gemini!', expect.any(String));
  });
});

describe('ai / resolveActiveProvider', () => {
  const cfg = (over: Partial<AIConfig>): AIConfig => ({ ...baseConfig, ...over });

  it('keeps the selected provider when it has a key', () => {
    expect(resolveActiveProvider(cfg({ provider: 'openai' }))).toBe('openai');
  });

  it('falls back to the configured provider when the selected one has no key', () => {
    // Selected anthropic but only openai has a key → use openai.
    const c = cfg({ provider: 'anthropic', apiKeys: { anthropic: '', openai: 'sk-oai', gemini: '', local: '' } });
    expect(resolveActiveProvider(c)).toBe('openai');
  });

  it('honors an explicit local selection (no key required)', () => {
    const c = cfg({ provider: 'local', apiKeys: { anthropic: '', openai: '', gemini: '', local: '' } });
    expect(resolveActiveProvider(c)).toBe('local');
  });

  it('never auto-selects local — returns the selection when no cloud key exists', () => {
    const c = cfg({ provider: 'anthropic', apiKeys: { anthropic: '', openai: '', gemini: '', local: '' } });
    expect(resolveActiveProvider(c)).toBe('anthropic');
  });

  it('treats whitespace-only keys as missing', () => {
    const c = cfg({ provider: 'anthropic', apiKeys: { anthropic: '   ', openai: 'sk-oai', gemini: '', local: '' } });
    expect(resolveActiveProvider(c)).toBe('openai');
    expect(providerHasKey(c, 'anthropic')).toBe(false);
  });

  it('routes the chat to the keyed provider when the default has no key (the reported bug)', async () => {
    // Anthropic selected/default, but only OpenAI is configured — should NOT error.
    const cb = makeCallbacks();
    const c = cfg({ provider: 'anthropic', apiKeys: { anthropic: '', openai: 'sk-oai', gemini: '', local: '' } });
    await sendChatMessage([userMessage], c, cb);
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });
});
