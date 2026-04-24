// End-to-end test against a real ChromaDB server. Gated by TEST_CHROMA_URL
// because most contributors won't have one running. Bring up via:
//
//   docker compose -f docker-compose.test.yml up -d chroma-test
//   TEST_CHROMA_URL=http://localhost:8001 npm run test:server
//
// Uses the FakeEmbedder so this test doesn't need a Gemini key — it still
// exercises the full Chroma round-trip (upsert, query with metadata filter,
// delete) which is what we actually want to verify here.

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ChromaWrapper } from '../chroma-client.js';
import { VectorIndex } from '../index.js';
import { FakeEmbedder } from '../../embeddings/fake.js';

const TEST_URL = process.env.TEST_CHROMA_URL;
const describeIfChroma = TEST_URL ? describe : describe.skip;

describeIfChroma('VectorIndex against real Chroma', () => {
  let chroma: ChromaWrapper;
  let index: VectorIndex;

  beforeAll(async () => {
    chroma = new ChromaWrapper(TEST_URL!);
    await chroma.reset();
    index = new VectorIndex(chroma, new FakeEmbedder());
  });

  afterEach(async () => {
    await chroma.reset();
    // Re-create index so the in-memory hash cache is cleared between tests.
    index = new VectorIndex(chroma, new FakeEmbedder());
  });

  afterAll(async () => {
    if (chroma) await chroma.reset();
  });

  it('round-trips an upsert + search', async () => {
    await index.upsert({
      id: 'd1',
      kind: 'doc',
      title: 'Setup guide',
      text: 'How to install and configure DevDock locally.',
    });
    const hits = await index.search({ query: 'install DevDock locally', k: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].parentId).toBe('d1');
    expect(hits[0].kind).toBe('doc');
    expect(hits[0].title).toBe('Setup guide');
  });

  it('filters by kind metadata', async () => {
    await index.upsert({ id: 'd1', kind: 'doc', title: 'A', text: 'first body content' });
    await index.upsert({ id: 'f1', kind: 'federated', title: 'B', text: 'second body content' });

    const docHits = await index.search({ query: 'body', kind: 'doc', k: 10 });
    expect(docHits.every((h) => h.kind === 'doc')).toBe(true);

    const fedHits = await index.search({ query: 'body', kind: 'federated', k: 10 });
    expect(fedHits.every((h) => h.kind === 'federated')).toBe(true);

    const eitherHits = await index.search({ query: 'body', kind: ['doc', 'federated'], k: 10 });
    expect(eitherHits.length).toBeGreaterThanOrEqual(2);
  });

  it('delete removes all chunks for a parent', async () => {
    const big = Array(1500).fill('word').join(' ');
    await index.upsert({ id: 'long', kind: 'doc', title: 'Long', text: big });

    const before = await index.search({ query: 'word', kind: 'doc', k: 50 });
    expect(before.length).toBeGreaterThan(1);

    await index.delete('long');
    const after = await index.search({ query: 'word', kind: 'doc', k: 50 });
    expect(after.filter((h) => h.parentId === 'long')).toEqual([]);
  });
});
