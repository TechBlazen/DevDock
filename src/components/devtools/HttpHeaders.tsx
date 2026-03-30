import { useState, useCallback } from 'react';
import {
  Search, Loader2, AlertCircle, CheckCircle2, XCircle,
  AlertTriangle, FileText, Shield, Info,
} from 'lucide-react';

type HttpMethod = 'GET' | 'HEAD';

interface HeaderEntry {
  name: string;
  value: string;
}

interface SecurityCheck {
  header: string;
  present: boolean;
  value?: string;
  description: string;
}

const SECURITY_HEADERS: { header: string; description: string }[] = [
  { header: 'content-security-policy', description: 'Prevents XSS, clickjacking, and other code injection attacks' },
  { header: 'strict-transport-security', description: 'Forces HTTPS connections' },
  { header: 'x-content-type-options', description: 'Prevents MIME-type sniffing' },
  { header: 'x-frame-options', description: 'Controls iframe embedding (clickjacking protection)' },
  { header: 'x-xss-protection', description: 'Legacy XSS filter (modern browsers use CSP)' },
  { header: 'referrer-policy', description: 'Controls referrer information sent with requests' },
  { header: 'permissions-policy', description: 'Controls which browser features can be used' },
];

export const HttpHeaders = () => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = useCallback(async () => {
    let target = url.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }

    setLoading(true);
    setError('');
    setHeaders([]);
    setSecurityChecks([]);
    setAnalyzed(false);

    try {
      const res = await fetch(target, { method });
      const headerEntries: HeaderEntry[] = [];
      res.headers.forEach((value, name) => {
        headerEntries.push({ name, value });
      });
      headerEntries.sort((a, b) => a.name.localeCompare(b.name));
      setHeaders(headerEntries);

      // Security checks
      const headerMap = new Map<string, string>();
      res.headers.forEach((value, name) => {
        headerMap.set(name.toLowerCase(), value);
      });

      const checks: SecurityCheck[] = SECURITY_HEADERS.map(({ header, description }) => ({
        header,
        present: headerMap.has(header),
        value: headerMap.get(header),
        description,
      }));
      setSecurityChecks(checks);
      setAnalyzed(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Request failed. The server may block CORS requests.'
      );
    } finally {
      setLoading(false);
    }
  }, [url, method]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  const presentCount = securityChecks.filter((c) => c.present).length;
  const totalChecks = securityChecks.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          flexShrink: 0,
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <FileText size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL (e.g. https://example.com)"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {(['GET', 'HEAD'] as HttpMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: method === m ? 'var(--accent)' : 'var(--bg-surface)',
                color: method === m ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !url.trim() ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Analyze
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '40px',
              color: 'var(--text-muted)',
            }}
          >
            <Loader2 size={20} className="animate-spin" />
            Fetching headers...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: '#ef44441a',
              border: '1px solid #ef444440',
              borderRadius: '8px',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {analyzed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Security Headers Section */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <Shield size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Security Headers
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: presentCount === totalChecks ? '#10b98120' : '#f59e0b20',
                    color: presentCount === totalChecks ? '#10b981' : '#f59e0b',
                  }}
                >
                  {presentCount}/{totalChecks}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {securityChecks.map((check) => (
                  <div
                    key={check.header}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-inset)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    {check.present ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {check.header}
                        </span>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: check.present ? '#10b98120' : '#f59e0b20',
                            color: check.present ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {check.present ? 'Present' : 'Missing'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {check.description}
                      </div>
                      {check.value && (
                        <div
                          style={{
                            marginTop: '6px',
                            padding: '6px 10px',
                            background: 'var(--bg-surface)',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {check.value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Headers Table */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <FileText size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  All Response Headers
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                  }}
                >
                  {headers.length}
                </span>
              </div>

              {headers.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['Header Name', 'Value'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderBottom: '2px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td
                          style={{
                            padding: '8px 12px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h.name}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {h.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                  No headers available (CORS may restrict header visibility)
                </div>
              )}
            </div>

            {/* CORS disclaimer */}
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--accent-bg)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>CORS Note:</strong> Browsers restrict which
                response headers are visible to JavaScript. Only CORS-safelisted headers and those exposed via{' '}
                <code
                  style={{
                    padding: '1px 4px',
                    background: 'var(--bg-inset)',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                >
                  Access-Control-Expose-Headers
                </code>{' '}
                are accessible. Some security headers may be present but not visible here. Use browser DevTools or{' '}
                <code
                  style={{
                    padding: '1px 4px',
                    background: 'var(--bg-inset)',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                >
                  curl -I
                </code>{' '}
                for a complete view.
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !analyzed && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: 'var(--text-faint)',
              gap: '8px',
            }}
          >
            <FileText size={32} />
            <span style={{ fontSize: '14px' }}>Enter a URL to analyze its HTTP response headers</span>
          </div>
        )}
      </div>
    </div>
  );
};
