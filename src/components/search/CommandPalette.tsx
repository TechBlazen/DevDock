import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSearchStore } from '../../store';
import { useHotkey } from '../../hooks/useHotkey';
import { SearchResultGroup } from './SearchResultGroup';
import type { SearchResult, SearchCategory } from '../../lib/search/types';

const CATEGORIES: { value: SearchCategory | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'repository', label: 'Repos' },
  { value: 'mcp-server', label: 'MCP' },
  { value: 'doc', label: 'Docs' },
  { value: 'plugin', label: 'Plugins' },
  { value: 'scaffold-agent', label: 'Scaffold' },
  { value: 'telemetry', label: 'Telemetry' },
  { value: 'activity', label: 'Activity' },
  { value: 'forum', label: 'Forum' },
  { value: 'federated', label: 'External' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  const isOpen = useSearchStore((s) => s.isOpen);
  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const activeCategory = useSearchStore((s) => s.activeCategory);
  const selectedIndex = useSearchStore((s) => s.selectedIndex);
  const open = useSearchStore((s) => s.open);
  const close = useSearchStore((s) => s.close);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setActiveCategory = useSearchStore((s) => s.setActiveCategory);
  const moveSelection = useSearchStore((s) => s.moveSelection);

  const toggle = useCallback(() => {
    if (isOpen) close(); else open();
  }, [isOpen, open, close]);

  useHotkey('k', 'meta-or-ctrl', toggle);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleInput = useCallback((value: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(value), 150);
  }, [setQuery]);

  const grouped = useMemo(() => {
    const groups: Map<SearchCategory, SearchResult[]> = new Map();
    for (const r of results) {
      const arr = groups.get(r.category) || [];
      arr.push(r);
      groups.set(r.category, arr);
    }
    return groups;
  }, [results]);

  const flatResults = results;

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.url);
    close();
  }, [navigate, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatResults[selectedIndex];
      if (selected) handleSelect(selected);
    }
  }, [close, moveSelection, flatResults, selectedIndex, handleSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[aria-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const selectedId = flatResults[selectedIndex]?.id ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 100,
      }}
      onClick={close}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(2px)' }} />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          background: 'var(--bg-surface)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            defaultValue={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search DevDock..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: 'var(--text-primary)',
              background: 'transparent',
            }}
          />
          <button
            onClick={close}
            style={{
              flexShrink: 0,
              padding: '2px 8px',
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-input)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            ESC
          </button>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setActiveCategory(value)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 9999,
                border: '1px solid',
                borderColor: activeCategory === value ? 'var(--accent)' : 'var(--border-color)',
                background: activeCategory === value ? 'var(--accent-bg)' : 'transparent',
                color: activeCategory === value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div ref={listRef} role="listbox" style={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 && query.trim() && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No results for "{query}"
            </div>
          )}
          {results.length === 0 && !query.trim() && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Start typing to search repos, MCP servers, docs, and more...
            </div>
          )}
          {[...grouped.entries()].map(([category, items]) => (
            <SearchResultGroup
              key={category}
              category={category}
              results={items}
              query={query}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 16,
            padding: '8px 16px',
            borderTop: '1px solid var(--border-color)',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}>
            <span><kbd style={kbdStyle}>↑↓</kbd> Navigate</span>
            <span><kbd style={kbdStyle}>↵</kbd> Open</span>
            <span><kbd style={kbdStyle}>esc</kbd> Close</span>
          </div>
        )}
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  fontSize: 10,
  fontFamily: 'inherit',
  background: 'var(--bg-inset)',
  border: '1px solid var(--border-input)',
  borderRadius: 3,
  marginRight: 4,
};
