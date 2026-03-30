import { useState } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Layers } from 'lucide-react';
import { useTelemetryStore } from '../../store';
import { Card, Badge, SectionTitle } from '../ui';

// ─── Metrics summary bar ──────────────────────────────────────────────────────
export const MetricsBar = () => {
  const { reqPerSec, p99Latency, errorRate, activeSpans, spans } = useTelemetryStore();

  const metrics = [
    { label: 'Req / sec',     value: String(reqPerSec),    unit: '',     color: '#2a6fff', icon: Activity },
    { label: 'P99 Latency',   value: String(p99Latency),   unit: 'ms',   color: '#f5a623', icon: Clock },
    { label: 'Error Rate',    value: String(errorRate),    unit: '%',    color: errorRate > 1 ? '#ff4757' : '#00e5a0', icon: AlertTriangle },
    { label: 'Active Spans',  value: String(activeSpans),  unit: '',     color: '#b388ff', icon: Layers },
    { label: 'Total Traces',  value: String(spans.length), unit: '',     color: '#00e5a0', icon: CheckCircle },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {metrics.map(({ label, value, unit, color, icon: Icon }) => (
        <Card key={label} className="px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <Icon size={12} style={{ color }} />
          </div>
          <div className="font-black text-xl leading-none" style={{ color }}>
            {value}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{unit}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
        </Card>
      ))}
    </div>
  );
};

// ─── Trace row ────────────────────────────────────────────────────────────────
const TraceRow = ({ span }: { span: ReturnType<typeof useTelemetryStore.getState>['spans'][0] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg cursor-pointer transition-all"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
      onClick={() => setExpanded((v) => !v)}
      onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--border-color)'}
      onMouseLeave={(e) => e.currentTarget.style.border = '1px solid var(--border-subtle)'}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Badge variant={span.status as 'ok' | 'error'} />
        <span className="text-xs w-20 truncate" style={{ color: 'var(--text-muted)' }}>{span.traceId.slice(0, 10)}</span>
        <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{span.service}</span>
          <span style={{ color: 'var(--text-faint)' }} className="mx-1">›</span>
          {span.operation}
        </span>
        <span className="text-xs w-16 text-right" style={{ color: 'var(--text-secondary)' }}>
          {span.duration >= 1000 ? `${(span.duration / 1000).toFixed(1)}s` : `${span.duration}ms`}
        </span>
        <span className="text-[10px] w-16 text-right" style={{ color: 'var(--text-muted)' }}>{span.timestamp}</span>
      </div>

      {expanded && span.attributes && (
        <div className="px-3 pb-3 pt-2 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {Object.entries(span.attributes).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-[11px]">
              <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{String(v)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[11px] mt-1.5">
            <span style={{ color: 'rgba(0, 0, 0, 0.5)' }}>spanId:</span>
            <span style={{ color: '#2a6fff' }}>{span.spanId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Trace list ───────────────────────────────────────────────────────────────
export const TraceList = ({ compact = false }: { compact?: boolean }) => {
  const spans = useTelemetryStore((s) => s.spans);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error'>('all');
  const [serviceFilter, setServiceFilter] = useState('');

  const services = [...new Set(spans.map((s) => s.service))];

  const filtered = spans.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchService = !serviceFilter || s.service === serviceFilter;
    return matchStatus && matchService;
  });

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex gap-2 flex-wrap items-center">
          {(['all', 'ok', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-1 rounded-lg text-xs border transition-all"
              style={{
                background: statusFilter === f ? 'rgba(42, 111, 255, 0.12)' : 'transparent',
                color: statusFilter === f ? '#2a6fff' : 'var(--text-muted)',
                border: statusFilter === f ? '1px solid rgba(42, 111, 255, 0.3)' : '1px solid var(--border-input)'
              }}
            >
              {f}
            </button>
          ))}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="rounded-lg px-3 py-1 text-xs outline-none"
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} spans</span>
        </div>
      )}

      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: compact ? 280 : 'auto' }}>
        {(compact ? filtered.slice(0, 6) : filtered).map((span) => (
          <TraceRow key={span.spanId} span={span} />
        ))}
      </div>
    </div>
  );
};

// ─── Full Telemetry page ──────────────────────────────────────────────────────
export const TelemetryPage = () => (
  <div className="p-6 space-y-6">
    <SectionTitle sub="OpenTelemetry traces, metrics, and spans from all DevDock services">
      Observability
    </SectionTitle>
    <MetricsBar />
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>Recent Traces</h2>
      <TraceList />
    </div>
  </div>
);
