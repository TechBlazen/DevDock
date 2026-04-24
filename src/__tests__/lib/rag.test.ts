import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SemanticHit } from '../../lib/api';

// Mock the api module BEFORE importing rag (which imports from api).
// Using vi.mock at module level so every rag.ts import path goes through
// the mocked semanticSearchApi.
vi.mock('../../lib/api', () => ({
  semanticSearchApi: { search: vi.fn() },
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { fetchDocsContext, formatContextPrompt, hitsToCitations } = await import('../../lib/rag');
const { semanticSearchApi } = await import('../../lib/api');
const searchMock = semanticSearchApi.search as unknown as ReturnType<typeof vi.fn>;

function hit(overrides: Partial<SemanticHit> = {}): SemanticHit {
  return {
    parentId: 'd1',
    kind: 'doc',
    title: 'Setup guide',
    snippet: 'Install and configure DevDock by running ...',
    heading: null,
    metadata: {},
    distance: 0.2,
    ...overrides,
  };
}

describe('formatContextPrompt', () => {
  it('renders each hit as a numbered block with the title', () => {
    const out = formatContextPrompt([
      hit({ parentId: 'a', title: 'First', snippet: 'Alpha body.' }),
      hit({ parentId: 'b', title: 'Second', snippet: 'Beta body.' }),
    ]);
    expect(out).toContain('[Doc 1 — First]');
    expect(out).toContain('Alpha body.');
    expect(out).toContain('[Doc 2 — Second]');
    expect(out).toContain('Beta body.');
  });

  it('includes the heading in the block label when present', () => {
    const out = formatContextPrompt([hit({ heading: 'Installation' })]);
    expect(out).toContain('[Doc 1 — Setup guide — Installation]');
  });

  it('falls back to "(untitled)" when title is empty', () => {
    const out = formatContextPrompt([hit({ title: '' })]);
    expect(out).toContain('[Doc 1 — (untitled)]');
  });

  it('starts with the opt-in preamble so the LLM knows RAG is scoped', () => {
    const out = formatContextPrompt([hit()]);
    expect(out).toMatch(/opted in to "Use my docs"/);
    expect(out).toMatch(/without inventing citations/i);
  });
});

describe('hitsToCitations', () => {
  it('dedupes by parentId, keeping the first hit', () => {
    const out = hitsToCitations([
      hit({ parentId: 'd1', title: 'Doc A — chunk 0' }),
      hit({ parentId: 'd1', title: 'Doc A — chunk 1' }),
      hit({ parentId: 'd2', title: 'Doc B' }),
    ]);
    expect(out.map((c) => c.parentId)).toEqual(['d1', 'd2']);
    expect(out[0].title).toBe('Doc A — chunk 0');
  });

  it('pulls url from metadata.url or metadata.source_url', () => {
    const a = hitsToCitations([hit({ parentId: 'a', metadata: { url: 'https://a.example' } })]);
    const b = hitsToCitations([hit({ parentId: 'b', metadata: { source_url: 'https://b.example' } })]);
    const c = hitsToCitations([hit({ parentId: 'c', metadata: {} })]);
    expect(a[0].url).toBe('https://a.example');
    expect(b[0].url).toBe('https://b.example');
    expect(c[0].url).toBeUndefined();
  });
});

describe('fetchDocsContext', () => {
  beforeEach(() => { searchMock.mockReset(); });

  it('returns null for empty queries without hitting the API', async () => {
    expect(await fetchDocsContext('   ')).toBeNull();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('returns null when retrieval throws (503 / network)', async () => {
    searchMock.mockRejectedValueOnce(new Error('Network Error'));
    expect(await fetchDocsContext('question')).toBeNull();
  });

  it('returns null when the server returns no hits', async () => {
    searchMock.mockResolvedValueOnce([]);
    expect(await fetchDocsContext('question')).toBeNull();
  });

  it('returns a prompt + citations when hits are found', async () => {
    searchMock.mockResolvedValueOnce([
      hit({ parentId: 'x', title: 'Relevant', snippet: 'body one' }),
      hit({ parentId: 'y', title: 'Relevant 2', snippet: 'body two' }),
    ]);
    const got = await fetchDocsContext('question');
    expect(got).not.toBeNull();
    expect(got!.contextPrompt).toContain('Relevant');
    expect(got!.contextPrompt).toContain('Relevant 2');
    expect(got!.citations).toHaveLength(2);
  });

  it('passes through a custom k to the API', async () => {
    searchMock.mockResolvedValueOnce([]);
    await fetchDocsContext('question', 8);
    expect(searchMock).toHaveBeenCalledWith('question', { k: 8 });
  });
});
