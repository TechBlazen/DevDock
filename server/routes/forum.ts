import type { FastifyInstance } from 'fastify';
import type {
  DatabaseProvider, ForumThreadRow, ForumAnswerRow,
} from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';

// Forum routes. Votes are stored as a JSON array of
// { userId, value, createdAt } — the client already computes the post-toggle
// array via applyVote() before PUT, so the server just replaces what's given.
//
// deleteForumThread cascades to answers via the FK. deleteForumAnswer also
// null-outs the thread's accepted_answer_id if it was this answer.

export function registerForumRoutes(app: FastifyInstance, db: DatabaseProvider, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  // ─── Threads ──────────────────────────────────────────────────────────────
  app.get('/api/forum/threads', { preHandler: guard }, async () => {
    const threads = await db.getForumThreads();
    const answers = await db.getAllForumAnswers();
    return threads.map((t) => deserializeThread(t, answers));
  });

  app.get('/api/forum/threads/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const thread = await db.getForumThreadById(id);
    if (!thread) return reply.status(404).send({ error: 'Thread not found' });
    const answers = await db.getForumAnswersByThread(id);
    return deserializeThread(thread, answers);
  });

  app.post('/api/forum/threads', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const row: ForumThreadRow = {
      id: nanoid(),
      title: String(body.title ?? ''),
      body: String(body.body ?? ''),
      category: String(body.category ?? 'question'),
      tags: JSON.stringify(body.tags ?? []),
      author_id: String(body.authorId ?? caller.userId),
      author_name: String(body.authorName ?? caller.username),
      author_avatar_url: body.authorAvatarUrl as string | undefined,
      votes: JSON.stringify(body.votes ?? []),
      view_count: Number(body.viewCount ?? 0),
      accepted_answer_id: body.acceptedAnswerId as string | undefined,
      repo_id: body.repoId as string | undefined,
      repo_name: body.repoName as string | undefined,
      repo_source: body.repoSource as string | undefined,
      created_at: now,
      updated_at: now,
    };

    const created = await db.createForumThread(row);
    return reply.status(201).send(deserializeThread(created, []));
  });

  app.put('/api/forum/threads/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<ForumThreadRow> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) partial.title = String(body.title);
    if (body.body !== undefined) partial.body = String(body.body);
    if (body.category !== undefined) partial.category = String(body.category);
    if (body.tags !== undefined) partial.tags = JSON.stringify(body.tags);
    if (body.votes !== undefined) partial.votes = JSON.stringify(body.votes);
    if (body.viewCount !== undefined) partial.view_count = Number(body.viewCount);
    if (body.acceptedAnswerId !== undefined) partial.accepted_answer_id = body.acceptedAnswerId as string | undefined;

    const updated = await db.updateForumThread(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Thread not found' });
    const answers = await db.getForumAnswersByThread(id);
    return deserializeThread(updated, answers);
  });

  app.delete('/api/forum/threads/:id', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { id } = request.params as { id: string };
    const thread = await db.getForumThreadById(id);
    if (!thread) return reply.status(404).send({ error: 'Thread not found' });
    if (thread.author_id !== caller.userId && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Only the author or admins can delete' });
    }
    await db.deleteForumThread(id);
    return reply.status(204).send();
  });

  // ─── Answers ──────────────────────────────────────────────────────────────
  app.post('/api/forum/threads/:threadId/answers', { preHandler: guard }, async (request, reply) => {
    const caller = getRequestUser(request);
    const { threadId } = request.params as { threadId: string };
    const body = request.body as Record<string, unknown>;
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();

    const thread = await db.getForumThreadById(threadId);
    if (!thread) return reply.status(404).send({ error: 'Thread not found' });

    const row: ForumAnswerRow = {
      id: nanoid(),
      thread_id: threadId,
      parent_answer_id: body.parentAnswerId as string | undefined,
      author_id: String(body.authorId ?? caller.userId),
      author_name: String(body.authorName ?? caller.username),
      author_avatar_url: body.authorAvatarUrl as string | undefined,
      body: String(body.body ?? ''),
      votes: '[]',
      is_accepted: 0,
      created_at: now,
      updated_at: now,
    };
    const created = await db.createForumAnswer(row);

    // Touch the thread's updated_at so list-sort-by-activity stays coherent.
    await db.updateForumThread(threadId, { updated_at: now });

    return reply.status(201).send(deserializeAnswer(created));
  });

  app.put('/api/forum/answers/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const partial: Partial<ForumAnswerRow> = { updated_at: new Date().toISOString() };
    if (body.body !== undefined) partial.body = String(body.body);
    if (body.votes !== undefined) partial.votes = JSON.stringify(body.votes);
    if (body.isAccepted !== undefined) partial.is_accepted = body.isAccepted ? 1 : 0;

    const updated = await db.updateForumAnswer(id, partial);
    if (!updated) return reply.status(404).send({ error: 'Answer not found' });
    return deserializeAnswer(updated);
  });

  app.delete('/api/forum/answers/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.deleteForumAnswer(id);
    return reply.status(204).send();
  });
}

function deserializeThread(row: ForumThreadRow, answerRows: ForumAnswerRow[]) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    tags: safeParseJson(row.tags, [] as string[]),
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    votes: safeParseJson(row.votes, [] as unknown[]),
    answers: answerRows.filter((a) => a.thread_id === row.id).map(deserializeAnswer),
    viewCount: row.view_count,
    acceptedAnswerId: row.accepted_answer_id ?? null,
    repoId: row.repo_id,
    repoName: row.repo_name,
    repoSource: row.repo_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deserializeAnswer(row: ForumAnswerRow) {
  return {
    id: row.id,
    threadId: row.thread_id,
    parentAnswerId: row.parent_answer_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    body: row.body,
    votes: safeParseJson(row.votes, [] as unknown[]),
    isAccepted: Boolean(row.is_accepted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
