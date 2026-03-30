import { useState, useCallback } from 'react';
import { Shield, Loader2, CheckCircle2, XCircle, AlertCircle, Clock, Info, Lock } from 'lucide-react';

interface SslResult {
  connected: boolean;
  responseTime: number;
  statusCode?: number;
  statusText?: string;
  protocol?: string;
  error?: string;
}

export const SslChecker = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<SslResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = useCallback(async () => {
    const trimmed = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setResult(null);

    const url = `https://${trimmed}`;
    const start = performance.now();

    try {
      const res = await fetch(url, { mode: 'no-cors', cache: 'no-store' });
      const responseTime = Math.round(performance.now() - start);

      // With no-cors we get an opaque response
      if (res.type === 'opaque') {
        setResult({
          connected: true,
          responseTime,
          protocol: 'HTTPS',
        });
      } else {
        setResult({
          connected: true,
          responseTime,
          statusCode: res.status,
          statusText: res.statusText,
          protocol: 'HTTPS',
        });
      }
    } catch (err) {
      const responseTime = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : 'Connection failed';

      // Try to distinguish SSL errors from other errors
      if (message.includes('SSL') || message.includes('certificate') || message.includes('ERR_CERT')) {
        setResult({
          connected: false,
          responseTime,
          error: 'SSL/TLS certificate error',
        });
      } else {
        setResult({
          connected: false,
          responseTime,
          error: message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCheck();
  };

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
        <Lock size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter domain (e.g. example.com)"
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
        <button
          onClick={handleCheck}
          disabled={loading || !domain.trim()}
          style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !domain.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !domain.trim() ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          Check
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
            Checking SSL connection...
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

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Connection status */}
            <div
              style={{
                padding: '24px',
                background: 'var(--bg-inset)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              {result.connected ? (
                <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 12px' }} />
              ) : (
                <XCircle size={48} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
              )}
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: result.connected ? '#10b981' : '#ef4444',
                }}
              >
                {result.connected ? 'HTTPS Connection Successful' : 'Connection Failed'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-inset)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={14} style={{ color: 'var(--accent)' }} />
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    Response Time
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {result.responseTime}ms
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-inset)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Shield size={14} style={{ color: 'var(--accent)' }} />
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    Protocol
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {result.protocol || 'N/A'}
                </div>
              </div>

              {result.statusCode !== undefined && (
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--bg-inset)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    gridColumn: 'span 2',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Info size={14} style={{ color: 'var(--accent)' }} />
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                      }}
                    >
                      HTTP Status
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {result.statusCode} {result.statusText}
                  </div>
                </div>
              )}

              {result.error && (
                <div
                  style={{
                    padding: '16px',
                    background: '#ef44441a',
                    borderRadius: '8px',
                    border: '1px solid #ef444440',
                    gridColumn: 'span 2',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertCircle size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                      Error Details
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#ef4444' }}>{result.error}</div>
                </div>
              )}
            </div>

            {/* Tip */}
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
                <strong style={{ color: 'var(--text-primary)' }}>Browser Limitation:</strong> Browsers cannot
                inspect SSL/TLS certificate details (issuer, expiry, chain) via JavaScript. For full certificate
                analysis, use the command line:
                <code
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'var(--bg-inset)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                  }}
                >
                  openssl s_client -connect {domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'example.com'}:443 -showcerts
                </code>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !result && (
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
            <Lock size={32} />
            <span style={{ fontSize: '14px' }}>Enter a domain to check its SSL/HTTPS connection</span>
          </div>
        )}
      </div>
    </div>
  );
};
