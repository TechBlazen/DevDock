import { useState, useCallback } from 'react';
import { Search, Loader2, FileText, AlertCircle, Calendar, Server, Shield, User } from 'lucide-react';

interface WhoisData {
  domainName: string;
  status: string[];
  registrar: string;
  creationDate: string;
  expirationDate: string;
  nameservers: string[];
  raw?: Record<string, unknown>;
}

export const WhoisLookup = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = useCallback(async () => {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(trimmed)}`);

      if (res.status === 404) {
        setError('Domain not found. It may not be registered or RDAP data is unavailable.');
        return;
      }

      if (!res.ok) {
        setError(`Lookup failed with status ${res.status}`);
        return;
      }

      const data = await res.json();

      // Parse registrar from entities
      let registrar = 'Unknown';
      if (data.entities && Array.isArray(data.entities)) {
        for (const entity of data.entities) {
          if (entity.roles && entity.roles.includes('registrar')) {
            registrar =
              entity.vcardArray?.[1]?.find(
                (v: string[]) => v[0] === 'fn'
              )?.[3] ||
              entity.handle ||
              'Unknown';
            break;
          }
        }
      }

      // Parse dates from events
      let creationDate = '';
      let expirationDate = '';
      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          if (event.eventAction === 'registration') {
            creationDate = event.eventDate;
          } else if (event.eventAction === 'expiration') {
            expirationDate = event.eventDate;
          }
        }
      }

      // Parse nameservers
      const nameservers: string[] = [];
      if (data.nameservers && Array.isArray(data.nameservers)) {
        for (const ns of data.nameservers) {
          nameservers.push(ns.ldhName || ns.unicodeName || '');
        }
      }

      // Parse status
      const status: string[] = data.status || [];

      setResult({
        domainName: data.ldhName || data.unicodeName || trimmed,
        status,
        registrar,
        creationDate,
        expirationDate,
        nameservers,
        raw: data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const InfoCard = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
    label: string;
    value: string | React.ReactNode;
  }) => (
    <div
      style={{
        padding: '16px',
        background: 'var(--bg-inset)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={14} style={{ color: 'var(--accent)' }} />
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
        {value || 'N/A'}
      </div>
    </div>
  );

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
          onClick={handleLookup}
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
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Lookup
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
            Looking up WHOIS data...
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Domain name header */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-inset)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {result.domainName}
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                {result.status.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {s.replace(/\s+/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <InfoCard icon={User} label="Registrar" value={result.registrar} />
              <InfoCard icon={Calendar} label="Created" value={formatDate(result.creationDate)} />
              <InfoCard icon={Calendar} label="Expires" value={formatDate(result.expirationDate)} />
              <InfoCard
                icon={Server}
                label="Nameservers"
                value={
                  result.nameservers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {result.nameservers.map((ns, i) => (
                        <span key={i} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {ns}
                        </span>
                      ))}
                    </div>
                  ) : (
                    'N/A'
                  )
                }
              />
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
            <Shield size={32} />
            <span style={{ fontSize: '14px' }}>Enter a domain to look up WHOIS information</span>
          </div>
        )}
      </div>
    </div>
  );
};
