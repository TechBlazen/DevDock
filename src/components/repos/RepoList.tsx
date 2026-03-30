import { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { RepoCard } from './RepoCard';
import { RegisterRepo } from './RegisterRepo';
import { useRepoStore } from '../../store';
import { EmptyState, Spinner } from '../ui';
import type { RepoSource } from '../../types';

interface RepoListProps {
  source: RepoSource;
  showFilter?: boolean;
}

export const RepoList = ({ source, showFilter = true }: RepoListProps) => {
  const { githubRepos, adoRepos } = useRepoStore();
  const repos = source === 'github' ? githubRepos : adoRepos;
  const [query, setQuery] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const langs = useMemo(() => [...new Set(repos.map((r) => r.language))].sort(), [repos]);

  const filtered = useMemo(() => {
    return repos.filter((r) => {
      const matchesQuery =
        !query ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase());
      const matchesLang = !langFilter || r.language === langFilter;
      return matchesQuery && matchesLang;
    });
  }, [repos, query, langFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {showFilter && (
        <div className="flex gap-2 flex-wrap items-center">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-xs" style={{
            background: 'rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <Search size={12} style={{ color: 'rgba(0, 0, 0, 0.4)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter repos..."
              className="bg-transparent border-none outline-none text-xs flex-1"
              style={{ color: 'rgba(0, 0, 0, 0.9)' }}
            />
          </div>

          {/* Language filter */}
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              color: 'rgba(0, 0, 0, 0.8)'
            }}
          >
            <option value="">All languages</option>
            {langs.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-[#3a4a6a] hover:text-[#2a6fff] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <RegisterRepo source={source} />

          <span className="text-xs text-[#2a3a5a] font-mono ml-auto">
            {filtered.length} / {repos.length} repos
          </span>
        </div>
      )}

      {refreshing ? (
        <div className="flex justify-center py-8">
          <Spinner size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No repos found"
          body={query ? `No results for "${query}"` : 'Connect your account in Settings to load repos.'}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
};
