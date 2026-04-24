import { describe, it, expect, beforeEach, vi } from 'vitest';

// forumApi and featureRequestsApi are mocked out so these tests run without a
// live server. The mocks synthesise an id + timestamps on create calls so the
// store-level invariants (prepend, toggle votes, accept/unaccept, etc.) stay
// assertable in a pure-Node environment.
vi.mock('../../lib/api', () => {
  let nextId = 1;
  const mkId = () => `mock-${nextId++}`;
  const nowIso = () => new Date().toISOString();

  const forumApi = {
    listThreads: vi.fn(async () => []),
    getThread: vi.fn(),
    createThread: vi.fn(async (data: Record<string, unknown>) => ({
      id: mkId(),
      title: data.title ?? '',
      body: data.body ?? '',
      category: data.category ?? 'question',
      tags: data.tags ?? [],
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      authorAvatarUrl: data.authorAvatarUrl,
      votes: [],
      answers: [],
      viewCount: 0,
      acceptedAnswerId: null,
      repoId: data.repoId,
      repoName: data.repoName,
      repoSource: data.repoSource,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })),
    updateThread: vi.fn(async () => ({})),
    deleteThread: vi.fn(async () => ({})),
    createAnswer: vi.fn(async (_threadId: string, data: Record<string, unknown>) => ({
      id: mkId(),
      threadId: _threadId,
      parentAnswerId: data.parentAnswerId,
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      authorAvatarUrl: data.authorAvatarUrl,
      body: data.body ?? '',
      votes: [],
      isAccepted: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })),
    updateAnswer: vi.fn(async () => ({})),
    deleteAnswer: vi.fn(async () => ({})),
  };
  const featureRequestsApi = {
    list: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(async () => ({})),
    delete: vi.fn(),
  };
  return { forumApi, featureRequestsApi };
});

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { useForumStore } = await import('../../store/forum-store');

describe('useForumStore', () => {
  beforeEach(() => {
    useForumStore.setState({
      threads: [],
      featureRequests: [],
      activeThreadId: null,
      sortBy: 'newest',
      filterCategory: null,
      filterTag: null,
      syncError: null,
    });
  });

  it('addThread prepends a new thread and returns the new id', async () => {
    const id = await useForumStore.getState().addThread({
      title: 'Test thread', body: 'Body', category: 'question',
      tags: ['test'], authorId: 'u-1', authorName: 'Judge', authorAvatarUrl: '',
    });
    const threads = useForumStore.getState().threads;
    expect(threads[0].id).toBe(id);
    expect(threads[0].title).toBe('Test thread');
    expect(threads[0].votes).toEqual([]);
    expect(threads[0].answers).toEqual([]);
    expect(threads[0].acceptedAnswerId).toBeNull();
  });

  it('updateThread merges partial fields and bumps updatedAt', async () => {
    const id = await useForumStore.getState().addThread({
      title: 'Old', body: 'Old body', category: 'discussion', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const originalUpdated = useForumStore.getState().threads.find((t) => t.id === id)!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await useForumStore.getState().updateThread(id!, { title: 'New title' });
    const thread = useForumStore.getState().threads.find((t) => t.id === id);
    expect(thread?.title).toBe('New title');
    expect(thread?.body).toBe('Old body');
    expect(thread?.updatedAt).not.toBe(originalUpdated);
  });

  it('addAnswer appends a new answer to a thread', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'Answer body',
    });
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.answers.find((a) => a.id === aid)?.body).toBe('Answer body');
  });

  it('addReplyToAnswer attaches a reply with parentAnswerId', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const parent = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'parent',
    });
    const reply = await useForumStore.getState().addReplyToAnswer(tid!, parent!, {
      authorId: 'u-3', authorName: 'Carol', authorAvatarUrl: '', body: 'reply',
    });
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    const replyAnswer = thread?.answers.find((a) => a.id === reply);
    expect(replyAnswer?.parentAnswerId).toBe(parent);
    expect(replyAnswer?.body).toBe('reply');
  });

  it('updateAnswer rewrites body and bumps updatedAt', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'old',
    });
    await useForumStore.getState().updateAnswer(tid!, aid!, 'new');
    const answer = useForumStore.getState().threads.find((t) => t.id === tid)?.answers.find((a) => a.id === aid);
    expect(answer?.body).toBe('new');
  });

  it('voteThread records an upvote and score increases', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    await useForumStore.getState().voteThread(tid!, 'voter-1', 1);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.votes).toHaveLength(1);
    expect(thread?.votes[0].value).toBe(1);
  });

  it('voteThread toggles off when the same user votes the same direction twice', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    await useForumStore.getState().voteThread(tid!, 'voter-1', 1);
    await useForumStore.getState().voteThread(tid!, 'voter-1', 1);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.votes).toHaveLength(0);
  });

  it('voteThread switches direction when the user changes vote', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    await useForumStore.getState().voteThread(tid!, 'voter-1', 1);
    await useForumStore.getState().voteThread(tid!, 'voter-1', -1);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.votes).toHaveLength(1);
    expect(thread?.votes[0].value).toBe(-1);
  });

  it('acceptAnswer locks the answer and toggles the acceptedAnswerId', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'answer',
    });
    await useForumStore.getState().acceptAnswer(tid!, aid!);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.acceptedAnswerId).toBe(aid);
    await useForumStore.getState().acceptAnswer(tid!, aid!);
    expect(useForumStore.getState().threads.find((t) => t.id === tid)?.acceptedAnswerId).toBeNull();
  });

  it('removeAnswer deletes and clears acceptedAnswerId when applicable', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'answer',
    });
    await useForumStore.getState().acceptAnswer(tid!, aid!);
    await useForumStore.getState().removeAnswer(tid!, aid!);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.answers).toHaveLength(0);
    expect(thread?.acceptedAnswerId).toBeNull();
  });

  it('setSortBy, setFilterCategory, setFilterTag update their slices', () => {
    useForumStore.getState().setSortBy('votes');
    useForumStore.getState().setFilterCategory('bug');
    useForumStore.getState().setFilterTag('Kubernetes');
    const state = useForumStore.getState();
    expect(state.sortBy).toBe('votes');
    expect(state.filterCategory).toBe('bug');
    expect(state.filterTag).toBe('Kubernetes');
  });

  it('getSortedFilteredThreads filters by category', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 'Bug here', body: '', category: 'bug', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    useForumStore.setState({ filterCategory: 'bug' });
    const results = useForumStore.getState().getSortedFilteredThreads();
    expect(results.some((t) => t.id === tid)).toBe(true);
    expect(results.every((t) => t.category === 'bug')).toBe(true);
  });
});
