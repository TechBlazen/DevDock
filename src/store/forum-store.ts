import { create } from 'zustand';
import type { ForumThread, ForumAnswer, ForumCategory, ForumUserReputation, FeatureRequest, ForumVote } from '../types';
import { getTier } from '../lib/forum-constants';
import { forumApi, featureRequestsApi } from '../lib/api';

// ─── Forum store (API-backed) ───────────────────────────────────────────────
// Forum threads, answers, and feature requests are now persisted server-side.
// This store is a hot cache over the API:
//   • loadThreads() / loadFeatureRequests() are called from App.tsx once the
//     user is authenticated, replacing the cache with the server's truth.
//   • Mutations are optimistic: we update local state immediately, then PUT
//     to the server. On failure we set syncError but leave the local copy so
//     the user doesn't lose their typing. A later load() restores consistency.
//   • Derived reads (getReputation, getTopContributors, getSortedFilteredThreads)
//     continue to run over the local cache — no server round-trip needed.
//
// Voting: applyVote() computes the post-toggle votes array; the client PUTs
// that array wholesale. The server treats the votes field as opaque.

type SortMode = 'newest' | 'votes' | 'unanswered';

interface ForumStore {
  threads: ForumThread[];
  activeThreadId: string | null;
  sortBy: SortMode;
  filterCategory: ForumCategory | null;
  filterTag: string | null;
  loadingThreads: boolean;
  syncError: string | null;

  loadThreads: () => Promise<void>;
  addThread: (thread: Omit<ForumThread, 'id' | 'votes' | 'answers' | 'viewCount' | 'acceptedAnswerId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateThread: (id: string, partial: Partial<Pick<ForumThread, 'title' | 'body' | 'category' | 'tags'>>) => Promise<void>;
  removeThread: (id: string) => Promise<void>;
  setActiveThread: (id: string | null) => void;
  incrementViewCount: (id: string) => Promise<void>;

  addAnswer: (threadId: string, answer: Omit<ForumAnswer, 'id' | 'threadId' | 'votes' | 'isAccepted' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  addReplyToAnswer: (threadId: string, parentAnswerId: string, reply: Omit<ForumAnswer, 'id' | 'threadId' | 'votes' | 'isAccepted' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateAnswer: (threadId: string, answerId: string, body: string) => Promise<void>;
  removeAnswer: (threadId: string, answerId: string) => Promise<void>;
  acceptAnswer: (threadId: string, answerId: string) => Promise<void>;

  voteThread: (threadId: string, userId: string, value: 1 | -1) => Promise<void>;
  voteAnswer: (threadId: string, answerId: string, userId: string, value: 1 | -1) => Promise<void>;

  setSortBy: (sortBy: SortMode) => void;
  setFilterCategory: (category: ForumCategory | null) => void;
  setFilterTag: (tag: string | null) => void;

  getReputation: (userId: string) => ForumUserReputation;
  getTopContributors: (limit?: number) => ForumUserReputation[];
  getSortedFilteredThreads: (searchQuery?: string) => ForumThread[];

  featureRequests: FeatureRequest[];
  loadingFeatureRequests: boolean;

  loadFeatureRequests: () => Promise<void>;
  addFeatureRequest: (req: Omit<FeatureRequest, 'id' | 'votes' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  voteFeatureRequest: (id: string, userId: string, value: 1 | -1) => Promise<void>;
  updateFeatureRequestStatus: (id: string, status: FeatureRequest['status']) => Promise<void>;
  getTopFeatureRequests: (limit?: number) => FeatureRequest[];
}

function applyVote(votes: ForumVote[], userId: string, value: 1 | -1): ForumVote[] {
  const existing = votes.find((v) => v.userId === userId);
  if (existing) {
    if (existing.value === value) return votes.filter((v) => v.userId !== userId); // toggle off
    return votes.map((v) => v.userId === userId ? { ...v, value, createdAt: new Date().toISOString() } : v);
  }
  return [...votes, { userId, value, createdAt: new Date().toISOString() }];
}

function voteScore(votes: { value: number }[]): number {
  return votes.reduce((sum, v) => sum + v.value, 0);
}

async function syncSafely(label: string, op: () => Promise<unknown>): Promise<string | null> {
  try { await op(); return null; }
  catch (e) { console.warn(`[forum-store] ${label} failed:`, e); return e instanceof Error ? e.message : String(e); }
}

export const useForumStore = create<ForumStore>((set, get) => ({
  threads: [],
  activeThreadId: null,
  sortBy: 'newest',
  filterCategory: null,
  filterTag: null,
  loadingThreads: false,
  syncError: null,

  loadThreads: async () => {
    set({ loadingThreads: true, syncError: null });
    try {
      const threads = (await forumApi.listThreads()) as ForumThread[];
      set({ threads, loadingThreads: false });
    } catch (e) {
      set({ loadingThreads: false, syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  addThread: async (thread) => {
    try {
      const created = (await forumApi.createThread({
        title: thread.title,
        body: thread.body,
        category: thread.category,
        tags: thread.tags,
        authorId: thread.authorId,
        authorName: thread.authorName,
        authorAvatarUrl: thread.authorAvatarUrl,
        repoId: thread.repoId,
        repoName: thread.repoName,
        repoSource: thread.repoSource,
        mcpServerId: thread.mcpServerId,
        mcpServerName: thread.mcpServerName,
      })) as ForumThread;
      set((s) => ({ threads: [created, ...s.threads] }));
      return created.id;
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  updateThread: async (id, partial) => {
    set((s) => ({ threads: s.threads.map((t) => t.id === id ? { ...t, ...partial, updatedAt: new Date().toISOString() } : t) }));
    const err = await syncSafely('updateThread', () => forumApi.updateThread(id, { ...partial }));
    if (err) set({ syncError: err });
  },

  removeThread: async (id) => {
    set((s) => ({ threads: s.threads.filter((t) => t.id !== id), activeThreadId: s.activeThreadId === id ? null : s.activeThreadId }));
    const err = await syncSafely('removeThread', () => forumApi.deleteThread(id));
    if (err) set({ syncError: err });
  },

  setActiveThread: (id) => set({ activeThreadId: id }),

  incrementViewCount: async (id) => {
    const thread = get().threads.find((t) => t.id === id);
    if (!thread) return;
    const newCount = thread.viewCount + 1;
    set((s) => ({ threads: s.threads.map((t) => t.id === id ? { ...t, viewCount: newCount } : t) }));
    // Best-effort — view count is high-volume and non-critical.
    await syncSafely('incrementViewCount', () => forumApi.updateThread(id, { viewCount: newCount }));
  },

  addAnswer: async (threadId, answer) => {
    try {
      const created = (await forumApi.createAnswer(threadId, {
        authorId: answer.authorId,
        authorName: answer.authorName,
        authorAvatarUrl: answer.authorAvatarUrl,
        body: answer.body,
      })) as ForumAnswer;
      const now = new Date().toISOString();
      set((s) => ({
        threads: s.threads.map((t) => t.id === threadId ? { ...t, answers: [...t.answers, created], updatedAt: now } : t),
      }));
      return created.id;
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  addReplyToAnswer: async (threadId, parentAnswerId, reply) => {
    try {
      const created = (await forumApi.createAnswer(threadId, {
        parentAnswerId,
        authorId: reply.authorId,
        authorName: reply.authorName,
        authorAvatarUrl: reply.authorAvatarUrl,
        body: reply.body,
      })) as ForumAnswer;
      const now = new Date().toISOString();
      set((s) => ({
        threads: s.threads.map((t) => t.id === threadId ? { ...t, answers: [...t.answers, created], updatedAt: now } : t),
      }));
      return created.id;
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  updateAnswer: async (threadId, answerId, body) => {
    set((s) => ({
      threads: s.threads.map((t) => t.id === threadId ? {
        ...t, answers: t.answers.map((a) => a.id === answerId ? { ...a, body, updatedAt: new Date().toISOString() } : a),
      } : t),
    }));
    const err = await syncSafely('updateAnswer', () => forumApi.updateAnswer(answerId, { body }));
    if (err) set({ syncError: err });
  },

  removeAnswer: async (threadId, answerId) => {
    set((s) => ({
      threads: s.threads.map((t) => t.id === threadId ? {
        ...t,
        answers: t.answers.filter((a) => a.id !== answerId),
        acceptedAnswerId: t.acceptedAnswerId === answerId ? null : t.acceptedAnswerId,
      } : t),
    }));
    const err = await syncSafely('removeAnswer', () => forumApi.deleteAnswer(answerId));
    if (err) set({ syncError: err });
  },

  acceptAnswer: async (threadId, answerId) => {
    // Toggle: if this is already the accepted answer, clear it; otherwise
    // accept it (and unset is_accepted on any prior one).
    const thread = get().threads.find((t) => t.id === threadId);
    if (!thread) return;
    const nextAcceptedId = thread.acceptedAnswerId === answerId ? null : answerId;

    // Optimistic local update
    set((s) => ({
      threads: s.threads.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          acceptedAnswerId: nextAcceptedId,
          answers: t.answers.map((a) => ({ ...a, isAccepted: a.id === nextAcceptedId })),
        };
      }),
    }));

    // Server sync: update thread first, then any affected answer rows.
    await syncSafely('acceptAnswer/thread', () => forumApi.updateThread(threadId, { acceptedAnswerId: nextAcceptedId }));
    for (const a of thread.answers) {
      const shouldBeAccepted = a.id === nextAcceptedId;
      if (a.isAccepted !== shouldBeAccepted) {
        await syncSafely('acceptAnswer/answer', () => forumApi.updateAnswer(a.id, { isAccepted: shouldBeAccepted }));
      }
    }
  },

  voteThread: async (threadId, userId, value) => {
    const thread = get().threads.find((t) => t.id === threadId);
    if (!thread) return;
    const votes = applyVote(thread.votes, userId, value);
    set((s) => ({ threads: s.threads.map((t) => t.id === threadId ? { ...t, votes } : t) }));
    const err = await syncSafely('voteThread', () => forumApi.updateThread(threadId, { votes }));
    if (err) set({ syncError: err });
  },

  voteAnswer: async (threadId, answerId, userId, value) => {
    const thread = get().threads.find((t) => t.id === threadId);
    const answer = thread?.answers.find((a) => a.id === answerId);
    if (!thread || !answer) return;
    const votes = applyVote(answer.votes, userId, value);
    set((s) => ({
      threads: s.threads.map((t) => t.id === threadId ? {
        ...t, answers: t.answers.map((a) => a.id === answerId ? { ...a, votes } : a),
      } : t),
    }));
    const err = await syncSafely('voteAnswer', () => forumApi.updateAnswer(answerId, { votes }));
    if (err) set({ syncError: err });
  },

  setSortBy: (sortBy) => set({ sortBy }),
  setFilterCategory: (filterCategory) => set({ filterCategory }),
  setFilterTag: (filterTag) => set({ filterTag }),

  getReputation: (userId) => {
    const threads = get().threads;
    let points = 0;
    let questionCount = 0;
    let answerCount = 0;
    let acceptedCount = 0;
    let displayName = userId;
    let avatarUrl: string | undefined;

    for (const t of threads) {
      if (t.authorId === userId) {
        questionCount++;
        displayName = t.authorName;
        avatarUrl = t.authorAvatarUrl;
        points += t.votes.filter((v) => v.value === 1).length * 5;
      }
      for (const a of t.answers) {
        if (a.authorId === userId) {
          answerCount++;
          displayName = a.authorName;
          avatarUrl = a.authorAvatarUrl;
          points += a.votes.filter((v) => v.value === 1).length * 10;
          if (a.isAccepted) { acceptedCount++; points += 15; }
        }
      }
    }

    return { userId, displayName, avatarUrl, points, tier: getTier(points), questionCount, answerCount, acceptedCount };
  },

  getTopContributors: (limit = 10) => {
    const threads = get().threads;
    const userIds = new Set<string>();
    for (const t of threads) {
      userIds.add(t.authorId);
      for (const a of t.answers) userIds.add(a.authorId);
    }
    return [...userIds].map((id) => get().getReputation(id)).sort((a, b) => b.points - a.points).slice(0, limit);
  },

  // ─── Feature Requests ────────────────────────────────────────────────────
  featureRequests: [],
  loadingFeatureRequests: false,

  loadFeatureRequests: async () => {
    set({ loadingFeatureRequests: true });
    try {
      const list = (await featureRequestsApi.list()) as FeatureRequest[];
      set({ featureRequests: list, loadingFeatureRequests: false });
    } catch (e) {
      set({ loadingFeatureRequests: false, syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  addFeatureRequest: async (req) => {
    try {
      const created = (await featureRequestsApi.create({
        title: req.title,
        description: req.description,
        authorId: req.authorId,
        authorName: req.authorName,
        authorAvatarUrl: req.authorAvatarUrl,
        attachments: req.attachments,
        tags: req.tags,
      })) as FeatureRequest;
      set((s) => ({ featureRequests: [created, ...s.featureRequests] }));
      return created.id;
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  voteFeatureRequest: async (id, userId, value) => {
    const req = get().featureRequests.find((r) => r.id === id);
    if (!req) return;
    const votes = applyVote(req.votes, userId, value);
    set((s) => ({ featureRequests: s.featureRequests.map((r) => r.id === id ? { ...r, votes } : r) }));
    const err = await syncSafely('voteFeatureRequest', () => featureRequestsApi.update(id, { votes }));
    if (err) set({ syncError: err });
  },

  updateFeatureRequestStatus: async (id, status) => {
    set((s) => ({
      featureRequests: s.featureRequests.map((r) => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r),
    }));
    const err = await syncSafely('updateFeatureRequestStatus', () => featureRequestsApi.update(id, { status }));
    if (err) set({ syncError: err });
  },

  getTopFeatureRequests: (limit = 10) => {
    return [...get().featureRequests].sort((a, b) => voteScore(b.votes) - voteScore(a.votes)).slice(0, limit);
  },

  getSortedFilteredThreads: (searchQuery) => {
    const { threads, sortBy, filterCategory, filterTag } = get();
    let result = [...threads];

    if (filterCategory) result = result.filter((t) => t.category === filterCategory);
    if (filterTag) result = result.filter((t) => t.tags.includes(filterTag));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.answers.some((a) => a.body.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'votes': result.sort((a, b) => voteScore(b.votes) - voteScore(a.votes)); break;
      case 'unanswered': result = result.filter((t) => t.answers.length === 0); break;
    }

    return result;
  },
}));
