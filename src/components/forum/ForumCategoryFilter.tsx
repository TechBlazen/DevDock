import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const allTags = [...DEPARTMENTS, ...TECHNOLOGIES].sort();

  return (
    <div className="flex flex-col gap-3">
      {/* Category pills */}
      <div className="flex items-center gap-2 flex-wrap" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => onCategoryChange(null)}
          className="font-semibold transition-all duration-200 cursor-pointer"
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 12,
            background: activeCategory === null ? 'var(--accent)' : 'var(--bg-surface)',
            color: activeCategory === null ? '#ffffff' : 'var(--text-muted)',
            border: `1px solid ${activeCategory === null ? 'var(--accent)' : 'var(--border-color)'}`,
          }}
          onMouseEnter={(e) => { if (activeCategory !== null) e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={(e) => { if (activeCategory !== null) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          All
        </button>
        {FORUM_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className="font-semibold transition-all duration-200 cursor-pointer"
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 12,
                background: active ? cat.color : 'var(--bg-surface)',
                color: active ? '#ffffff' : 'var(--text-muted)',
                border: `1px solid ${active ? cat.color : 'var(--border-color)'}`,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = cat.color; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              {cat.label}
            </button>
          );
        })}
        {/* Feature Request pseudo-category */}
        <button
          onClick={() => navigate('/forum/feature-requests')}
          className="font-semibold transition-all duration-200 cursor-pointer"
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 12,
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          Feature Request
        </button>
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
