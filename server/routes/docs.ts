import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider, DocRow } from '../db/provider.js';
import { authGuard } from '../middleware/auth.js';
import type { VectorRuntime } from '../vector/runtime.js';
import type { ContentKind } from '../vector/index.js';

export function registerDocRoutes(
  app: FastifyInstance,
  db: DatabaseProvider,
  jwtSecret: string,
  vector?: VectorRuntime,
) {
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
    enqueueIndexUpsert(vector, created);
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
    enqueueIndexUpsert(vector, updated);
    return deserializeDoc(updated);
  });

  app.delete('/api/docs/:id', { preHandler: guard }, async (request) => {
    const { id } = request.params as { id: string };
    await db.deleteDoc(id);
    vector?.enqueueDelete(id);
    return { success: true };
  });
}

// Auto-imported repo READMEs come through the same docs API but get tagged
// 'auto-imported' by src/lib/auto-import-docs. Use a distinct kind so semantic
// search can scope to "just READMEs" or "just user-authored docs".
function enqueueIndexUpsert(vector: VectorRuntime | undefined, doc: DocRow): void {
  if (!vector) return;
  const tags = safeParseJson<string[]>(doc.tags, []);
  const isReadme = tags.includes('auto-imported');
  const kind: ContentKind = isReadme ? 'doc-readme' : 'doc';

  vector.enqueueUpsert({
    id: doc.id,
    kind,
    title: doc.title,
    text: `${doc.title}\n\n${doc.content}`,
    metadata: {
      source_url: doc.source_url ?? '',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    },
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
