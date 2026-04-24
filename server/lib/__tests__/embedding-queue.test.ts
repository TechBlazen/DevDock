import { describe, expect, it } from 'vitest';
import { EmbeddingQueue } from '../embedding-queue.js';

describe('EmbeddingQueue', () => {
  it('runs jobs serially in order', async () => {
    const q = new EmbeddingQueue();
    const order: number[] = [];
    q.enqueue('a', async () => { await wait(10); order.push(1); });
    q.enqueue('b', async () => { await wait(1); order.push(2); });
    q.enqueue('c', async () => { order.push(3); });
    await q.drain();
    expect(order).toEqual([1, 2, 3]);
  });

  it('continues after a job throws', async () => {
    const q = new EmbeddingQueue();
    const order: string[] = [];
    q.enqueue('boom', async () => { throw new Error('boom'); });
    q.enqueue('after', async () => { order.push('after'); });
    await q.drain();
    expect(order).toEqual(['after']);
  });

  it('exposes pending count', async () => {
    const q = new EmbeddingQueue();
    // Build a deferred so the job's promise is created up-front (not inside
    // an executor that only runs once the previous tail resolves), letting us
    // hold the queue and resolve at will.
    let resolve!: () => void;
    const blocker = new Promise<void>((r) => { resolve = r; });
    q.enqueue('hold', () => blocker);
    expect(q.pending).toBe(1);
    resolve();
    await q.drain();
    expect(q.pending).toBe(0);
  });
});

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
