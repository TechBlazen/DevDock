import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, ApiRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

// API spec routes. spec_raw is opaque to the server — the client parses on
// display. Discovery happens client-side too (the browser already has the
// user's GitHub/ADO PATs in localStorage), so the server only persists
// what the client found.

export function registerApiRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/apis', { preHandler: guard }, async (request) => {
    const { repoId } = request.query as { repoId?: string };
    const rows = repoId ? await db.getApisByRepo(repoId) : await db.getApis();
    return rows.map(deserializeApi);
  });

  app.get('/api/apis/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await db.getApiById(id);
    if (!row) return reply.status(404).send({ error: 'API not found' });
    return deserializeApi(row);
  });

  app.post('/api/apis', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    if (!body.sourceUrl || !body.specRaw) {
      return reply.status(400).send({ error: 'sourceUrl and specRaw are required' });
    }

    const row: ApiRow = {
      id: nanoid(),
      name: String(body.name ?? '(untitled)'),
      description: String(body.description ?? ''),
      source_repo_id: body.sourceRepoId as string | undefined,
      source_repo_name: body.sourceRepoName as string | undefined,
      source_url: String(body.sourceUrl),
      spec_kind: String(body.specKind ?? 'openapi'),
      spec_version: body.specVersion as string | undefined,
      spec_raw: String(body.specRaw),
      base_url: body.baseUrl as string | undefined,
      added_by: caller.userId,
      created_at: now,
      updated_at: now,
    };

    const created = await db.createApi(row);
    return reply.status(201).send(deserializeApi(created));
  });

  app.put('/api/apis/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<ApiRow> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) partial.name = String(body.name);
    if (body.description !== undefined) partial.description = String(body.description);
    if (body.specKind !== undefined) partial.spec_kind = String(body.specKind);
    if (body.specVersion !== undefined) partial.spec_version = body.specVersion as string;
    if (body.specRaw !== undefined) partial.spec_raw = String(body.specRaw);
    if (body.baseUrl !== undefined) partial.base_url = body.baseUrl as string;
    if (body.sourceUrl !== undefined) partial.source_url = String(body.sourceUrl);
    if (body.sourceRepoId !== undefined) partial.source_repo_id = body.sourceRepoId as string;
    if (body.sourceRepoName !== undefined) partial.source_repo_name = body.sourceRepoName as string;

    const updated = await db.updateApi(id, partial);
    if (!updated) return reply.status(404).send({ error: 'API not found' });
    return deserializeApi(updated);
  });

  app.delete('/api/apis/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const row = await db.getApiById(id);
    if (!row) return reply.status(404).send({ error: 'API not found' });
    if (row.added_by && row.added_by !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the registrant or admins can delete' });
    }
    await db.deleteApi(id);
    return reply.status(204).send();
  });
}

function deserializeApi(row: ApiRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    sourceRepoId: row.source_repo_id,
    sourceRepoName: row.source_repo_name,
    sourceUrl: row.source_url,
    specKind: row.spec_kind,
    specVersion: row.spec_version,
    specRaw: row.spec_raw,
    baseUrl: row.base_url,
    addedBy: row.added_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
