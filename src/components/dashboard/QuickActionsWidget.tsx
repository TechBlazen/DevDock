import { Terminal, Key, Network, Package, Zap, Globe, Bot, TrendingUp, DollarSign, Timer } from 'lucide-react';

// ─── Quick Actions Widget ─────────────────────────────────────────────────────
const actions = [
  { label: 'New Repo',       icon: Package,  color: '#2a6fff', action: () => window.open('https://github.com/new', '_blank') },
  { label: 'OTel Dash',      icon: TrendingUp, color: '#f5a623', action: () => {} },
  { label: 'Terminal',       icon: Terminal, color: '#b388ff', action: () => window.dispatchEvent(new CustomEvent('forge:toggle-terminal')) },
  { label: 'API Keys',       icon: Key,      color: '#ff6b81', action: () => {} },
  { label: 'Network Map',    icon: Network,  color: '#00b4d8', action: () => window.location.assign('/network') },
  { label: 'MCP Inspector',  icon: Zap,      color: '#00e5a0', action: () => {} },
];

export const QuickActionsWidget = () => (
  <div className="grid grid-cols-3 gap-2">
    {actions.map(({ label, icon: Icon, color, action }) => (
      <button
        key={label}
        onClick={action}
        style={{ borderColor: color + '33' }}
        className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border bg-transparent transition-all hover:scale-[1.04] active:scale-95"
        onMouseEnter={(e) => (e.currentTarget.style.background = color + '12')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Icon size={20} style={{ color }} />
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{label}</span>
      </button>
    ))}
  </div>
);

// ─── AI Metrics Widget ────────────────────────────────────────────────────────
const aiStats = [
  { label: 'Total Calls',   value: '1,247',  icon: Bot,        color: '#2a6fff' },
  { label: 'Avg Latency',   value: '1.2s',   icon: Timer,      color: '#f5a623' },
  { label: 'Est. Cost',     value: '$3.42',  icon: DollarSign, color: '#00e5a0' },
  { label: 'Tokens Used',   value: '2.1M',   icon: Globe,      color: '#b388ff' },
];

export const AIMetricsWidget = () => (
  <div className="grid grid-cols-2 gap-2">
    {aiStats.map(({ label, value, icon: Icon, color }) => (
      <div key={label} className="rounded-xl p-3" style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}>
        <Icon size={13} style={{ color }} className="mb-1.5" />
        <div className="text-base font-black font-mono leading-none" style={{ color }}>{value}</div>
        <div className="text-[10px] uppercase tracking-wide font-mono mt-1" style={{ color: 'rgba(0,0,0,0.4)' }}>{label}</div>
      </div>
    ))}
  </div>
);
