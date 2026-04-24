import { createHash } from 'crypto';
import type { Embedder } from './provider.js';

/**
 * Deterministic, key-free embedder for unit tests. Hashes the text into a
 * 768-dim float vector so identical inputs always produce identical vectors
 * (and similar inputs produce vectors with high cosine similarity).
 *
 * This is NOT a real semantic embedder — it cannot find related concepts —
 * but it lets us exercise the queue / Chroma round-trip without a Gemini key.
 */
export class FakeEmbedder implements Embedder {
  readonly name = 'fake-deterministic';
  readonly dimensions = 768;

  async embed(text: string): Promise<number[]> {
    return hashToVector(text, this.dimensions);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => hashToVector(t, this.dimensions));
  }
}

function hashToVector(text: string, dim: number): number[] {
  // Generate enough bytes to fill `dim` floats (4 bytes each) by hashing the
  // text repeatedly with an incrementing salt. Each byte is mapped to [-1, 1].
  const bytes: number[] = [];
  let salt = 0;
  while (bytes.length < dim * 4) {
    const h = createHash('sha256').update(`${salt}:${text}`).digest();
    for (const b of h) bytes.push(b);
    salt++;
  }
  const vec: number[] = [];
  for (let i = 0; i < dim; i++) {
    // Map four bytes → one float in [-1, 1] for a passable approximation of
    // a real embedding distribution.
    const b0 = bytes[i * 4];
    const b1 = bytes[i * 4 + 1];
    const b2 = bytes[i * 4 + 2];
    const b3 = bytes[i * 4 + 3];
    const u = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    vec.push((u / 0x7fffffff) - 1);
  }
  return vec;
}
