import { useState, useRef, useCallback } from 'react';
import { Activity, Loader2, Square, Play, AlertCircle } from 'lucide-react';

interface PingResult {
  seq: number;
  status: number | 'error';
  latency: number;
  error?: string;
}

interface PingSummary {
  min: number;
  avg: number;
  max: number;
  successRate: number;
  total: number;
  success: number;
}

const PING_COUNTS = [1, 5, 10] as const;

export const PingTool = () => {
  const [url, setUrl] = useState('');
  const [pingCount, setPingCount] = useState<number>(5);
  const [results, setResults] = useState<PingResult[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<PingSummary | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef(false);

  const computeSummary = (items: PingResult[]): PingSummary => {
    const successful = items.filter((r) => r.status !== 'error');
    const latencies = successful.map((r) => r.latency);
    return {
      min: latencies.length ? Math.min(...latencies) : 0,
      avg: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
      max: latencies.length ? Math.max(...latencies) : 0,
      successRate: items.length ? Math.round((successful.length / items.length) * 100) : 0,
      total: items.length,
      success: successful.length,
    };
  };

  const handleStart = useCallback(async () => {
    let target = url.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }

    setRunning(true);
    setError('');
    setResults([]);
    setSummary(null);
    abortRef.current = false;

    const collected: PingResult[] = [];

    for (let i = 0; i < pingCount; i++) {
      if (abortRef.current) break;

      const seq = i + 1;
      const start = performance.now();

      try {
        const res = await fetch(target, { mode: 'no-cors', cache: 'no-store' });
        const latency = Math.round(performance.now() - start);
        const result: PingResult = {
          seq,
          status: res.type === 'opaque' ? 0 : res.status,
          latency,
        };
        collected.push(result);
      } catch (err) {
        const latency = Math.round(performance.now() - start);
        collected.push({
          seq,
          status: 'error',
          latency,
          error: err instanceof Error ? err.message : 'Failed',
        });
      }

      setResults([...collected]);
      setSummary(computeSummary(collected));

      // Small delay between pings
      if (i < pingCount - 1 && !abortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setRunning(false);
  }, [url, pingCount]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !running) handleStart();
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
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Activity size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
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
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Count:</span>
          {PING_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => !running && setPingCount(count)}
              style={{
                padding: '4px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid',
                borderColor: pingCount === count ? 'var(--accent)' : 'var(--border-color)',
                background: pingCount === count ? 'var(--accent-bg)' : 'var(--bg-surface)',
                color: pingCount === count ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: running ? 'not-allowed' : 'pointer',
              }}
            >
              {count}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {running ? (
            <button
              onClick={handleStop}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!url.trim()}
              style={{
                padding: '8px 16px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: !url.trim() ? 'not-allowed' : 'pointer',
                opacity: !url.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <Play size={14} />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
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
              marginBottom: '12px',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {[
              { label: 'Min', value: `${summary.min}ms`, color: '#10b981' },
              { label: 'Avg', value: `${summary.avg}ms`, color: 'var(--accent)' },
              { label: 'Max', value: `${summary.max}ms`, color: '#f59e0b' },
              {
                label: 'Success',
                value: `${summary.successRate}%`,
                color: summary.successRate === 100 ? '#10b981' : '#ef4444',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '12px',
                  background: 'var(--bg-inset)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color, fontFamily: 'monospace', marginTop: '4px' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ping rows */}
        {results.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Seq', 'Status', 'Latency'].map((h) => (
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
              {results.map((r) => (
                <tr key={r.seq} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    #{r.seq}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.status === 'error' ? (
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>{r.error || 'Error'}</span>
                    ) : r.status === 0 ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#10b98120',
                          color: '#10b981',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        OK (opaque)
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: r.status < 400 ? '#10b98120' : '#ef444420',
                          color: r.status < 400 ? '#10b981' : '#ef4444',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {r.latency}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {running && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            Pinging...
          </div>
        )}

        {!running && results.length === 0 && (
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
            <Activity size={32} />
            <span style={{ fontSize: '14px' }}>Enter a URL and click Start to begin pinging</span>
          </div>
        )}
      </div>
    </div>
  );
};
