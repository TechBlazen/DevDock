import { describe, it, expect } from 'vitest';
import { aggregateGalleryItems, filterGalleryItems } from '../../lib/gallery-adapters';
import { REGISTRY_SEED } from '../../lib/registry-seed';
import { SCAFFOLD_AGENTS } from '../../lib/scaffold-agents';
import type { BuilderItem, GalleryItem } from '../../types';

const builderItem = (over: Partial<BuilderItem> = {}): BuilderItem => ({
  id: 'b1',
  userId: 'u1',
  type: 'skill',
  name: 'My Skill',
  description: 'A custom skill',
  content: '---\nname: my-skill\n---\nbody',
  mockConversation: [],
  tags: ['custom'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...over,
});

describe('gallery-adapters / aggregateGalleryItems', () => {
  it('combines seed + scaffold + builder items', () => {
    const items = aggregateGalleryItems([builderItem()], 'u1');
    expect(items.length).toBe(REGISTRY_SEED.length + SCAFFOLD_AGENTS.length + 1);
  });

  it('marks the current user’s builder items as "mine" and others as "org"', () => {
    const mine = aggregateGalleryItems([builderItem({ id: 'a', userId: 'u1' })], 'u1').find((i) => i.id === 'builder:a');
    const theirs = aggregateGalleryItems([builderItem({ id: 'b', userId: 'u2' })], 'u1').find((i) => i.id === 'builder:b');
    expect(mine?.source).toBe('mine');
    expect(theirs?.source).toBe('org');
  });

  it('maps builder type to gallery kind', () => {
    const agent = aggregateGalleryItems([builderItem({ id: 'c', type: 'agent' })], 'u1').find((i) => i.id === 'builder:c');
    expect(agent?.kind).toBe('agent');
  });
});

describe('gallery-adapters / filterGalleryItems', () => {
  const items: GalleryItem[] = [
    { id: '1', kind: 'agent', name: 'Alpha', description: 'k8s diagnostics', source: 'official', tags: ['Kubernetes'], installCount: 10, updatedAt: '2026-01-03' },
    { id: '2', kind: 'skill', name: 'Bravo', description: 'review prs', source: 'mine', tags: ['git'], installCount: 50, updatedAt: '2026-01-01' },
    { id: '3', kind: 'skill', name: 'Charlie', description: 'openapi author', source: 'community', tags: ['API'], installCount: 30, updatedAt: '2026-01-02' },
  ];

  it('filters by kind', () => {
    const r = filterGalleryItems(items, { kind: 'skill', source: 'all', query: '', sort: 'name' });
    expect(r.map((i) => i.id)).toEqual(['2', '3']);
  });

  it('filters by source bucket', () => {
    const r = filterGalleryItems(items, { kind: 'all', source: 'mine', query: '', sort: 'name' });
    expect(r.map((i) => i.id)).toEqual(['2']);
  });

  it('searches name, description, and tags case-insensitively', () => {
    expect(filterGalleryItems(items, { kind: 'all', source: 'all', query: 'KUBERNETES', sort: 'name' }).map((i) => i.id)).toEqual(['1']);
    expect(filterGalleryItems(items, { kind: 'all', source: 'all', query: 'openapi', sort: 'name' }).map((i) => i.id)).toEqual(['3']);
  });

  it('sorts by popularity (install count desc)', () => {
    const r = filterGalleryItems(items, { kind: 'all', source: 'all', query: '', sort: 'popular' });
    expect(r.map((i) => i.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by name and recent', () => {
    expect(filterGalleryItems(items, { kind: 'all', source: 'all', query: '', sort: 'name' }).map((i) => i.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(filterGalleryItems(items, { kind: 'all', source: 'all', query: '', sort: 'recent' }).map((i) => i.id)).toEqual(['1', '3', '2']);
  });
});
