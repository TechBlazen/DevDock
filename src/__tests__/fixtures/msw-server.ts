import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

/** Default MSW handlers — individual tests add overrides with server.use(). */
export const defaultHandlers = [
  // Proxy endpoint (first call from sendChatMessage) — simulate network error
  // so the client falls through to the direct provider endpoints.
  http.post('/api/ai/chat', () => HttpResponse.error()),

  http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello from mock Anthropic!' }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 8 },
    })
  ),

  http.post('https://api.openai.com/v1/chat/completions', () =>
    HttpResponse.json({
      choices: [
        { message: { role: 'assistant', content: 'Hello from mock OpenAI!' } },
      ],
    })
  ),

  http.post('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', () =>
    HttpResponse.json({
      choices: [
        { message: { role: 'assistant', content: 'Hello from mock Gemini!' } },
      ],
    })
  ),
];

export const server = setupServer(...defaultHandlers);
