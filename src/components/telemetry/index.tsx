import { useState } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Layers, BookOpen, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTelemetryStore } from '../../store';
import { Card, Badge, SectionTitle, Button } from '../ui';
import otelGuideContent from '../../content/otel-onboarding.md?raw';

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
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4" style={{ marginTop: 24 }}>
      {metrics.map(({ label, value, unit, color, icon: Icon }) => (
        <Card key={label}>
          <div style={{ padding: '18px 22px' }}>
            <div className="flex items-center justify-between mb-2">
              <Icon size={14} style={{ color }} />
            </div>
            <div className="font-black text-xl leading-none" style={{ color }}>
              {value}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{unit}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-2" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
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
      <div style={{ padding: '12px 20px' }} className="flex items-center gap-4">
        <Badge variant={span.status as 'ok' | 'error'} />
        <span className="text-xs w-20 truncate" style={{ color: 'var(--text-muted)' }}>{span.traceId.slice(0, 10)}</span>
        <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{span.service}</span>
          <span style={{ color: 'var(--text-faint)' }} className="mx-1">›</span>
          {span.operation}
        </span>
        <span className="text-xs w-20 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {span.duration >= 1000 ? `${(span.duration / 1000).toFixed(1)}s` : `${span.duration}ms`}
        </span>
        <span className="text-[11px] w-20 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{span.timestamp}</span>
      </div>

      {expanded && span.attributes && (
        <div style={{ padding: '10px 20px 14px', borderTop: '1px solid var(--border-subtle)' }} className="space-y-1">
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
    <div className="space-y-4">
      {!compact && (
        <div className="flex gap-2.5 flex-wrap items-center" style={{ padding: '0 4px' }}>
          {(['all', 'ok', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-3.5 py-1.5 rounded-lg text-xs border transition-all cursor-pointer"
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
            className="rounded-lg px-3.5 py-1.5 text-xs outline-none cursor-pointer"
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} spans</span>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: compact ? 280 : 'auto' }}>
        {(compact ? filtered.slice(0, 6) : filtered).map((span) => (
          <TraceRow key={span.spanId} span={span} />
        ))}
      </div>
    </div>
  );
};

// ─── OTel Guide Modal ────────────────────────────────────────────────────────
const OTelGuideModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={onClose}
    style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl w-full max-w-3xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>OpenTelemetry Onboarding Guide</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors hover:opacity-80 cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
        >
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto px-6 py-5 otel-guide-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mt-4 mb-1.5" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
            p: ({ children }) => <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{children}</ol>,
            li: ({ children }) => <li className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{children}</li>,
            strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
            a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>{children}</a>,
            hr: () => <hr className="my-5" style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />,
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return (
                  <pre className="rounded-md p-3 my-3 overflow-x-auto text-[12px]" style={{ background: 'var(--code-bg)', color: 'var(--code-text)' }}>
                    <code className={className}>{children}</code>
                  </pre>
                );
              }
              return <code className="rounded px-1 py-0.5 text-[12px]" style={{ background: 'var(--code-bg)', color: 'var(--code-text)' }}>{children}</code>;
            },
            pre: ({ children }) => <>{children}</>,
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto rounded-md" style={{ border: '1px solid var(--border-subtle)' }}>
                <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ background: 'var(--bg-inset)' }}>{children}</thead>,
            th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>{children}</th>,
            td: ({ children }) => <td className="px-3 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{children}</td>,
            blockquote: ({ children }) => <blockquote className="pl-3 my-3 italic" style={{ borderLeft: '3px solid var(--border-color)', color: 'var(--text-muted)' }}>{children}</blockquote>,
          }}
        >
          {otelGuideContent}
        </ReactMarkdown>
      </div>
    </div>
  </div>
);

// ─── Full Telemetry page ──────────────────────────────────────────────────────
export const TelemetryPage = () => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between mb-4">
        <SectionTitle sub="OpenTelemetry traces, metrics, and spans from all DevDock services">
          Observability
        </SectionTitle>
        <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
          <BookOpen size={13} /> Onboarding Guide
        </Button>
      </div>
      <MetricsBar />
      <div style={{ marginTop: 32 }}>
        <h2 className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Recent Traces</h2>
        <TraceList />
      </div>
      {showGuide && <OTelGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};
