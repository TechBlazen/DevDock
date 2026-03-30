import { GitBranch, Server, Rocket, AlertCircle, Bot, Code } from 'lucide-react';
import { useActivityStore } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityEvent } from '../../types';

const typeConfig: Record<ActivityEvent['targetType'], { icon: typeof GitBranch; color: string }> = {
  repo:   { icon: GitBranch,    color: '#2a6fff' },
  mcp:    { icon: Server,       color: '#b388ff' },
  deploy: { icon: Rocket,       color: '#f5a623' },
  alert:  { icon: AlertCircle,  color: '#ff4757' },
  ai:     { icon: Bot,          color: '#00e5a0' },
};

const EventRow = ({ event }: { event: ActivityEvent }) => {
  const cfg = typeConfig[event.targetType] ?? { icon: Code, color: '#8090b0' };
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-[#0d1526] last:border-none">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.color + '20', border: `1px solid ${cfg.color}33` }}
      >
        <Icon size={11} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#8090b0] leading-snug">
          <span className="font-bold font-mono" style={{ color: cfg.color }}>{event.user}</span>
          {' '}{event.action}{' '}
          <span className="text-[#c8d8ff]">{event.target}</span>
        </div>
        <div className="text-[10px] text-[#2a3a5a] font-mono mt-0.5">
          {formatDistanceToNow(event.timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
};

export const ActivityWidget = () => {
  const events = useActivityStore((s) => s.events);

  return (
    <div className="divide-y divide-[#0d1526]">
      {events.slice(0, 8).map((e) => <EventRow key={e.id} event={e} />)}
    </div>
  );
};
