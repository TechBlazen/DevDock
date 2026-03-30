import { useState, useMemo } from 'react';
import { Search, RefreshCw, Star } from 'lucide-react';
import { RepoCard } from './RepoCard';
import { RegisterRepo } from './RegisterRepo';
import { useRepoStore, useAuthStore, useUserAccountsStore } from '../../store';
import { EmptyState, Spinner } from '../ui';
import type { RepoSource, RepoEnvironment, CloudPlatform } from '../../types';

const ALL_ENVS: RepoEnvironment[] = ['SBX', 'ADT', 'UAT', 'QAT', 'SPD', 'PRD'];
const ENV_COLORS: Record<RepoEnvironment, string> = {
  SBX: '#3b82f6', ADT: '#0891b2', UAT: '#d97706', QAT: '#ea580c', SPD: '#7c3aed', PRD: '#dc2626',
};

interface RepoListProps {
  source: RepoSource;
  showFilter?: boolean;
}

export const RepoList = ({ source, showFilter = true }: RepoListProps) => {
  const { githubRepos, adoRepos } = useRepoStore();
  const repos = source === 'github' ? githubRepos : adoRepos;
  const user = useAuthStore((s) => s.user);
  const isFavoriteRepo = useUserAccountsStore((s) => s.isFavoriteRepo);

  const [query, setQuery] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [envFilters, setEnvFilters] = useState<RepoEnvironment[]>([]);
  const [cloudFilter, setCloudFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const langs = useMemo(() => [...new Set(repos.map((r) => r.language))].sort(), [repos]);
  const allOwners = useMemo(() => [...new Set(repos.flatMap((r) => r.owners?.map((o) => o.name) ?? []))].sort(), [repos]);
  const allTags = useMemo(() => [...new Set(repos.flatMap((r) => r.customTags ?? []))].sort(), [repos]);

  const filtered = useMemo(() => {
    return repos.filter((r) => {
      const matchesQuery = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.description.toLowerCase().includes(query.toLowerCase());
      const matchesLang = !langFilter || r.language === langFilter;
      const matchesEnv = envFilters.length === 0 || envFilters.some((e) => r.environments?.includes(e));
      const matchesCloud = !cloudFilter || r.cloudPlatform === cloudFilter;
      const matchesOwner = !ownerFilter || r.owners?.some((o) => o.name === ownerFilter);
      const matchesTag = !tagFilter || r.customTags?.includes(tagFilter);
      const matchesFav = !favOnly || (user ? isFavoriteRepo(user.id, r.id) : false);
      return matchesQuery && matchesLang && matchesEnv && matchesCloud && matchesOwner && matchesTag && matchesFav;
    });
  }, [repos, query, langFilter, envFilters, cloudFilter, ownerFilter, tagFilter, favOnly, user, isFavoriteRepo]);

  const toggleEnv = (env: RepoEnvironment) => {
    setEnvFilters((prev) => prev.includes(env) ? prev.filter((e) => e !== env) : [...prev, env]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {showFilter && (
        <div className="flex flex-col gap-2">
          {/* Row 1: Search + Language + Refresh + Register + Count */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <Search size={12} style={{ color: 'var(--text-muted)' }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter repos..." className="bg-transparent border-none outline-none text-xs flex-1" style={{ color: 'var(--text-primary)' }} />
            </div>

            <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              <option value="">All languages</option>
              {langs.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            <select value={cloudFilter} onChange={(e) => setCloudFilter(e.target.value)} className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
              <option value="">All platforms</option>
              {(['Azure', 'GCP', 'AWS', 'On-Prem', 'Other'] as CloudPlatform[]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {allOwners.length > 0 && (
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">All owners</option>
                {allOwners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            {allTags.length > 0 && (
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                <option value="">All tags</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}

            {/* Favorites toggle */}
            <button
              onClick={() => setFavOnly((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: favOnly ? '#f59e0b18' : 'var(--bg-inset)',
                border: `1px solid ${favOnly ? '#f59e0b' : 'var(--border-subtle)'}`,
                color: favOnly ? '#f59e0b' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
              title="Show favorites only"
            >
              <Star size={11} fill={favOnly ? '#f59e0b' : 'none'} /> Favorites
            </button>

            <button onClick={handleRefresh} className="p-1.5 transition-colors" style={{ color: 'var(--text-muted)' }} title="Refresh">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <RegisterRepo source={source} />

            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} / {repos.length} repos
            </span>
          </div>

          {/* Row 2: Environment pills */}
          <div className="flex gap-1.5 items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider mr-1" style={{ color: 'var(--text-faint)' }}>ENV</span>
            {ALL_ENVS.map((env) => {
              const active = envFilters.includes(env);
              return (
                <button key={env} onClick={() => toggleEnv(env)} className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all" style={{
                  background: active ? `${ENV_COLORS[env]}20` : 'transparent',
                  color: active ? ENV_COLORS[env] : 'var(--text-faint)',
                  border: `1px solid ${active ? ENV_COLORS[env] : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                }}>{env}</button>
              );
            })}
          </div>
        </div>
      )}

      {refreshing ? (
        <div className="flex justify-center py-8"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No repos found" body={query ? `No results for "${query}"` : 'Connect your account in Settings to load repos.'} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
        </div>
      )}
    </div>
  );
};
