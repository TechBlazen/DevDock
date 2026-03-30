import { useState, useCallback } from 'react';
import { Search, Loader2, Globe, AlertCircle } from 'lucide-react';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV'] as const;
type RecordType = (typeof RECORD_TYPES)[number];

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DnsResult {
  recordType: RecordType;
  answers: DnsAnswer[];
  error?: string;
}

const TYPE_NUMBER_MAP: Record<number, string> = {
  1: 'A',
  28: 'AAAA',
  5: 'CNAME',
  15: 'MX',
  2: 'NS',
  16: 'TXT',
  6: 'SOA',
  33: 'SRV',
};

export const DnsLookup = () => {
  const [domain, setDomain] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<RecordType>>(new Set(['A']));
  const [results, setResults] = useState<DnsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleType = (type: RecordType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleLookup = useCallback(async () => {
    const trimmed = domain.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setResults([]);

    const types = Array.from(selectedTypes);
    const allResults: DnsResult[] = [];

    try {
      const promises = types.map(async (type) => {
        try {
          const res = await fetch(
            `https://dns.google/resolve?name=${encodeURIComponent(trimmed)}&type=${type}`
          );
          if (!res.ok) {
            return { recordType: type, answers: [], error: `HTTP ${res.status}` };
          }
          const data = await res.json();
          if (data.Answer) {
            return { recordType: type, answers: data.Answer as DnsAnswer[] };
          }
          return { recordType: type, answers: [], error: 'No records found' };
        } catch (err) {
          return {
            recordType: type,
            answers: [],
            error: err instanceof Error ? err.message : 'Request failed',
          };
        }
      });

      const settled = await Promise.all(promises);
      allResults.push(...settled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setResults(allResults);
      setLoading(false);
    }
  }, [domain, selectedTypes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  const allAnswers = results.flatMap((r) =>
    r.answers.map((a) => ({ ...a, queryType: r.recordType }))
  );
  const errors = results.filter((r) => r.error);

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
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Globe size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
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

        {/* Record type buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {RECORD_TYPES.map((type) => {
            const active = selectedTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: active ? 'var(--accent)' : 'var(--border-color)',
                  background: active ? 'var(--accent-bg)' : 'var(--bg-surface)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {type}
              </button>
            );
          })}
        </div>
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
            Resolving DNS records...
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

        {errors.length > 0 && !error && (
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {errors.map((e) => (
              <div
                key={e.recordType}
                style={{
                  padding: '8px 12px',
                  background: '#f59e0b1a',
                  border: '1px solid #f59e0b40',
                  borderRadius: '6px',
                  color: '#f59e0b',
                  fontSize: '13px',
                }}
              >
                {e.recordType}: {e.error}
              </div>
            ))}
          </div>
        )}

        {allAnswers.length > 0 && (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr>
                {['Name', 'Type', 'TTL', 'Data'].map((h) => (
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
              {allAnswers.map((answer, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                    {answer.name}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {TYPE_NUMBER_MAP[answer.type] || answer.queryType}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {answer.TTL}s
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {answer.data}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && results.length === 0 && (
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
            <Globe size={32} />
            <span style={{ fontSize: '14px' }}>Enter a domain and select record types to look up</span>
          </div>
        )}
      </div>
    </div>
  );
};
