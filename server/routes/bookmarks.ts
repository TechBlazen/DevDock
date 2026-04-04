import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, BookmarkRow, CollectionRow } from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

export function registerBookmarkRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  // ─── Bookmarks ──────────────────────────────────────────────────────────
  app.get('/api/bookmarks', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const rows = await db.getBookmarks(caller.userId);
    return rows.map(deserializeBookmark);
  });

  app.post('/api/bookmarks', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const row: BookmarkRow = {
      id: nanoid(),
      user_id: caller.userId,
      title: String(body.title),
      url: String(body.url),
      description: body.description as string,
      favicon: body.favicon as string,
      screenshot: body.screenshot as string,
      collection_id: body.collectionId as string,
      tags: JSON.stringify(body.tags ?? []),
      favorite: body.favorite ? 1 : 0,
      note: body.note as string,
      content_type: String(body.contentType ?? 'link'),
      created_at: now,
      updated_at: now,
    };

    const created = await db.createBookmark(row);
    return deserializeBookmark(created);
  });

  app.put('/api/bookmarks/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<BookmarkRow> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) partial.title = String(body.title);
    if (body.url !== undefined) partial.url = String(body.url);
    if (body.description !== undefined) partial.description = body.description as string;
    if (body.collectionId !== undefined) partial.collection_id = body.collectionId as string;
    if (body.tags !== undefined) partial.tags = JSON.stringify(body.tags);
    if (body.favorite !== undefined) partial.favorite = body.favorite ? 1 : 0;
    if (body.note !== undefined) partial.note = body.note as string;

    const updated = await db.updateBookmark(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Bookmark not found' });
    return deserializeBookmark(updated);
  });

  app.delete('/api/bookmarks/:id', { preHandler: guard }, async (request) => {
    const { id } = request.params as { id: string };
    await db.deleteBookmark(id);
    return { success: true };
  });

  // ─── Collections ────────────────────────────────────────────────────────
  app.get('/api/collections', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    return db.getCollections(caller.userId);
  });

  app.post('/api/collections', { preHandler: guard }, async (request) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const row: CollectionRow = {
      id: nanoid(),
      user_id: caller.userId,
      name: String(body.name),
      icon: body.icon as string,
      color: body.color as string,
      parent_id: body.parentId as string,
      created_at: now,
      updated_at: now,
    };

    return db.createCollection(row);
  });

  app.put('/api/collections/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<CollectionRow>;
    body.updated_at = new Date().toISOString();
    const updated = await db.updateCollection(id, body);
    if (!updated) return reply.status(404).send({ error: 'Collection not found' });
    return updated;
  });

  app.delete('/api/collections/:id', { preHandler: guard }, async (request) => {
    const { id } = request.params as { id: string };
    await db.deleteCollection(id);
    return { success: true };
  });
}

function deserializeBookmark(row: BookmarkRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    url: row.url,
    description: row.description,
    favicon: row.favicon,
    screenshot: row.screenshot,
    collectionId: row.collection_id,
    tags: safeParseJson(row.tags, []),
    favorite: Boolean(row.favorite),
    note: row.note,
    contentType: row.content_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
