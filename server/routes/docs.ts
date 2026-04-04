import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, DocRow } from '../db/provider.js';
import { authGuard } from '../middleware/auth.js';

export function registerDocRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  app.get('/api/docs', { preHandler: guard }, async () => {
    const docs = await db.getDocs();
    return docs.map(deserializeDoc);
  });

  app.post('/api/docs', { preHandler: guard }, async (request) => {
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const row: DocRow = {
      id: nanoid(),
      title: String(body.title),
      content: String(body.content ?? ''),
      source_url: body.sourceUrl as string,
      tags: JSON.stringify(body.tags ?? []),
      created_at: now,
      updated_at: now,
    };

    const created = await db.createDoc(row);
    return deserializeDoc(created);
  });

  app.put('/api/docs/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<DocRow> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) partial.title = String(body.title);
    if (body.content !== undefined) partial.content = String(body.content);
    if (body.sourceUrl !== undefined) partial.source_url = body.sourceUrl as string;
    if (body.tags !== undefined) partial.tags = JSON.stringify(body.tags);

    const updated = await db.updateDoc(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Doc not found' });
    return deserializeDoc(updated);
  });

  app.delete('/api/docs/:id', { preHandler: guard }, async (request) => {
    const { id } = request.params as { id: string };
    await db.deleteDoc(id);
    return { success: true };
  });
}

function deserializeDoc(row: DocRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    sourceUrl: row.source_url,
    tags: safeParseJson(row.tags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
