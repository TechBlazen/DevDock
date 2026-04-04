import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { DatabaseProvider, FederatedSourceRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';
import { fetchFederatedResults } from '../lib/federated-fetcher.js';

export function registerFederatedSourceRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  // ── List all sources (any user; non-admins get auth stripped) ────────────
  app.get('/api/federated-sources', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const sources = await db.getFederatedSources();
    if (caller.role !== 'admin') {
      return sources.map(({ auth_config: _, ...rest }) => ({ ...rest, auth_config: '{}' }));
    }
    return sources;
  });

  // ── Get single source (admin only) ──────────────────────────────────────
  app.get('/api/federated-sources/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
    const { id } = request.params as { id: string };
    const source = await db.getFederatedSourceById(id);
    if (!source) return reply.status(404).send({ error: 'Not found' });
    return source;
  });

  // ── Create source (admin only) ──────────────────────────────────────────
  app.post('/api/federated-sources', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });

    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const source: FederatedSourceRow = {
      id: nanoid(),
      name: String(body.name ?? ''),
      type: String(body.type ?? 'rest-api'),
      endpoint_url: String(body.endpoint_url ?? ''),
      auth_type: String(body.auth_type ?? 'none'),
      auth_config: typeof body.auth_config === 'string' ? body.auth_config : JSON.stringify(body.auth_config ?? {}),
      result_mapping: typeof body.result_mapping === 'string' ? body.result_mapping : JSON.stringify(body.result_mapping ?? {}),
      trigger_config: typeof body.trigger_config === 'string' ? body.trigger_config : JSON.stringify(body.trigger_config ?? {}),
      sync_interval_minutes: Number(body.sync_interval_minutes ?? 0),
      document_count: 0,
      enabled: 1,
      created_by: caller.userId,
      created_at: now,
      updated_at: now,
    };

    const created = await db.createFederatedSource(source);
    return reply.status(201).send(created);
  });

  // ── Update source (admin only) ──────────────────────────────────────────
  app.put('/api/federated-sources/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<FederatedSourceRow> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) partial.name = String(body.name);
    if (body.type !== undefined) partial.type = String(body.type);
    if (body.endpoint_url !== undefined) partial.endpoint_url = String(body.endpoint_url);
    if (body.auth_type !== undefined) partial.auth_type = String(body.auth_type);
    if (body.auth_config !== undefined) partial.auth_config = typeof body.auth_config === 'string' ? body.auth_config : JSON.stringify(body.auth_config);
    if (body.result_mapping !== undefined) partial.result_mapping = typeof body.result_mapping === 'string' ? body.result_mapping : JSON.stringify(body.result_mapping);
    if (body.trigger_config !== undefined) partial.trigger_config = typeof body.trigger_config === 'string' ? body.trigger_config : JSON.stringify(body.trigger_config);
    if (body.sync_interval_minutes !== undefined) partial.sync_interval_minutes = Number(body.sync_interval_minutes);
    if (body.enabled !== undefined) partial.enabled = body.enabled ? 1 : 0;

    const updated = await db.updateFederatedSource(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Not found' });
    return updated;
  });

  // ── Delete source (admin only) ──────────────────────────────────────────
  app.delete('/api/federated-sources/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
    const { id } = request.params as { id: string };
    await db.deleteFederatedSource(id);
    return reply.status(204).send();
  });

  // ── Sync source (admin only — fetch + store documents) ──────────────────
  app.post('/api/federated-sources/:id/sync', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    if (caller.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
    const { id } = request.params as { id: string };

    const source = await db.getFederatedSourceById(id);
    if (!source) return reply.status(404).send({ error: 'Not found' });

    const docs = await fetchFederatedResults(source);
    await db.replaceFederatedDocuments(id, docs);
    await db.updateFederatedSource(id, {
      last_synced_at: new Date().toISOString(),
      document_count: docs.length,
      updated_at: new Date().toISOString(),
    });

    return { synced: true, documentCount: docs.length };
  });

  // ── Get documents for a source ──────────────────────────────────────────
  app.get('/api/federated-sources/:id/documents', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const docs = await db.getFederatedDocuments(id);
    return docs;
  });

  // ── Get ALL federated documents (for client-side MiniSearch indexing) ────
  app.get('/api/federated-documents', { preHandler: guard }, async () => {
    return db.getAllFederatedDocuments();
  });
}
