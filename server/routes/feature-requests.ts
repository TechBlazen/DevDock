import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, FeatureRequestRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

// Feature requests are global (one shared list). Anyone can create; only the
// author or an admin can delete. Status transitions are admin-only.

export function registerFeatureRequestRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/feature-requests', { preHandler: guard }, async () => {
    const rows = await db.getFeatureRequests();
    return rows.map(deserializeFeatureRequest);
  });

  app.post('/api/feature-requests', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const row: FeatureRequestRow = {
      id: nanoid(),
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      author_id: String(body.authorId ?? caller.userId),
      author_name: String(body.authorName ?? caller.username),
      author_avatar_url: body.authorAvatarUrl as string | undefined,
      status: String(body.status ?? 'open'),
      votes: JSON.stringify(body.votes ?? []),
      attachments: JSON.stringify(body.attachments ?? []),
      tags: JSON.stringify(body.tags ?? []),
      created_at: now,
      updated_at: now,
    };

    const created = await db.createFeatureRequest(row);
    return reply.status(201).send(deserializeFeatureRequest(created));
  });

  app.put('/api/feature-requests/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<FeatureRequestRow> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) partial.title = String(body.title);
    if (body.description !== undefined) partial.description = String(body.description);
    if (body.votes !== undefined) partial.votes = JSON.stringify(body.votes);
    if (body.attachments !== undefined) partial.attachments = JSON.stringify(body.attachments);
    if (body.tags !== undefined) partial.tags = JSON.stringify(body.tags);
    if (body.status !== undefined) {
      // Status transitions are admin-only to keep the roadmap trustworthy.
      if (caller.role !== 'admin') {
        return reply.status(403).send({ error: 'Only admins can change feature request status' });
      }
      partial.status = String(body.status);
    }

    const updated = await db.updateFeatureRequest(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Feature request not found' });
    return deserializeFeatureRequest(updated);
  });

  app.delete('/api/feature-requests/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const req = await db.getFeatureRequestById(id);
    if (!req) return reply.status(404).send({ error: 'Not found' });
    if (req.author_id !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the author or admins can delete' });
    }
    await db.deleteFeatureRequest(id);
    return reply.status(204).send();
  });
}

function deserializeFeatureRequest(row: FeatureRequestRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    status: row.status,
    votes: safeParseJson(row.votes, [] as unknown[]),
    attachments: safeParseJson(row.attachments, [] as unknown[]),
    tags: safeParseJson(row.tags, [] as string[]),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
