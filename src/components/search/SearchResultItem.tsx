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
      ? <mark key={i} style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
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
        background: isSelected ? '#f0f4ff' : 'transparent',
        borderLeft: isSelected ? '3px solid #005DAA' : '3px solid transparent',
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = isSelected ? '#f0f4ff' : '#f8f9fa'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = isSelected ? '#f0f4ff' : 'transparent'; }}
    >
      <div style={{ flexShrink: 0, color: '#666' }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {highlightMatch(result.title, query)}
        </div>
        {result.description && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            background: '#f0f0f0',
            color: '#666',
          }}
        >
          {value}
        </span>
      ))}
    </div>
  );
}
