// ─── Vector runtime ─────────────────────────────────────────────────────────
// Tiny container that wires the embedder + Chroma + queue together. Created
// once at startup; passed into route registrars so they can enqueue indexing
// work without knowing about the underlying primitives.
//
// When semantic search is disabled (no Gemini key configured), every method
// becomes a no-op. Routes never need to null-check.

import { GeminiEmbedder } from '../embeddings/gemini.js';
import type { Embedder } from '../embeddings/provider.js';
import { ChromaWrapper } from './chroma-client.js';
import { EmbeddingQueue } from '../lib/embedding-queue.js';
import { VectorIndex, type IndexItem } from './index.js';
import type { VectorConfig } from '../config.js';

export interface VectorRuntime {
  enabled: boolean;
  /** Fire-and-forget indexing: returns immediately. */
  enqueueUpsert(item: IndexItem): void;
  enqueueDelete(parentId: string): void;
  /** Synchronous query — used by the semantic-search route. */
  search: VectorIndex['search'] | null;
  /** For tests: wait until the queue drains. */
  drain(): Promise<void>;
}

export function createVectorRuntime(config: VectorConfig, embedder?: Embedder): VectorRuntime {
  if (!config.enabled) return disabledRuntime();

  const embed = embedder ?? new GeminiEmbedder(config.geminiApiKey);
  const chroma = new ChromaWrapper(config.chromaUrl);
  const index = new VectorIndex(chroma, embed);
  const queue = new EmbeddingQueue();

  return {
    enabled: true,
    enqueueUpsert: (item) => queue.enqueue(`upsert ${item.kind}:${item.id}`, () => index.upsert(item)),
    enqueueDelete: (parentId) => queue.enqueue(`delete ${parentId}`, () => index.delete(parentId)),
    search: index.search.bind(index),
    drain: () => queue.drain(),
  };
}

function disabledRuntime(): VectorRuntime {
  return {
    enabled: false,
    enqueueUpsert: () => {},
    enqueueDelete: () => {},
    search: null,
    drain: async () => {},
  };
}
