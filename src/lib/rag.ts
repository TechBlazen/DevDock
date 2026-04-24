// ─── RAG helper for chat ────────────────────────────────────────────────────
// ChatPanel calls fetchDocsContext() before each send. It queries the server's
// semantic-search endpoint, formats the top hits into a short context block
// the LLM can reference, and returns the citations so the UI can show the
// user exactly which docs were in scope.
//
// Failures are non-fatal by design — chat should still work if retrieval
// errors or the server has no vector runtime configured.

import { semanticSearchApi, type SemanticHit } from './api';
import type { RagCitation } from '../types';

export interface DocsContext {
  /** The system-prompt addition the chat should inject. */
  contextPrompt: string;
  /** What the LLM saw, for UI citation. */
  citations: RagCitation[];
}

/** Number of chunks to retrieve per query. Each chunk ≤ 500 words (~375 tokens
 *  for English) so 5 × 500 = 2.5K words of context — well under every
 *  provider's prompt budget. */
const DEFAULT_K = 5;

/**
 * Retrieve the top-k relevant doc chunks for a query and format them as a
 * system-prompt context block. Returns null when:
 *   • retrieval throws (server down, 503 = vector disabled, etc.)
 *   • the server returns no hits (empty index or no semantic match)
 *
 * The caller (ChatPanel) treats null as "proceed without RAG" — RAG is always
 * best-effort.
 */
export async function fetchDocsContext(
  query: string,
  k: number = DEFAULT_K,
): Promise<DocsContext | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  let hits: SemanticHit[];
  try {
    hits = await semanticSearchApi.search(trimmed, { k });
  } catch {
    return null;
  }
  if (hits.length === 0) return null;

  const contextPrompt = formatContextPrompt(hits);
  const citations = hitsToCitations(hits);
  return { contextPrompt, citations };
}

/**
 * Build the system-prompt addendum. Layout:
 *
 *   You have access to the following documents from the user's DevDock
 *   instance. Use them when they help answer the question. If they don't,
 *   answer normally without inventing citations.
 *
 *   [Doc 1 — Title]  (optional heading)
 *   <snippet>
 *
 *   [Doc 2 — Title]
 *   <snippet>
 *   ...
 */
export function formatContextPrompt(hits: SemanticHit[]): string {
  const header = [
    'The user has opted in to "Use my docs" for this reply. Relevant excerpts from their DevDock documents are included below. Use them when they help answer the question. If they do not, answer from general knowledge without inventing citations.',
  ].join('\n');

  const blocks = hits.map((h, i) => {
    const label = h.heading ? `${h.title} — ${h.heading}` : h.title || '(untitled)';
    return `[Doc ${i + 1} — ${label}]\n${h.snippet.trim()}`;
  });

  return [header, '', ...blocks].join('\n\n');
}

/** Deduplicate hits by parentId so we don't render the same doc twice in the
 *  citation list when multiple chunks of the same doc matched. */
export function hitsToCitations(hits: SemanticHit[]): RagCitation[] {
  const seen = new Set<string>();
  const out: RagCitation[] = [];
  for (const h of hits) {
    if (seen.has(h.parentId)) continue;
    seen.add(h.parentId);
    const url = typeof h.metadata.url === 'string' ? h.metadata.url
      : typeof h.metadata.source_url === 'string' ? h.metadata.source_url
      : undefined;
    out.push({ parentId: h.parentId, kind: h.kind, title: h.title, url });
  }
  return out;
}
