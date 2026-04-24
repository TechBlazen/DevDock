// ─── Background indexing queue ──────────────────────────────────────────────
// Routes shouldn't block on the embedder + Chroma round-trip — that adds 100s
// of ms to every doc write. Instead they call into this queue, which runs
// jobs serially in the background. Failures are logged, swallowed, and don't
// affect the route response (the relational DB is still the source of truth).
//
// In-process Promise chain — no Redis, no workers. Sufficient for the write
// volumes this app sees. If a job dies in flight (server crash) the parent
// row in the DB is still correct; a future periodic reconcile job (out of
// scope for v1) can re-index drifted entries.

type Job = () => Promise<void>;

export class EmbeddingQueue {
  private tail: Promise<void> = Promise.resolve();
  private inFlight = 0;

  /** Enqueue a job. Returns immediately. The job runs after all prior ones. */
  enqueue(label: string, job: Job): void {
    this.inFlight++;
    this.tail = this.tail
      .then(() => job())
      .catch((err) => {
        console.warn(`[embedding-queue] ${label} failed:`, err instanceof Error ? err.message : err);
      })
      .finally(() => {
        this.inFlight--;
      });
  }

  /** For tests: wait until all queued jobs (current + future) settle. */
  async drain(): Promise<void> {
    // Tail is the latest job; awaiting it covers everything enqueued so far.
    await this.tail;
  }

  get pending(): number {
    return this.inFlight;
  }
}
