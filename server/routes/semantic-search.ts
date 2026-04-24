import type { FastifyInstance } from 'fastify';
import { authGuard } from '../middleware/auth.js';
import type { VectorRuntime } from '../vector/runtime.js';
import type { ContentKind } from '../vector/index.js';

const VALID_KINDS: ReadonlySet<ContentKind> = new Set([
  'doc', 'doc-readme', 'federated', 'forum-thread', 'forum-answer',
]);

export function registerSemanticSearchRoutes(
  app: FastifyInstance,
  jwtSecret: string,
  vector: VectorRuntime,
) {
  const guard = authGuard(jwtSecret);

  app.post('/api/search/semantic', { preHandler: guard }, async (request, reply) => {
    if (!vector.enabled || !vector.search) {
      return reply.status(503).send({
        error: 'Semantic search is not configured. Set GEMINI_API_KEY and ensure ChromaDB is reachable.',
      });
    }

    const body = request.body as { query?: string; kind?: string | string[]; k?: number };
    const query = (body.query ?? '').trim();
    if (!query) {
      return reply.status(400).send({ error: 'query required' });
    }

    const kind = normaliseKind(body.kind);
    const k = Math.min(Math.max(Number(body.k ?? 10), 1), 50);

    const hits = await vector.search({ query, kind, k });
    return { hits };
  });
}

function normaliseKind(raw: unknown): ContentKind | ContentKind[] | undefined {
  if (!raw) return undefined;
  const input = Array.isArray(raw) ? raw : [raw];
  const kinds = input
    .map((s) => String(s) as ContentKind)
    .filter((s) => VALID_KINDS.has(s));
  if (kinds.length === 0) return undefined;
  return kinds.length === 1 ? kinds[0] : kinds;
}
