import { useMemo, useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Repeat } from 'lucide-react';
import { useApiStore, type ApiSpec } from '../store/api-store';
import { ApiCard } from '../components/apis/ApiCard';
import { RegisterApi } from '../components/apis/RegisterApi';
import { ApiDetailPanel } from '../components/apis/ApiDetailPanel';
import { ApiConverter } from '../components/apis/ApiConverter';
import { EmptyState, SectionTitle, Spinner } from '../components/ui';

export const ApisPage = () => {
  const { apis, loadingApis, syncError, loadApis } = useApiStore();
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'openapi' | 'swagger'>('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ApiSpec | null>(null);
  const [showConverter, setShowConverter] = useState(false);

  const filtered = useMemo(() => {
    return apis.filter((a) => {
      const matchesQuery = !query || a.name.toLowerCase().includes(query.toLowerCase()) || a.description.toLowerCase().includes(query.toLowerCase());
      const matchesKind = !kindFilter || a.specKind === kindFilter;
      return matchesQuery && matchesKind;
    });
  }, [apis, query, kindFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApis();
    setRefreshing(false);
  };

  return (
    <div className="p-6">
      <SectionTitle sub="Browse Swagger / OpenAPI specs discovered across your repos">
        APIs
      </SectionTitle>

      <div className="flex flex-col gap-4">
        {syncError && (
          <div
            className="flex items-start gap-2 p-2.5 rounded-lg text-[11px]"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706' }}
          >
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <div><span className="font-semibold">{syncError}</span></div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter APIs..." className="bg-transparent border-none outline-none text-xs flex-1" style={{ color: 'var(--text-primary)' }} />
          </div>

          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)} className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
            <option value="">All specs</option>
            <option value="openapi">OpenAPI 3.x</option>
            <option value="swagger">Swagger 2</option>
          </select>

          <button onClick={handleRefresh} className="p-1.5 transition-colors" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Refresh">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowConverter(!showConverter)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              background: showConverter ? 'var(--accent)' : 'var(--bg-inset)',
              color: showConverter ? 'white' : 'var(--text-primary)',
              border: `1px solid ${showConverter ? 'var(--accent)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
            }}
            title="Toggle API Converter"
          >
            <Repeat size={14} />
            Converter
          </button>

          <RegisterApi />

          <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} / {apis.length} APIs
          </span>
        </div>

        {showConverter ? (
          <ApiConverter />
        ) : loadingApis || refreshing ? (
          <div className="flex justify-center py-8"><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No APIs registered"
            body={query ? `No results for "${query}"` : 'Add a spec by URL or discover them from one of your registered repos.'}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((api) => <ApiCard key={api.id} api={api} onSelect={setSelected} />)}
          </div>
        )}
      </div>

      {selected && <ApiDetailPanel api={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
