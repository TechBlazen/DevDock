import { describe, expect, it, vi } from 'vitest';
import { enqueueThreadIndex, enqueueAnswerIndex } from '../forum.js';
import type { ForumThreadRow, ForumAnswerRow } from '../../db/provider.js';
import type { VectorRuntime } from '../../vector/runtime.js';

// Phase 3b unit tests. Route-level wiring is validated here by exercising the
// enqueue helpers directly (much cheaper than spinning up Fastify + a DB).
// End-to-end behaviour — "writes actually produce searchable vectors" — is
// exercised by the Chroma integration test separately.

function makeVector(): { runtime: VectorRuntime; upserts: Array<Parameters<VectorRuntime['enqueueUpsert']>[0]>; deletes: string[] } {
  const upserts: Array<Parameters<VectorRuntime['enqueueUpsert']>[0]> = [];
  const deletes: string[] = [];
  return {
    runtime: {
      enabled: true,
      enqueueUpsert: vi.fn((item) => { upserts.push(item); }),
      enqueueDelete: vi.fn((id) => { deletes.push(id); }),
      search: vi.fn(),
      drain: async () => {},
    },
    upserts,
    deletes,
  };
}

function makeThread(overrides: Partial<ForumThreadRow> = {}): ForumThreadRow {
  return {
    id: 't1',
    title: 'How do I do X?',
    body: 'Specifically, I want to configure Y.',
    category: 'how-to',
    tags: '["k8s"]',
    author_id: 'u1',
    author_name: 'Alice',
    votes: '[]',
    view_count: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function makeAnswer(overrides: Partial<ForumAnswerRow> = {}): ForumAnswerRow {
  return {
    id: 'a1',
    thread_id: 't1',
    author_id: 'u2',
    author_name: 'Bob',
    body: 'Try running this command.',
    votes: '[]',
    is_accepted: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('enqueueThreadIndex', () => {
  it('enqueues an upsert with kind="forum-thread" and title+body text', () => {
    const { runtime, upserts } = makeVector();
    enqueueThreadIndex(runtime, makeThread());
    expect(upserts).toHaveLength(1);
    expect(upserts[0].id).toBe('t1');
    expect(upserts[0].kind).toBe('forum-thread');
    expect(upserts[0].title).toBe('How do I do X?');
    expect(upserts[0].text).toBe('How do I do X?\n\nSpecifically, I want to configure Y.');
  });

  it('exposes author + category + repo linkage in metadata', () => {
    const { runtime, upserts } = makeVector();
    enqueueThreadIndex(runtime, makeThread({
      category: 'bug', author_id: 'alice', author_name: 'Alice Chen',
      repo_id: 'r1', repo_name: 'forge-portal',
    }));
    const meta = upserts[0].metadata!;
    expect(meta.category).toBe('bug');
    expect(meta.author_id).toBe('alice');
    expect(meta.author_name).toBe('Alice Chen');
    expect(meta.repo_id).toBe('r1');
    expect(meta.repo_name).toBe('forge-portal');
  });

  it('uses empty strings for missing optional repo fields (Chroma metadata can\'t be undefined)', () => {
    const { runtime, upserts } = makeVector();
    enqueueThreadIndex(runtime, makeThread({ repo_id: undefined, repo_name: undefined }));
    expect(upserts[0].metadata!.repo_id).toBe('');
    expect(upserts[0].metadata!.repo_name).toBe('');
  });

  it('is a no-op when the vector runtime is undefined', () => {
    // The runtime arg is undefined when GEMINI_API_KEY isn't configured. The
    // helper must not throw — it just silently skips.
    expect(() => enqueueThreadIndex(undefined, makeThread())).not.toThrow();
  });
});

describe('enqueueAnswerIndex', () => {
  it('enqueues with kind="forum-answer" and prefixes thread title for context', () => {
    const { runtime, upserts } = makeVector();
    enqueueAnswerIndex(runtime, makeAnswer({ body: 'Try helm.' }), makeThread({ title: 'Deploy k8s' }));
    expect(upserts).toHaveLength(1);
    expect(upserts[0].kind).toBe('forum-answer');
    expect(upserts[0].title).toBe('Re: Deploy k8s');
    // Thread title in the text so a retrieved chunk is interpretable without
    // its parent context.
    expect(upserts[0].text).toContain('Question: Deploy k8s');
    expect(upserts[0].text).toContain('Answer:\nTry helm.');
  });

  it('stores thread_id + thread_title + url in metadata for citation rendering', () => {
    const { runtime, upserts } = makeVector();
    enqueueAnswerIndex(runtime, makeAnswer({ thread_id: 't42', parent_answer_id: 'a3' }), makeThread({ id: 't42', title: 'Deploy k8s' }));
    const meta = upserts[0].metadata!;
    expect(meta.thread_id).toBe('t42');
    expect(meta.thread_title).toBe('Deploy k8s');
    expect(meta.parent_answer_id).toBe('a3');
    expect(meta.url).toBe('/forum/thread/t42');
  });

  it('is a no-op when the vector runtime is undefined', () => {
    expect(() => enqueueAnswerIndex(undefined, makeAnswer(), makeThread())).not.toThrow();
  });
});
