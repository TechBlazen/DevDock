import type { FastifyInstance } from 'fastify';
import type {
  DatabaseProvider, ForumThreadRow, ForumAnswerRow,
} from '../db/provider.js';
import { authGuard, getRequestUser } from '../middleware/auth.js';
import type { VectorRuntime } from '../vector/runtime.js';

// Forum routes. Votes are stored as a JSON array of
// { userId, value, createdAt } — the client already computes the post-toggle
// array via applyVote() before PUT, so the server just replaces what's given.
//
// Vector indexing (Phase 3b): thread writes + answer writes enqueue embeds
// into the shared vector runtime with kind='forum-thread' / 'forum-answer'.
// "Use my docs" chat RAG and the Semantic search toggle both pick this up
// automatically — no UI wiring needed, since the Phase 1 command palette
// already maps forum-thread/forum-answer → 'forum' category.
//
// Thread deletion cascades to answers at the DB level; we snapshot the
// answer ids first so we can remove them from the vector index too.
// Vote / accept-answer updates do NOT re-embed — those don't change
// semantic meaning and a re-embed per vote would blow through the
// embedder quota.

export function registerForumRoutes(
  app: FastifyInstance,
  db: DatabaseProvider,
  jwtSecret: string,
  vector?: VectorRuntime,
) {
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
    enqueueThreadIndex(vector, created);
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
    // Only re-embed when semantic content actually changed. Vote / viewCount /
    // acceptedAnswerId updates would otherwise burn embedder quota for no gain.
    if (body.title !== undefined || body.body !== undefined) {
      enqueueThreadIndex(vector, updated);
    }
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
    // Snapshot answer ids BEFORE the cascade fires so we can remove them from
    // the vector index too. Same shape as federated-sources delete.
    const answerIds = vector ? (await db.getForumAnswersByThread(id)).map((a) => a.id) : [];
    await db.deleteForumThread(id);
    if (vector) {
      vector.enqueueDelete(id);
      for (const aid of answerIds) vector.enqueueDelete(aid);
    }
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

    enqueueAnswerIndex(vector, created, thread);
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
    // Re-embed only when body changes. Vote + isAccepted updates don't
    // change the semantic signal.
    if (body.body !== undefined) {
      const thread = await db.getForumThreadById(updated.thread_id);
      if (thread) enqueueAnswerIndex(vector, updated, thread);
    }
    return deserializeAnswer(updated);
  });

  app.delete('/api/forum/answers/:id', { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.deleteForumAnswer(id);
    vector?.enqueueDelete(id);
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

// Thread embed = title + body. Metadata exposes author / category / repo
// linkage so the Semantic search UI can show meaningful context per hit.
// Exported for unit tests — routes call these indirectly.
export function enqueueThreadIndex(vector: VectorRuntime | undefined, thread: ForumThreadRow): void {
  if (!vector) return;
  vector.enqueueUpsert({
    id: thread.id,
    kind: 'forum-thread',
    title: thread.title,
    text: `${thread.title}\n\n${thread.body}`.trim(),
    metadata: {
      category: thread.category,
      author_id: thread.author_id,
      author_name: thread.author_name,
      repo_id: thread.repo_id ?? '',
      repo_name: thread.repo_name ?? '',
      created_at: thread.created_at,
      updated_at: thread.updated_at,
    },
  });
}

// Answer embed prefixes the thread title so retrieved snippets are
// interpretable out of context (a bare "try helm" is meaningless without
// the question it's answering). URL in metadata points to the thread view
// so CommandPalette can deep-link citations.
export function enqueueAnswerIndex(
  vector: VectorRuntime | undefined,
  answer: ForumAnswerRow,
  thread: ForumThreadRow,
): void {
  if (!vector) return;
  vector.enqueueUpsert({
    id: answer.id,
    kind: 'forum-answer',
    title: `Re: ${thread.title}`,
    text: `Question: ${thread.title}\n\nAnswer:\n${answer.body}`.trim(),
    metadata: {
      thread_id: answer.thread_id,
      thread_title: thread.title,
      parent_answer_id: answer.parent_answer_id ?? '',
      author_id: answer.author_id,
      author_name: answer.author_name,
      url: `/forum/thread/${answer.thread_id}`,
      created_at: answer.created_at,
    },
  });
}
