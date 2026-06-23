import { useMemo } from 'react';
import type { GalleryItem, ScaffoldAgent, BuilderItem } from '../types';
import { SCAFFOLD_AGENTS } from './scaffold-agents';
import { REGISTRY_SEED } from './registry-seed';
import { useBuilderStore, useAuthStore } from '../store';

// ─── Gallery adapters (Phase 0) ─────────────────────────────────────────────
// The Gallery is a unified view over data DevDock already holds client-side.
// Phase 1 swaps this aggregation for a server-backed registry store, keeping
// the same GalleryItem shape so the UI doesn't change.

/** Scaffold agents → gallery items (official, agent kind). */
function fromScaffold(agents: ScaffoldAgent[]): GalleryItem[] {
  return agents.map((a) => ({
    id: `scaffold:${a.id}`,
    kind: 'agent',
    name: a.name,
    description: a.description,
    source: 'official',
    category: 'Scaffold',
    tags: a.tags,
    author: 'DevDock',
    verified: true,
    icon: a.icon,
    href: '/scaffold',
  }));
}

/** Agent Builder items → gallery items. The current user's are 'mine'; others
 *  authored in this instance are 'org'. */
function fromBuilder(items: BuilderItem[], currentUserId: string | undefined): GalleryItem[] {
  return items.map((i) => ({
    id: `builder:${i.id}`,
    kind: i.type,
    name: i.name,
    description: i.description,
    source: i.userId === currentUserId ? 'mine' : 'org',
    category: 'My Workspace',
    tags: i.tags,
    content: i.content,
    author: i.userId === currentUserId ? 'You' : i.userId,
    icon: i.type === 'skill' ? 'Sparkles' : 'Bot',
    href: '/devtools/agent-builder',
    updatedAt: i.updatedAt,
  }));
}

/** Pure aggregator (seed + scaffold + builder) — shared by the hook and the
 *  search source so both stay in sync without a hook dependency. */
export function aggregateGalleryItems(builderItems: BuilderItem[], userId: string | undefined): GalleryItem[] {
  return [
    ...REGISTRY_SEED,
    ...fromScaffold(SCAFFOLD_AGENTS),
    ...fromBuilder(builderItems, userId),
  ];
}

/** Aggregate all sources into one list (seed + scaffold + builder). */
export function useGalleryItems(): GalleryItem[] {
  const builderItems = useBuilderStore((s) => s.items);
  const userId = useAuthStore((s) => s.user?.id);

  return useMemo(
    () => aggregateGalleryItems(builderItems, userId),
    [builderItems, userId],
  );
}

// ─── Filtering / sorting helpers (pure, unit-testable) ──────────────────────
export type GalleryKindFilter = 'all' | 'agent' | 'skill';
export type GallerySourceFilter = 'all' | 'official' | 'org' | 'mine' | 'community';
export type GallerySort = 'popular' | 'name' | 'recent';

export interface GalleryFilters {
  kind: GalleryKindFilter;
  source: GallerySourceFilter;
  query: string;
  sort: GallerySort;
}

export function filterGalleryItems(items: GalleryItem[], f: GalleryFilters): GalleryItem[] {
  let result = items;

  if (f.kind !== 'all') result = result.filter((i) => i.kind === f.kind);
  if (f.source !== 'all') result = result.filter((i) => i.source === f.source);

  const q = f.query.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)) ||
        (i.category?.toLowerCase().includes(q) ?? false),
    );
  }

  const sorted = [...result];
  switch (f.sort) {
    case 'popular':
      sorted.sort((a, b) => (b.installCount ?? 0) - (a.installCount ?? 0) || (b.score ?? 0) - (a.score ?? 0));
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'recent':
      sorted.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      break;
  }
  return sorted;
}
