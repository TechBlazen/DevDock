// ─── High-level vector index ────────────────────────────────────────────────
// Sits between the routes (which know about docs/federated docs/etc.) and
// the low-level Chroma + Embedder layers. Responsibilities:
//   • chunk long texts before embedding
//   • upsert by stable parent id (replaces prior chunks atomically)
//   • search with the `kind` metadata filter the design specified
//   • content-hash skip — re-embedding the same text is a no-op
//
// Routes never import chromadb or @google/generative-ai directly — only this.

import { createHash } from 'crypto';
import type { Embedder } from '../embeddings/provider.js';
import { ChromaWrapper, type ChromaSearchHit } from './chroma-client.js';
import { chunk } from './chunker.js';

export type ContentKind = 'doc' | 'doc-readme' | 'federated' | 'forum-thread' | 'forum-answer' | 'registry-item';

export interface IndexItem {
  /** Stable id of the parent document (NOT a chunk id). */
  id: string;
  kind: ContentKind;
  title?: string;
  /** Full text to embed. Will be chunked if long. */
  text: string;
  /** Free-form metadata stored alongside each chunk. */
  metadata?: Record<string, string | number | boolean>;
}

export interface SearchHit {
  parentId: string;
  kind: ContentKind;
  title: string;
  /** The chunk text that matched. */
  snippet: string;
  /** Section heading the chunk came from, if any. */
  heading: string | null;
  metadata: Record<string, string | number | boolean>;
  /** Cosine distance — lower is more similar. */
  distance: number;
}

export class VectorIndex {
  // Track content hash per parent id so re-embedding the same text is a no-op.
  // A real impl would store this in the DB; in-memory is fine for v1 — a
  // server restart just re-embeds, which is idempotent.
  private hashes = new Map<string, string>();

  constructor(
    private chroma: ChromaWrapper,
    private embedder: Embedder,
  ) {}

  async upsert(item: IndexItem): Promise<void> {
    const text = item.text.trim();
    if (!text) return;

    const fingerprint = hashContent(text, this.embedder.name);
    if (this.hashes.get(item.id) === fingerprint) {
      return; // unchanged since last upsert
    }

    const chunks = chunk(text, item.title);
    if (chunks.length === 0) return;

    const embeddings = await this.embedder.embedBatch(chunks.map((c) => c.text));

    // Replace any prior chunks for this parent so deletions / shrinks work.
    await this.chroma.deleteByParentId(item.id);

    await this.chroma.upsert(
      chunks.map((c, i) => ({
        id: `${item.kind}:${item.id}:${c.index}`,
        embedding: embeddings[i],
        document: c.text,
        metadata: {
          parent_id: item.id,
          kind: item.kind,
          title: item.title ?? '',
          heading: c.heading ?? '',
          chunk_index: c.index,
          ...(item.metadata ?? {}),
        },
      }))
    );

    this.hashes.set(item.id, fingerprint);
  }

  async delete(parentId: string): Promise<void> {
    await this.chroma.deleteByParentId(parentId);
    this.hashes.delete(parentId);
  }

  async search(opts: {
    query: string;
    kind?: ContentKind | ContentKind[];
    k?: number;
  }): Promise<SearchHit[]> {
    const k = opts.k ?? 10;
    const embedding = await this.embedder.embed(opts.query);

    const where = opts.kind
      ? Array.isArray(opts.kind)
        ? { kind: { $in: opts.kind } }
        : { kind: opts.kind }
      : undefined;

    const hits = await this.chroma.query({ embedding, k, where: where as never });
    return hits.map(hitToSearchHit);
  }
}

function hitToSearchHit(h: ChromaSearchHit): SearchHit {
  return {
    parentId: String(h.metadata.parent_id ?? ''),
    kind: (h.metadata.kind ?? 'doc') as ContentKind,
    title: String(h.metadata.title ?? ''),
    snippet: h.document,
    heading: h.metadata.heading ? String(h.metadata.heading) : null,
    metadata: h.metadata,
    distance: h.distance,
  };
}

function hashContent(text: string, modelName: string): string {
  return createHash('sha256').update(`${modelName}:${text}`).digest('hex');
}
