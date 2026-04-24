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

  it('getSortedFilteredThreads filters by tag', async () => {
    await useForumStore.getState().addThread({
      title: 'X', body: '', category: 'question', tags: ['rust'], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    await useForumStore.getState().addThread({
      title: 'Y', body: '', category: 'question', tags: ['go'], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    useForumStore.setState({ filterTag: 'rust' });
    const results = useForumStore.getState().getSortedFilteredThreads();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('X');
  });

  it('getSortedFilteredThreads searchQuery matches title, tag, and answer body', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 'Deploy kubernetes', body: '', category: 'question', tags: ['k8s'], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'A', authorAvatarUrl: '', body: 'try helm',
    });
    expect(useForumStore.getState().getSortedFilteredThreads('kubernetes')).toHaveLength(1);
    expect(useForumStore.getState().getSortedFilteredThreads('k8s')).toHaveLength(1);
    expect(useForumStore.getState().getSortedFilteredThreads('helm')).toHaveLength(1);
    expect(useForumStore.getState().getSortedFilteredThreads('nonexistent')).toEqual([]);
  });

  it('getSortedFilteredThreads sorts by votes and filters unanswered', async () => {
    const a = await useForumStore.getState().addThread({
      title: 'A', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const b = await useForumStore.getState().addThread({
      title: 'B', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    await useForumStore.getState().voteThread(b!, 'v1', 1);
    await useForumStore.getState().voteThread(b!, 'v2', 1);
    await useForumStore.getState().addAnswer(a!, { authorId: 'u-2', authorName: 'A', authorAvatarUrl: '', body: 'answered' });

    useForumStore.setState({ sortBy: 'votes' });
    expect(useForumStore.getState().getSortedFilteredThreads()[0].id).toBe(b);

    useForumStore.setState({ sortBy: 'unanswered' });
    expect(useForumStore.getState().getSortedFilteredThreads().map((t) => t.id)).toEqual([b]);
  });

  it('getReputation aggregates thread + answer + accepted bonuses', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: '', category: 'question', tags: [], authorId: 'alice', authorName: 'Alice', authorAvatarUrl: '',
    });
    await useForumStore.getState().voteThread(tid!, 'voter1', 1);
    const aid = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'bob', authorName: 'Bob', authorAvatarUrl: '', body: 'ans',
    });
    await useForumStore.getState().voteAnswer(tid!, aid!, 'voter2', 1);
    await useForumStore.getState().acceptAnswer(tid!, aid!);

    const alice = useForumStore.getState().getReputation('alice');
    expect(alice.questionCount).toBe(1);
    expect(alice.points).toBe(5); // 1 upvote on thread * 5
    const bob = useForumStore.getState().getReputation('bob');
    expect(bob.answerCount).toBe(1);
    expect(bob.acceptedCount).toBe(1);
    expect(bob.points).toBe(25); // 1 upvote * 10 + 15 accepted bonus
  });

  it('getTopContributors orders users by points desc', async () => {
    const tid = await useForumStore.getState().addThread({
      title: 't', body: '', category: 'question', tags: [], authorId: 'alice', authorName: 'Alice', authorAvatarUrl: '',
    });
    await useForumStore.getState().voteThread(tid!, 'v1', 1);
    await useForumStore.getState().voteThread(tid!, 'v2', 1);
    await useForumStore.getState().addAnswer(tid!, {
      authorId: 'bob', authorName: 'Bob', authorAvatarUrl: '', body: 'a',
    });
    const top = useForumStore.getState().getTopContributors(5);
    // Alice has 2 upvotes × 5 = 10 pts; Bob has 0 pts from unvoted answer.
    expect(top[0].userId).toBe('alice');
    expect(top.map((u) => u.userId)).toContain('bob');
  });

  // ─── Error paths — exercise the try/catch branches added by the rewrite ──
  it('updateThread sets syncError when API fails and keeps local state', async () => {
    const { forumApi } = await import('../../lib/api');
    const tid = await useForumStore.getState().addThread({
      title: 'hello', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    (forumApi.updateThread as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('boom'));
    await useForumStore.getState().updateThread(tid!, { title: 'new' });
    expect(useForumStore.getState().threads.find((t) => t.id === tid)?.title).toBe('new');
    expect(useForumStore.getState().syncError).toContain('boom');
  });

  it('addThread returns null when the API throws', async () => {
    const { forumApi } = await import('../../lib/api');
    (forumApi.createThread as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('server down'));
    const id = await useForumStore.getState().addThread({
      title: 'x', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    expect(id).toBeNull();
    expect(useForumStore.getState().syncError).toContain('server down');
    expect(useForumStore.getState().threads).toHaveLength(0);
  });

  it('loadThreads success replaces cache, failure surfaces syncError', async () => {
    const { forumApi } = await import('../../lib/api');
    (forumApi.listThreads as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce([
        { id: 'srv-1', title: 'from server', body: '', category: 'question', tags: [], authorId: 'x', authorName: 'X', votes: [], answers: [], viewCount: 0, acceptedAnswerId: null, createdAt: 't', updatedAt: 't' },
      ]);
    await useForumStore.getState().loadThreads();
    expect(useForumStore.getState().threads).toHaveLength(1);
    expect(useForumStore.getState().threads[0].id).toBe('srv-1');

    (forumApi.listThreads as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('500'));
    await useForumStore.getState().loadThreads();
    expect(useForumStore.getState().syncError).toContain('500');
  });

  it('removeThread deletes locally and surfaces error when API fails', async () => {
    const { forumApi } = await import('../../lib/api');
    const tid = await useForumStore.getState().addThread({
      title: 'doomed', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    (forumApi.deleteThread as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('409'));
    await useForumStore.getState().removeThread(tid!);
    expect(useForumStore.getState().threads).toHaveLength(0);
    expect(useForumStore.getState().syncError).toContain('409');
  });

  it('addAnswer returns null when the API throws', async () => {
    const { forumApi } = await import('../../lib/api');
    const tid = await useForumStore.getState().addThread({
      title: 't', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    (forumApi.createAnswer as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('nope'));
    const id = await useForumStore.getState().addAnswer(tid!, {
      authorId: 'u-2', authorName: 'A', authorAvatarUrl: '', body: 'x',
    });
    expect(id).toBeNull();
    expect(useForumStore.getState().syncError).toContain('nope');
  });

  it('incrementViewCount optimistically increments and tolerates API failure', async () => {
    const { forumApi } = await import('../../lib/api');
    const tid = await useForumStore.getState().addThread({
      title: 't', body: '', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    (forumApi.updateThread as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('transient'));
    await useForumStore.getState().incrementViewCount(tid!);
    expect(useForumStore.getState().threads[0].viewCount).toBe(1);
    // incrementViewCount uses syncSafely — it logs but does not set syncError
    // (high-volume + non-critical). No assertion on syncError here.
  });

  // ─── Feature requests ─────────────────────────────────────────────────────
  it('addFeatureRequest, vote, status update, and top query', async () => {
    const { featureRequestsApi } = await import('../../lib/api');
    const now = new Date().toISOString();
    (featureRequestsApi.create as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({
        id: 'fr-1', title: 'Dark mode', description: 'pls', authorId: 'u-1', authorName: 'J', status: 'open',
        votes: [], attachments: [], tags: [], createdAt: now, updatedAt: now,
      });
    const id = await useForumStore.getState().addFeatureRequest({
      title: 'Dark mode', description: 'pls', authorId: 'u-1', authorName: 'J', authorAvatarUrl: '', attachments: [], tags: [],
    });
    expect(id).toBe('fr-1');

    await useForumStore.getState().voteFeatureRequest('fr-1', 'v1', 1);
    expect(useForumStore.getState().featureRequests[0].votes).toHaveLength(1);

    await useForumStore.getState().updateFeatureRequestStatus('fr-1', 'planned');
    expect(useForumStore.getState().featureRequests[0].status).toBe('planned');

    expect(useForumStore.getState().getTopFeatureRequests(3)[0].id).toBe('fr-1');
  });

  it('loadFeatureRequests hydrates from server and handles failure', async () => {
    const { featureRequestsApi } = await import('../../lib/api');
    (featureRequestsApi.list as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce([{ id: 'fr-srv', title: 'srv', description: '', authorId: 'u', authorName: 'U', status: 'open', votes: [], attachments: [], tags: [], createdAt: 't', updatedAt: 't' }]);
    await useForumStore.getState().loadFeatureRequests();
    expect(useForumStore.getState().featureRequests).toHaveLength(1);

    (featureRequestsApi.list as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('down'));
    await useForumStore.getState().loadFeatureRequests();
    expect(useForumStore.getState().syncError).toContain('down');
  });

  it('addFeatureRequest returns null when the API throws', async () => {
    const { featureRequestsApi } = await import('../../lib/api');
    (featureRequestsApi.create as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error('bad'));
    const id = await useForumStore.getState().addFeatureRequest({
      title: 'x', description: '', authorId: 'u', authorName: 'U', authorAvatarUrl: '', attachments: [], tags: [],
    });
    expect(id).toBeNull();
    expect(useForumStore.getState().syncError).toContain('bad');
  });
});
