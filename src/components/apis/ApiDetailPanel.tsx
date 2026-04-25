import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react';
import { parseSpec, type ParsedSpec, type ParsedOperation, type HttpMethod } from '../../lib/openapi';
import type { ApiSpec } from '../../store/api-store';
import { Spinner } from '../ui';
import { OperationTester } from './OperationTester';

interface ApiDetailPanelProps {
  api: ApiSpec;
  onClose: () => void;
}

const METHOD_COLOR: Record<HttpMethod, string> = {
  get: '#005DAA',
  post: '#2e7d32',
  put: '#d97706',
  patch: '#7c3aed',
  delete: '#dc2626',
  head: '#6b7280',
  options: '#6b7280',
};

export const ApiDetailPanel = ({ api, onClose }: ApiDetailPanelProps) => {
  const [parsed, setParsed] = useState<ParsedSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    parseSpec(api.specRaw)
      .then((p) => { if (!cancelled) { setParsed(p); setError(null); } })
      .catch((e) => { if (!cancelled) { setParsed(null); setError(e instanceof Error ? e.message : String(e)); } });
    return () => { cancelled = true; };
  }, [api.specRaw]);

  const grouped = useMemo(() => {
    if (!parsed) return new Map<string, ParsedOperation[]>();
    const q = filter.toLowerCase();
    const filtered = parsed.operations.filter((op) =>
      !q || op.path.toLowerCase().includes(q) || op.summary.toLowerCase().includes(q) || op.operationId.toLowerCase().includes(q),
    );
    const map = new Map<string, ParsedOperation[]>();
    for (const op of filtered) {
      const tag = op.tags[0] ?? 'default';
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(op);
    }
    return map;
  }, [parsed, filter]);

  // Rendered via portal so the panel is anchored to the viewport regardless of
  // any ancestor that creates a containing block for `position: fixed` (the
  // <main> region with `overflow: hidden` chains was clipping it to a sliver).
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={onClose}
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-full overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-color)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{api.name}</h2>
            <div className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{api.baseUrl || api.sourceUrl}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {api.description && (
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{api.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>Spec: <strong style={{ color: 'var(--text-primary)' }}>{api.specKind} {api.specVersion}</strong></span>
            {api.sourceRepoName && <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{api.sourceRepoName}</strong></span>}
            {api.sourceUrl && (
              <a href={api.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <ExternalLink size={11} /> source
              </a>
            )}
          </div>

          {error && (
            <div className="text-[12px] px-3 py-2 rounded" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              Failed to parse spec: {error}
            </div>
          )}

          {!parsed && !error && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <Spinner size={14} /> Parsing spec...
            </div>
          )}

          {parsed && (
            <>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter operations..."
                className="w-full px-3 py-2 text-[12px] outline-none rounded"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              />
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {parsed.operations.length} operation{parsed.operations.length === 1 ? '' : 's'}
              </div>
              <div className="flex flex-col gap-3">
                {[...grouped.entries()].map(([tag, ops]) => (
                  <TagGroup key={tag} tag={tag} operations={ops} baseUrl={parsed.baseUrl} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const TagGroup = ({ tag, operations, baseUrl }: { tag: string; operations: ParsedOperation[]; baseUrl: string }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded" style={{ border: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold"
        style={{ background: 'var(--bg-inset)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span>{tag}</span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{operations.length}</span>
      </button>
      {expanded && (
        <div className="flex flex-col">
          {operations.map((op, i) => <OperationRow key={`${op.method}-${op.path}-${i}`} op={op} baseUrl={baseUrl} />)}
        </div>
      )}
    </div>
  );
};

const OperationRow = ({ op, baseUrl }: { op: ParsedOperation; baseUrl: string }) => {
  const [expanded, setExpanded] = useState(false);
  const color = METHOD_COLOR[op.method];
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span
          className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: `${color}18`, color, minWidth: 50, textAlign: 'center' }}
        >
          {op.method}
        </span>
        <span className="font-mono text-[12px] truncate flex-1" style={{ color: op.deprecated ? 'var(--text-faint)' : 'var(--text-primary)', textDecoration: op.deprecated ? 'line-through' : undefined }}>
          {op.path}
        </span>
        {op.summary && <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)', maxWidth: 200 }}>{op.summary}</span>}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          {op.description && <p>{op.description}</p>}
          {op.parameters.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Parameters</div>
              <div className="flex flex-col gap-1">
                {op.parameters.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={{ color: 'var(--text-faint)' }}>({p.in}, {p.type})</span>
                    {p.required && <span style={{ color: '#dc2626' }}>required</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {op.requestBody && (
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Request body: <span className="font-mono">{op.requestBody.contentType}</span>
              {op.requestBody.required && <span style={{ color: '#dc2626' }}> (required)</span>}
            </div>
          )}
          {op.responses.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Responses</div>
              <div className="flex flex-col gap-1">
                {op.responses.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{r.status}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{r.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 mt-1" style={{ borderTop: '1px dashed var(--border-subtle)' }}>
            <div className="text-[10px] uppercase font-semibold mb-2" style={{ color: 'var(--text-faint)' }}>Try it out</div>
            <OperationTester op={op} baseUrl={baseUrl} />
          </div>
        </div>
      )}
    </div>
  );
};
