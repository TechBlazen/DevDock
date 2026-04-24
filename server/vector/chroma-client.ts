// Direct Chroma HTTP client.
//
// We previously used the `chromadb` npm package, but its 3.x client requires
// a fully-shaped EmbeddingFunction object (with a `_type` discriminator the
// server validates) even when you always pass `embeddings:` yourself. Calling
// the small REST surface directly is simpler and more durable across Chroma
// versions.
//
// Tested against chromadb 0.5.x. The v2 API (/api/v2/...) is stable.

const COLLECTION_NAME = 'devdock_content';
// Tenant + database are required by Chroma v2. `default_tenant`/`default_database`
// are auto-created by the server on startup, so we don't need to provision.
const TENANT = 'default_tenant';
const DATABASE = 'default_database';

export type Where = Record<string, unknown>;

export interface ChromaItem {
  /** Chunk id — typically `<kind>:<doc-id>:<chunk-index>`. Unique per chunk. */
  id: string;
  embedding: number[];
  document: string;
  metadata: Record<string, string | number | boolean>;
}

export interface ChromaSearchHit {
  id: string;
  document: string;
  metadata: Record<string, string | number | boolean>;
  /** Cosine distance from the query — lower is more similar. */
  distance: number;
}

export class ChromaWrapper {
  private baseUrl: string;
  private collectionId: string | null = null;
  private getCollectionPromise: Promise<string> | null = null;

  constructor(host: string) {
    const url = host.startsWith('http') ? host : `http://${host}`;
    this.baseUrl = url.replace(/\/$/, '');
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Chroma ${path} → ${res.status}: ${body || res.statusText}`);
    }
    // Some endpoints return 204 / empty body; guard against that.
    const text = await res.text();
    return (text ? JSON.parse(text) : (undefined as T));
  }

  /** Resolve the collection id, creating the collection on first call. */
  private async getCollectionId(): Promise<string> {
    if (this.collectionId) return this.collectionId;
    if (this.getCollectionPromise) return this.getCollectionPromise;
    this.getCollectionPromise = (async () => {
      const created = await this.fetchJson<{ id: string }>(
        `/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: COLLECTION_NAME,
            // get_or_create=true → idempotent: returns the existing collection
            // if one with this name already exists.
            get_or_create: true,
            // Omit `configuration` so Chroma uses its default HNSW + l2.
            // Adding a custom block requires sending the server's internal
            // `_type` discriminators, which are version-specific. For semantic
            // search over text-embedding-004 vectors, l2 distance is fine —
            // the relative ordering is what matters for ranking.
          }),
        },
      );
      this.collectionId = created.id;
      return created.id;
    })();
    try {
      return await this.getCollectionPromise;
    } finally {
      this.getCollectionPromise = null;
    }
  }

  async upsert(items: ChromaItem[]): Promise<void> {
    if (items.length === 0) return;
    const id = await this.getCollectionId();
    await this.fetchJson(
      `/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${id}/upsert`,
      {
        method: 'POST',
        body: JSON.stringify({
          ids: items.map((i) => i.id),
          embeddings: items.map((i) => i.embedding),
          documents: items.map((i) => i.document),
          metadatas: items.map((i) => i.metadata),
        }),
      },
    );
  }

  /** Delete every chunk belonging to a parent document. */
  async deleteByParentId(parentId: string): Promise<void> {
    const id = await this.getCollectionId();
    await this.fetchJson(
      `/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${id}/delete`,
      {
        method: 'POST',
        body: JSON.stringify({ where: { parent_id: parentId } }),
      },
    );
  }

  /** Delete by full chunk id. */
  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const id = await this.getCollectionId();
    await this.fetchJson(
      `/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${id}/delete`,
      { method: 'POST', body: JSON.stringify({ ids }) },
    );
  }

  async query(opts: {
    embedding: number[];
    k: number;
    where?: Where;
  }): Promise<ChromaSearchHit[]> {
    const id = await this.getCollectionId();
    const body: Record<string, unknown> = {
      query_embeddings: [opts.embedding],
      n_results: opts.k,
      include: ['documents', 'metadatas', 'distances'],
    };
    if (opts.where) body.where = opts.where;
    const res = await this.fetchJson<{
      ids: string[][];
      documents: (string | null)[][];
      metadatas: (Record<string, string | number | boolean> | null)[][];
      distances: number[][];
    }>(
      `/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${id}/query`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    const ids = res.ids[0] ?? [];
    const docs = res.documents?.[0] ?? [];
    const metas = res.metadatas?.[0] ?? [];
    const dists = res.distances?.[0] ?? [];
    return ids.map((rid, i) => ({
      id: rid,
      document: docs[i] ?? '',
      metadata: metas[i] ?? {},
      distance: dists[i] ?? Number.POSITIVE_INFINITY,
    }));
  }

  /** For tests: drop the entire collection so the next test starts clean. */
  async reset(): Promise<void> {
    try {
      await this.fetchJson(
        `/api/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${COLLECTION_NAME}`,
        { method: 'DELETE' },
      );
    } catch {
      // collection may not exist yet — fine.
    }
    this.collectionId = null;
    this.getCollectionPromise = null;
  }
}
