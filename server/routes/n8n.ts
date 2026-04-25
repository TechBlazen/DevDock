import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authGuard } from '../middleware/auth.js';

// n8n integration routes. Each request from the browser carries the user's
// own n8n base URL + API key in the X-N8n-Base-Url / X-N8n-Api-Key headers
// so the server stays stateless about per-user n8n connections (matches the
// way AI provider keys are handled on the client). The server is just a CORS
// shim + auth check + minor reshaping.
//
// n8n's public REST API exposes:
//   GET  /api/v1/workflows
//   GET  /api/v1/workflows/:id
//   POST /api/v1/workflows/:id/activate
//   POST /api/v1/workflows/:id/deactivate
//   GET  /api/v1/executions
//   GET  /api/v1/executions/:id
// Triggering arbitrary workflows is NOT in the public API — flows that need
// on-demand runs must include a Webhook node, and we POST to that URL via
// the /webhook-trigger helper below.

interface N8nCreds { baseUrl: string; apiKey: string }

function readCreds(request: FastifyRequest): N8nCreds | { error: string } {
  const baseUrl = (request.headers['x-n8n-base-url'] as string | undefined)?.trim();
  const apiKey = (request.headers['x-n8n-api-key'] as string | undefined)?.trim();
  if (!baseUrl || !apiKey) return { error: 'Missing n8n credentials. Configure them in Settings.' };
  try { new URL(baseUrl); } catch { return { error: 'Invalid n8n base URL' }; }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

async function n8nFetch(creds: N8nCreds, path: string, init?: RequestInit) {
  const res = await fetch(`${creds.baseUrl}${path}`, {
    ...init,
    headers: {
      'X-N8N-API-KEY': creds.apiKey,
      'Accept': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

export function registerN8nRoutes(app: FastifyInstance, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  // Probe the configured instance. Cheap call to /workflows with limit=1 to
  // both verify the URL and that the API key has read access. n8n's
  // /api/v1/health is unauthenticated and not always exposed.
  app.get('/api/n8n/health', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const res = await n8nFetch(creds, '/api/v1/workflows?limit=1');
    if (!res.ok) return reply.status(res.status).send({ ok: false, error: extractError(res.body) });
    return { ok: true };
  });

  app.get('/api/n8n/workflows', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const qs = (request.raw.url ?? '').split('?')[1] ?? '';
    const res = await n8nFetch(creds, `/api/v1/workflows${qs ? `?${qs}` : ''}`);
    if (!res.ok) return reply.status(res.status).send({ error: extractError(res.body) });
    return res.body;
  });

  app.get('/api/n8n/workflows/:id', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const { id } = request.params as { id: string };
    const res = await n8nFetch(creds, `/api/v1/workflows/${encodeURIComponent(id)}`);
    if (!res.ok) return reply.status(res.status).send({ error: extractError(res.body) });
    return res.body;
  });

  app.post('/api/n8n/workflows/:id/activate', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const { id } = request.params as { id: string };
    const res = await n8nFetch(creds, `/api/v1/workflows/${encodeURIComponent(id)}/activate`, { method: 'POST' });
    if (!res.ok) return reply.status(res.status).send({ error: extractError(res.body) });
    return res.body;
  });

  app.post('/api/n8n/workflows/:id/deactivate', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const { id } = request.params as { id: string };
    const res = await n8nFetch(creds, `/api/v1/workflows/${encodeURIComponent(id)}/deactivate`, { method: 'POST' });
    if (!res.ok) return reply.status(res.status).send({ error: extractError(res.body) });
    return res.body;
  });

  app.get('/api/n8n/executions', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const qs = (request.raw.url ?? '').split('?')[1] ?? '';
    const res = await n8nFetch(creds, `/api/v1/executions${qs ? `?${qs}` : ''}`);
    if (!res.ok) return reply.status(res.status).send({ error: extractError(res.body) });
    return res.body;
  });

  app.get('/api/n8n/executions/:id', { preHandler: guard }, async (request, reply) => {
    const creds = readCreds(request);
    if ('error' in creds) return reply.status(400).send({ error: creds.error });
    const { id } = request.params as { id: string };
    const res = await n8nFetch(creds, `/api/v1/executions/${encodeURIComponent(id)}?includeData=true`);
    if (!res.ok) return reply.status(res.status).send({ error: extractError(res.body) });
    return res.body;
  });

  // Trigger a workflow that has a Webhook node by POSTing to its URL. The
  // client supplies the absolute webhook URL (n8n exposes it per node); we
  // forward the JSON payload and return whatever n8n's webhook handler does.
  // Loopback hosts are blocked the same way as the API tester proxy.
  app.post('/api/n8n/webhook-trigger', { preHandler: guard }, async (request, reply) => {
    const body = request.body as { url?: string; payload?: unknown };
    if (!body?.url) return reply.status(400).send({ error: 'url is required' });

    let target: URL;
    try { target = new URL(body.url); }
    catch { return reply.status(400).send({ error: 'Invalid webhook url' }); }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return reply.status(400).send({ error: 'Only http/https URLs are allowed' });
    }
    const host = target.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
      return reply.status(400).send({ error: 'Loopback addresses are not allowed' });
    }

    const startedAt = Date.now();
    try {
      const res = await fetch(target.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload ?? {}),
      });
      const text = await res.text();
      return { status: res.status, statusText: res.statusText, body: text, durationMs: Date.now() - startedAt };
    } catch (e) {
      return reply.status(502).send({ error: e instanceof Error ? e.message : 'Webhook request failed' });
    }
  });
}

function extractError(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) return String((body as { message: unknown }).message);
  if (typeof body === 'string') return body || 'Upstream error';
  return 'Upstream error';
}
