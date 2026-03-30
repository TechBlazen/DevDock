import { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Send, Plus, Trash2, Clock,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { Button, Pill } from '../ui';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Header { key: string; value: string; enabled: boolean }

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  size: string;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#8b5cf6',
  DELETE: '#ef4444',
};

const SAMPLE_HEADERS: Header[] = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'Accept', value: 'application/json', enabled: true },
];

export const ApiTester = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState<Header[]>(SAMPLE_HEADERS);
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'response'>('headers');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [history, setHistory] = useState<{ method: HttpMethod; url: string; status: number; duration: number }[]>([]);

  const handleSend = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    setActiveTab('response');

    const start = performance.now();

    try {
      const reqHeaders: Record<string, string> = {};
      for (const h of headers) {
        if (h.enabled && h.key.trim()) reqHeaders[h.key] = h.value;
      }

      const options: RequestInit = {
        method,
        headers: reqHeaders,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const duration = Math.round(performance.now() - start);
      const text = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      const size = new Blob([text]).size;
      const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`;

      const apiRes: ApiResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: text,
        duration,
        size: sizeStr,
      };

      setResponse(apiRes);
      setHistory((prev) => [{ method, url, status: res.status, duration }, ...prev].slice(0, 20));

      // Try to format JSON response
      try {
        const parsed = JSON.parse(text);
        apiRes.body = JSON.stringify(parsed, null, 2);
        setResponse({ ...apiRes });
      } catch { /* not JSON */ }
    } catch (e) {
      const duration = Math.round(performance.now() - start);
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: String(e),
        duration,
        size: '0 B',
      });
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => setHeaders([...headers, { key: '', value: '', enabled: true }]);
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));
  const updateHeader = (idx: number, field: keyof Header, value: string | boolean) => {
    setHeaders(headers.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
  };

  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        {/* Method selector */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="rounded-2xl px-3 py-2 text-[12px] font-bold outline-none cursor-pointer"
          style={{
            background: `${METHOD_COLORS[method]}12`,
            color: METHOD_COLORS[method],
            border: `1px solid ${METHOD_COLORS[method]}30`,
            minWidth: 90,
          }}
        >
          {Object.keys(METHOD_COLORS).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* URL input */}
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 rounded-2xl px-3.5 py-2 text-[12px] font-mono outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(0,0,0,0.85)',
          }}
          onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.25)'; }}
        />

        {/* Send */}
        <Button variant="primary" size="md" onClick={handleSend} disabled={loading || !url.trim()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {(['headers', 'body', 'response'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-all"
            style={activeTab === tab ? {
              background: 'rgba(59,130,246,0.1)',
              color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.2)',
            } : {
              color: 'rgba(0,0,0,0.4)',
              border: '1px solid transparent',
            }}
          >
            {tab}
            {tab === 'headers' && <span className="ml-1 text-[9px] opacity-60">({headers.filter((h) => h.enabled).length})</span>}
            {tab === 'response' && response && (
              <span className="ml-1.5">
                <Pill color={response.status < 400 ? '#10b981' : '#ef4444'}>{response.status}</Pill>
              </span>
            )}
          </button>
        ))}

        {/* Response meta */}
        {response && activeTab === 'response' && (
          <div className="ml-auto flex items-center gap-3 text-[10px] font-mono" style={{ color: 'rgba(0,0,0,0.4)' }}>
            <span className="flex items-center gap-1"><Clock size={10} /> {response.duration}ms</span>
            <span>{response.size}</span>
            <span style={{ color: response.status < 400 ? '#10b981' : '#ef4444' }}>
              {response.status} {response.statusText}
            </span>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {/* Headers tab */}
        {activeTab === 'headers' && (
          <div className="p-4 space-y-2 overflow-y-auto h-full">
            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.enabled}
                  onChange={(e) => updateHeader(i, 'enabled', e.target.checked)}
                  className="accent-[#3b82f6] flex-shrink-0"
                />
                <input
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1 rounded-xl px-2.5 py-1.5 text-[11px] font-mono outline-none"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(0,0,0,0.8)' }}
                />
                <input
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 rounded-xl px-2.5 py-1.5 text-[11px] font-mono outline-none"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(0,0,0,0.8)' }}
                />
                <button onClick={() => removeHeader(i)} className="p-1 flex-shrink-0 transition-colors" style={{ color: 'rgba(0,0,0,0.25)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0,0,0,0.25)'}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addHeader}>
              <Plus size={12} /> Add Header
            </Button>
          </div>
        )}

        {/* Body tab */}
        {activeTab === 'body' && (
          <Editor
            height="100%"
            language="json"
            value={body}
            onChange={(v) => setBody(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'Source Code Pro', monospace",
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              tabSize: 2,
              theme: 'vs',
              overviewRulerBorder: false,
              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            }}
          />
        )}

        {/* Response tab */}
        {activeTab === 'response' && (
          <div className="h-full flex flex-col">
            {!response ? (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'rgba(0,0,0,0.3)' }}>
                <div className="text-center">
                  <Send size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Send a request to see the response</p>
                  <p className="text-[10px] mt-1 opacity-60">Ctrl+Enter to send</p>
                </div>
              </div>
            ) : (
              <>
                {/* Response headers (collapsible) */}
                <button
                  onClick={() => setShowBody(!showBody)}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
                  style={{ color: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {showBody ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  Response Headers ({Object.keys(response.headers).length})
                </button>
                {showBody && (
                  <div className="px-4 py-2 space-y-1 text-[11px] font-mono flex-shrink-0 max-h-[150px] overflow-y-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="font-semibold flex-shrink-0" style={{ color: 'rgba(0,0,0,0.6)' }}>{k}:</span>
                        <span className="truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Response body */}
                <div className="flex-1">
                  <Editor
                    height="100%"
                    language={response.headers['content-type']?.includes('json') ? 'json' : 'plaintext'}
                    value={response.body}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      fontFamily: "'Source Code Pro', monospace",
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      padding: { top: 12 },
                      tabSize: 2,
                      theme: 'vs',
                      overviewRulerBorder: false,
                      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* History sidebar */}
      {history.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0 overflow-x-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(0,0,0,0.35)' }}>History</div>
          <div className="flex gap-1.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setMethod(h.method); setUrl(h.url); }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono flex-shrink-0 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(0,0,0,0.5)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                <span style={{ color: METHOD_COLORS[h.method] }} className="font-bold">{h.method}</span>
                <span className="max-w-[120px] truncate">{new URL(h.url).pathname}</span>
                <Pill color={h.status < 400 ? '#10b981' : '#ef4444'}>{h.status}</Pill>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
