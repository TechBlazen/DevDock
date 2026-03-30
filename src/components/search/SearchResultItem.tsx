import {
  GitFork, GitBranch, Cpu, FileText, Puzzle, Hammer, Activity, Zap,
} from 'lucide-react';
import type { SearchResult } from '../../lib/search/types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  GitFork, GitBranch, Cpu, FileText, Puzzle, Hammer, Activity, Zap,
};

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
      : part
  );
}

interface Props {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}

export function SearchResultItem({ result, query, isSelected, onClick }: Props) {
  const Icon = ICON_MAP[result.icon ?? ''] ?? Activity;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent-bg)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = isSelected ? 'var(--accent-bg)' : 'var(--bg-hover)'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = isSelected ? 'var(--accent-bg)' : 'transparent'; }}
    >
      <div style={{ flexShrink: 0, color: 'var(--text-secondary)' }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {highlightMatch(result.title, query)}
        </div>
        {result.description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {highlightMatch(result.description.slice(0, 100), query)}
          </div>
        )}
      </div>
      {result.meta && Object.entries(result.meta).slice(0, 2).map(([key, value]) => (
        <span
          key={key}
          style={{
            flexShrink: 0,
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 9999,
            background: 'var(--bg-inset)',
            color: 'var(--text-secondary)',
          }}
        >
          {value}
        </span>
      ))}
    </div>
  );
}
