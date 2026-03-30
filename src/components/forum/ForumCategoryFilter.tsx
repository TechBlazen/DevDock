import { FORUM_CATEGORIES, DEPARTMENTS, TECHNOLOGIES } from '../../lib/forum-constants';
import type { ForumCategory } from '../../types';

interface ForumCategoryFilterProps {
  activeCategory: ForumCategory | null;
  onCategoryChange: (v: ForumCategory | null) => void;
  activeTag: string | null;
  onTagChange: (v: string | null) => void;
}

export const ForumCategoryFilter = ({
  activeCategory,
  onCategoryChange,
  activeTag,
  onTagChange,
}: ForumCategoryFilterProps) => {
  const allTags = [...DEPARTMENTS, ...TECHNOLOGIES].sort();

  return (
    <div className="flex flex-col gap-2">
      {/* Category pills */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onCategoryChange(null)}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: activeCategory === null ? 'var(--accent-bg)' : 'transparent',
            color: activeCategory === null ? 'var(--accent)' : 'var(--text-faint)',
            border: 'none',
          }}
        >
          All
        </button>
        {FORUM_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer"
              style={{
                background: active ? `${cat.color}18` : 'transparent',
                color: active ? cat.color : 'var(--text-faint)',
                border: 'none',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Tag dropdown */}
      <select
        value={activeTag ?? ''}
        onChange={(e) => onTagChange(e.target.value || null)}
        className="rounded-md px-2.5 py-1.5 text-[12px] outline-none transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-input)',
          color: 'var(--text-primary)',
          maxWidth: 200,
        }}
      >
        <option value="">All tags</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>
    </div>
  );
};
