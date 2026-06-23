import { useMemo, useState } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import { EmptyState } from '../ui';
import { GalleryCard } from './GalleryCard';
import { GalleryDetailDrawer } from './GalleryDetailDrawer';
import { filterGalleryItems } from '../../lib/gallery-adapters';
import type {
  GalleryKindFilter, GallerySourceFilter, GallerySort,
} from '../../lib/gallery-adapters';
import type { GalleryItem } from '../../types';

const KIND_TABS: { value: GalleryKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'agent', label: 'Agents' },
  { value: 'skill', label: 'Skills' },
];

const SOURCE_TABS: { value: GallerySourceFilter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'official', label: 'Featured' },
  { value: 'org', label: 'Org' },
  { value: 'mine', label: 'Mine' },
  { value: 'community', label: 'Community' },
];

const SORTS: { value: GallerySort; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recent' },
];

interface GalleryGridProps {
  items: GalleryItem[];
}

export const GalleryGrid = ({ items }: GalleryGridProps) => {
  const [kind, setKind] = useState<GalleryKindFilter>('all');
  const [source, setSource] = useState<GallerySourceFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<GallerySort>('popular');
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  const filtered = useMemo(
    () => filterGalleryItems(items, { kind, source, query, sort }),
    [items, kind, source, query, sort],
  );

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Kind segmented control */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          {KIND_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setKind(t.value)}
              className="text-[11px] font-semibold px-3 py-1 rounded-md transition-colors"
              style={{
                background: kind === t.value ? 'var(--bg-surface)' : 'transparent',
                color: kind === t.value ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[180px]" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <Search size={13} style={{ color: 'var(--text-faint)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents & skills…"
            className="bg-transparent outline-none text-[12px] flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as GallerySort)}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>
      </div>

      {/* Source buckets (Gemini-style) */}
      <div className="flex flex-wrap gap-2">
        {SOURCE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setSource(t.value)}
            className="text-[11px] font-semibold px-3 py-1 rounded-full transition-colors"
            style={{
              background: source === t.value ? 'var(--accent)' : 'var(--bg-inset)',
              color: source === t.value ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<LayoutGrid />} title="Nothing here yet" body="No agents or skills match these filters." />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map((item) => (
            <GalleryCard key={item.id} item={item} onSelect={setSelected} />
          ))}
        </div>
      )}

      <GalleryDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
