import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Embedder } from './provider.js';

// Gemini's text-embedding-004 model:
//   • 768-dimensional vectors
//   • Free tier: 1500 RPM (way more than this app needs)
//   • Max input: ~2048 tokens per call (~8KB of text)
//   • Batch endpoint accepts up to 100 inputs per call
// We keep batches at 25 to stay well below quota and keep retries cheap.
const MODEL = 'text-embedding-004';
const BATCH_SIZE = 25;
export const GEMINI_DIMENSIONS = 768;

export class GeminiEmbedder implements Embedder {
  readonly name = 'gemini-text-embedding-004';
  readonly dimensions = GEMINI_DIMENSIONS;

  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        'Gemini API key required for embedder. Set GEMINI_API_KEY or configure in app settings.'
      );
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const model = this.client.getGenerativeModel({ model: MODEL });
    const out: number[][] = [];

    // batchEmbedContents accepts up to 100; chunk to BATCH_SIZE for cheaper retries.
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const chunk = texts.slice(i, i + BATCH_SIZE);
      const result = await model.batchEmbedContents({
        requests: chunk.map((text) => ({
          content: { role: 'user', parts: [{ text }] },
        })),
      });
      for (const e of result.embeddings) out.push(e.values);
    }
    return out;
  }
}
