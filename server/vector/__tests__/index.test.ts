import { describe, expect, it, beforeEach, vi } from 'vitest';
import { VectorIndex } from '../index.js';
import { FakeEmbedder } from '../../embeddings/fake.js';
import type { ChromaWrapper } from '../chroma-client.js';

// Mock ChromaWrapper just enough that we can assert what VectorIndex sends it.
function makeChromaMock() {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const deleteByParentId = vi.fn().mockResolvedValue(undefined);
  const query = vi.fn().mockResolvedValue([]);
  const mock = {
    upsert,
    deleteByParentId,
    query,
    deleteByIds: vi.fn(),
    reset: vi.fn(),
  } as unknown as ChromaWrapper;
  return { mock, upsert, deleteByParentId, query };
}

describe('VectorIndex', () => {
  let chroma: ReturnType<typeof makeChromaMock>;
  let index: VectorIndex;

  beforeEach(() => {
    chroma = makeChromaMock();
    index = new VectorIndex(chroma.mock, new FakeEmbedder());
  });

  it('upserts a single chunk for a short doc', async () => {
    await index.upsert({ id: 'doc1', kind: 'doc', title: 'Hello', text: 'A short doc body.' });

    expect(chroma.deleteByParentId).toHaveBeenCalledWith('doc1');
    expect(chroma.upsert).toHaveBeenCalledTimes(1);
    const items = chroma.upsert.mock.calls[0][0];
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('doc:doc1:0');
    expect(items[0].metadata.parent_id).toBe('doc1');
    expect(items[0].metadata.kind).toBe('doc');
    expect(items[0].metadata.title).toBe('Hello');
    expect(items[0].embedding).toHaveLength(768);
  });

  it('produces multiple chunks for a long doc', async () => {
    const big = Array(1500).fill('word').join(' ');
    await index.upsert({ id: 'long', kind: 'doc', title: 'Big', text: big });
    const items = chroma.upsert.mock.calls[0][0];
    expect(items.length).toBeGreaterThan(1);
    expect(items.map((i: { id: string }) => i.id)).toEqual(
      items.map((_: unknown, idx: number) => `doc:long:${idx}`)
    );
  });

  it('skips re-embedding when content has not changed (hash skip)', async () => {
    const item = { id: 'd', kind: 'doc' as const, title: 't', text: 'identical text' };
    await index.upsert(item);
    await index.upsert(item);
    // First call → 1 delete + 1 upsert. Second call → no-op.
    expect(chroma.deleteByParentId).toHaveBeenCalledTimes(1);
    expect(chroma.upsert).toHaveBeenCalledTimes(1);
  });

  it('re-embeds when content changes', async () => {
    await index.upsert({ id: 'd', kind: 'doc', title: 't', text: 'first' });
    await index.upsert({ id: 'd', kind: 'doc', title: 't', text: 'second' });
    expect(chroma.upsert).toHaveBeenCalledTimes(2);
    expect(chroma.deleteByParentId).toHaveBeenCalledTimes(2);
  });

  it('skips empty text without calling Chroma', async () => {
    await index.upsert({ id: 'empty', kind: 'doc', title: 't', text: '   ' });
    expect(chroma.upsert).not.toHaveBeenCalled();
    expect(chroma.deleteByParentId).not.toHaveBeenCalled();
  });

  it('search applies kind metadata filter', async () => {
    chroma.query.mockResolvedValueOnce([
      { id: 'doc:a:0', document: 'snippet', metadata: { parent_id: 'a', kind: 'doc', title: 'A', heading: '' }, distance: 0.1 },
    ]);
    const hits = await index.search({ query: 'q', kind: 'doc', k: 5 });
    expect(chroma.query).toHaveBeenCalledWith(
      expect.objectContaining({ k: 5, where: { kind: 'doc' } })
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].parentId).toBe('a');
  });

  it('search supports multi-kind filter via $in', async () => {
    chroma.query.mockResolvedValueOnce([]);
    await index.search({ query: 'q', kind: ['doc', 'federated'] });
    expect(chroma.query).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kind: { $in: ['doc', 'federated'] } } })
    );
  });
});
