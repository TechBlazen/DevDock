import { useMemo, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { ParsedOperation, ParsedParameter } from '../../lib/openapi';
import { apisApi, type ProxyResponse } from '../../lib/api';

// In-app tester. The user fills in path/query/header params and (for write
// methods) a JSON body, then we fan the request through /api/apis/proxy so
// we don't have to negotiate CORS with every spec's origin. The Authorization
// field is a convenience — it's just merged into the headers dict before send.

interface OperationTesterProps {
  op: ParsedOperation;
  baseUrl: string;
}

const HAS_BODY: Record<string, boolean> = {
  post: true, put: true, patch: true, delete: true,
};

export const OperationTester = ({ op, baseUrl }: OperationTesterProps) => {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState(op.requestBody ? '{\n  \n}' : '');
  const [authHeader, setAuthHeader] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupParams(op.parameters), [op.parameters]);
  const showBody = HAS_BODY[op.method] && op.requestBody;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const url = buildUrl(baseUrl, op.path, paramValues, grouped);
      const headers: Record<string, string> = {};
      for (const p of grouped.header) {
        const v = paramValues[p.name];
        if (v) headers[p.name] = v;
      }
      if (authHeader) headers.Authorization = authHeader;
      if (showBody && bodyText) {
        const ct = op.requestBody?.contentType ?? 'application/json';
        if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = ct;
      }

      const res = await apisApi.proxy({
        method: op.method,
        url,
        headers,
        body: showBody ? bodyText : undefined,
      });
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {grouped.path.length > 0 && (
        <ParamGroup label="Path" params={grouped.path} values={paramValues} onChange={setParamValues} />
      )}
      {grouped.query.length > 0 && (
        <ParamGroup label="Query" params={grouped.query} values={paramValues} onChange={setParamValues} />
      )}
      {grouped.header.length > 0 && (
        <ParamGroup label="Headers" params={grouped.header} values={paramValues} onChange={setParamValues} />
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>Authorization</label>
        <input
          value={authHeader}
          onChange={(e) => setAuthHeader(e.target.value)}
          placeholder="Bearer …"
          className="px-2 py-1 text-[12px] outline-none rounded font-mono"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
        />
      </div>

      {showBody && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>
            Body ({op.requestBody?.contentType ?? 'application/json'})
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            className="px-2 py-1 text-[12px] outline-none rounded font-mono"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', resize: 'vertical' }}
          />
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={loading || !baseUrl}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)', color: 'white', border: 'none', cursor: loading || !baseUrl ? 'default' : 'pointer' }}
        title={!baseUrl ? 'Spec has no base URL — cannot send' : undefined}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        Send
      </button>

      {error && (
        <div className="text-[12px] px-3 py-2 rounded" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          {error}
        </div>
      )}

      {response && <ResponseView response={response} />}
    </div>
  );
};

const ParamGroup = ({
  label, params, values, onChange,
}: {
  label: string;
  params: ParsedParameter[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)' }}>{label}</div>
    <div className="flex flex-col gap-1">
      {params.map((p) => (
        <div key={`${p.in}-${p.name}`} className="flex items-center gap-2">
          <span className="text-[11px] font-mono w-32 truncate" style={{ color: 'var(--text-primary)' }}>
            {p.name}{p.required && <span style={{ color: '#dc2626' }}>*</span>}
          </span>
          <input
            value={values[p.name] ?? ''}
            onChange={(e) => onChange({ ...values, [p.name]: e.target.value })}
            placeholder={p.type}
            className="flex-1 px-2 py-1 text-[12px] outline-none rounded"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
        </div>
      ))}
    </div>
  </div>
);

const ResponseView = ({ response }: { response: ProxyResponse }) => {
  const ok = response.status >= 200 && response.status < 300;
  const formattedBody = useMemo(() => formatBody(response.body, response.headers), [response]);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[11px]">
        <span
          className="font-mono font-bold px-2 py-0.5 rounded"
          style={{ background: ok ? 'rgba(46,125,50,0.12)' : 'rgba(220,38,38,0.12)', color: ok ? '#2e7d32' : '#dc2626' }}
        >
          {response.status} {response.statusText}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{response.durationMs} ms</span>
      </div>
      <pre
        className="text-[11px] font-mono p-2 rounded overflow-auto"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', maxHeight: 320, margin: 0 }}
      >
        {formattedBody}
      </pre>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface GroupedParams {
  path: ParsedParameter[];
  query: ParsedParameter[];
  header: ParsedParameter[];
}

function groupParams(params: ParsedParameter[]): GroupedParams {
  const out: GroupedParams = { path: [], query: [], header: [] };
  for (const p of params) {
    if (p.in === 'path') out.path.push(p);
    else if (p.in === 'header') out.header.push(p);
    else if (p.in === 'query') out.query.push(p);
    // body / formData / cookie are ignored for the MVP — body is handled
    // separately via the textarea, the others are uncommon in OpenAPI 3.
  }
  return out;
}

function buildUrl(baseUrl: string, pathTpl: string, values: Record<string, string>, grouped: GroupedParams): string {
  let path = pathTpl;
  for (const p of grouped.path) {
    const v = values[p.name];
    path = path.replace(`{${p.name}}`, encodeURIComponent(v ?? ''));
  }
  const query: string[] = [];
  for (const p of grouped.query) {
    const v = values[p.name];
    if (v) query.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`);
  }
  const qs = query.length ? `?${query.join('&')}` : '';
  // Tolerate baseUrl with or without trailing slash and path with or without leading slash.
  const stripped = baseUrl.replace(/\/$/, '');
  const prefixed = path.startsWith('/') ? path : `/${path}`;
  return `${stripped}${prefixed}${qs}`;
}

function formatBody(body: string, headers: Record<string, string>): string {
  const ct = headers['content-type'] ?? headers['Content-Type'] ?? '';
  if (ct.includes('application/json')) {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { /* fall through */ }
  }
  return body;
}
