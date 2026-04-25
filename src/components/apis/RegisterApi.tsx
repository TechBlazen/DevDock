import { useState } from 'react';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import { Button, Input } from '../ui';
import { useApiStore, type DiscoveryResult } from '../../store/api-store';
import { useRepoStore } from '../../store';
import type { Repository } from '../../types';

type Tab = 'url' | 'repo';

export const RegisterApi = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('url');

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={13} /> Add API
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl w-full max-w-xl flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Add API</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
              {(['url', 'repo'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-2 text-[12px] font-semibold transition-colors"
                  style={{
                    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                >
                  {t === 'url' ? 'From URL' : 'Discover from Repo'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'url' ? <UrlForm onDone={() => setOpen(false)} /> : <RepoDiscoverForm onDone={() => setOpen(false)} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const UrlForm = ({ onDone }: { onDone: () => void }) => {
  const addApiByUrl = useApiStore((s) => s.addApiByUrl);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const created = await addApiByUrl(url);
    setBusy(false);
    if (!created) {
      setError(useApiStore.getState().syncError || 'Failed to add API');
      return;
    }
    onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Spec URL"
        placeholder="https://example.com/openapi.yaml"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Paste a direct link to an OpenAPI 3.x or Swagger 2 spec (YAML or JSON).
      </p>
      {error && (
        <div className="text-[12px] px-3 py-2 rounded" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={busy}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={busy || !url.trim()}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          {busy ? 'Fetching...' : 'Add API'}
        </Button>
      </div>
    </div>
  );
};

const RepoDiscoverForm = ({ onDone }: { onDone: () => void }) => {
  const { githubRepos, adoRepos } = useRepoStore();
  const discoverFromRepo = useApiStore((s) => s.discoverFromRepo);
  const allRepos: Repository[] = [...githubRepos, ...adoRepos];

  const [selectedId, setSelectedId] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  const filtered = allRepos.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()));

  const run = async () => {
    const repo = allRepos.find((r) => r.id === selectedId);
    if (!repo) return;
    setBusy(true);
    const res = await discoverFromRepo(repo);
    setBusy(false);
    setResult(res);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Repository</label>
        <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter repos..."
            className="bg-transparent border-none outline-none text-[12px] flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="max-h-48 overflow-y-auto rounded mt-1" style={{ border: '1px solid var(--border-subtle)' }}>
          {filtered.length === 0 ? (
            <div className="text-[12px] px-3 py-2" style={{ color: 'var(--text-muted)' }}>No repos. Connect GitHub/ADO in Settings first.</div>
          ) : filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between"
              style={{
                background: selectedId === r.id ? 'var(--accent-bg)' : 'transparent',
                color: selectedId === r.id ? 'var(--accent)' : 'var(--text-primary)',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              <span className="truncate">{r.fullName || r.name}</span>
              <span className="text-[10px] uppercase" style={{ color: 'var(--text-faint)' }}>{r.source}</span>
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="text-[12px] px-3 py-2 rounded flex flex-col gap-1" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-primary)' }}>
            <strong>{result.imported.length}</strong> imported
            {result.skipped.length > 0 && <> · <strong>{result.skipped.length}</strong> skipped</>}
          </div>
          {result.skipped.slice(0, 5).map((s, i) => (
            <div key={i} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-mono">{s.path}</span> — {s.reason}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={busy}>Close</Button>
        <Button variant="primary" size="sm" onClick={run} disabled={busy || !selectedId}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          {busy ? 'Discovering...' : 'Discover Specs'}
        </Button>
      </div>
    </div>
  );
};
