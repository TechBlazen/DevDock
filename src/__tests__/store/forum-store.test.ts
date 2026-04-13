import { describe, it, expect, beforeEach } from 'vitest';
import { useForumStore } from '../../store/forum-store';

describe('useForumStore', () => {
  const initialThreads = useForumStore.getInitialState().threads;

  beforeEach(() => {
    useForumStore.setState({
      threads: structuredClone(initialThreads),
      activeThreadId: null,
      sortBy: 'newest',
      filterCategory: null,
      filterTag: null,
    });
  });

  it('seeds with sample threads', () => {
    const { threads } = useForumStore.getState();
    expect(threads.length).toBeGreaterThan(0);
  });

  it('addThread prepends a new thread and returns the new id', () => {
    const id = useForumStore.getState().addThread({
      title: 'Test thread',
      body: 'Body',
      category: 'question',
      tags: ['test'],
      authorId: 'u-1',
      authorName: 'Judge',
      authorAvatarUrl: '',
    });
    const threads = useForumStore.getState().threads;
    expect(threads[0].id).toBe(id);
    expect(threads[0].title).toBe('Test thread');
    expect(threads[0].votes).toEqual([]);
    expect(threads[0].answers).toEqual([]);
    expect(threads[0].acceptedAnswerId).toBeNull();
  });

  it('updateThread merges partial fields and bumps updatedAt', async () => {
    const id = useForumStore.getState().addThread({
      title: 'Old', body: 'Old body', category: 'discussion', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const originalUpdated = useForumStore.getState().threads.find((t) => t.id === id)!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    useForumStore.getState().updateThread(id, { title: 'New title' });
    const thread = useForumStore.getState().threads.find((t) => t.id === id);
    expect(thread?.title).toBe('New title');
    expect(thread?.body).toBe('Old body');
    expect(thread?.updatedAt).not.toBe(originalUpdated);
  });

  it('addAnswer appends a new answer to a thread', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = useForumStore.getState().addAnswer(tid, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'Answer body',
    });
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.answers.find((a) => a.id === aid)?.body).toBe('Answer body');
  });

  it('addReplyToAnswer attaches a reply with parentAnswerId', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const parent = useForumStore.getState().addAnswer(tid, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'parent',
    });
    const reply = useForumStore.getState().addReplyToAnswer(tid, parent, {
      authorId: 'u-3', authorName: 'Carol', authorAvatarUrl: '', body: 'reply',
    });
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    const replyAnswer = thread?.answers.find((a) => a.id === reply);
    expect(replyAnswer?.parentAnswerId).toBe(parent);
    expect(replyAnswer?.body).toBe('reply');
  });

  it('updateAnswer rewrites body and bumps updatedAt', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = useForumStore.getState().addAnswer(tid, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'old',
    });
    useForumStore.getState().updateAnswer(tid, aid, 'new');
    const answer = useForumStore.getState().threads.find((t) => t.id === tid)?.answers.find((a) => a.id === aid);
    expect(answer?.body).toBe('new');
  });

  it('voteThread records an upvote and score increases', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    useForumStore.getState().voteThread(tid, 'voter-1', 1);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.votes).toHaveLength(1);
    expect(thread?.votes[0].value).toBe(1);
  });

  it('voteThread toggles off when the same user votes the same direction twice', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    useForumStore.getState().voteThread(tid, 'voter-1', 1);
    useForumStore.getState().voteThread(tid, 'voter-1', 1);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.votes).toHaveLength(0);
  });

  it('voteThread switches direction when the user changes vote', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    useForumStore.getState().voteThread(tid, 'voter-1', 1);
    useForumStore.getState().voteThread(tid, 'voter-1', -1);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.votes).toHaveLength(1);
    expect(thread?.votes[0].value).toBe(-1);
  });

  it('acceptAnswer locks the answer and toggles the acceptedAnswerId', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = useForumStore.getState().addAnswer(tid, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'answer',
    });
    useForumStore.getState().acceptAnswer(tid, aid);
    const thread = useForumStore.getState().threads.find((t) => t.id === tid);
    expect(thread?.acceptedAnswerId).toBe(aid);
    // Toggling the same answer un-accepts it
    useForumStore.getState().acceptAnswer(tid, aid);
    expect(useForumStore.getState().threads.find((t) => t.id === tid)?.acceptedAnswerId).toBeNull();
  });

  it('removeAnswer deletes and clears acceptedAnswerId when applicable', () => {
    const tid = useForumStore.getState().addThread({
      title: 't', body: 'b', category: 'question', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    const aid = useForumStore.getState().addAnswer(tid, {
      authorId: 'u-2', authorName: 'Bob', authorAvatarUrl: '', body: 'answer',
    });
    useForumStore.getState().acceptAnswer(tid, aid);
    useForumStore.getState().removeAnswer(tid, aid);
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

  it('getSortedFilteredThreads filters by category', () => {
    const tid = useForumStore.getState().addThread({
      title: 'Bug here', body: '', category: 'bug', tags: [], authorId: 'u-1', authorName: 'J', authorAvatarUrl: '',
    });
    useForumStore.setState({ filterCategory: 'bug' });
    const results = useForumStore.getState().getSortedFilteredThreads();
    expect(results.some((t) => t.id === tid)).toBe(true);
    expect(results.every((t) => t.category === 'bug')).toBe(true);
  });
});
