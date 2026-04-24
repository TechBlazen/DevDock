// ─── Embedder abstraction ───────────────────────────────────────────────────
// Single seam between the app and whoever computes embeddings (Gemini today,
// possibly OpenAI / a local model tomorrow). Keep this interface narrow on
// purpose — the higher-level vector index sits on top.

export interface Embedder {
  /** Human-readable provider name, used in logs and metadata. */
  readonly name: string;
  /** Vector dimensionality this embedder produces. */
  readonly dimensions: number;
  /** Embed a single piece of text. */
  embed(text: string): Promise<number[]>;
  /**
   * Embed many pieces of text in one go. Implementations should batch the
   * underlying API calls when possible — otherwise this just does N parallel
   * single calls.
   */
  embedBatch(texts: string[]): Promise<number[][]>;
}
