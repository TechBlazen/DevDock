import type { SearchResult, SearchCategory } from '../../lib/search/types';
import { SearchResultItem } from './SearchResultItem';

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  'repository': 'Repositories',
  'mcp-server': 'MCP Servers',
  'doc': 'Documentation',
  'plugin': 'Plugins',
  'scaffold-agent': 'Scaffold Agents',
  'gallery': 'Agents & Skills',
  'telemetry': 'Telemetry',
  'activity': 'Activity',
  'forum': 'Forum',
  'federated': 'External Sources',
};

interface Props {
  category: SearchCategory;
  results: SearchResult[];
  query: string;
  selectedId: string | null;
  onSelect: (result: SearchResult) => void;
}

export function SearchResultGroup({ category, results, query, selectedId, onSelect }: Props) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        padding: '8px 16px 4px',
      }}>
        {CATEGORY_LABELS[category]} ({results.length})
      </div>
      {results.map((result) => (
        <SearchResultItem
          key={result.id}
          result={result}
          query={query}
          isSelected={result.id === selectedId}
          onClick={() => onSelect(result)}
        />
      ))}
    </div>
  );
}
