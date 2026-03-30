import { Globe, Server, Cloud, Cpu, Boxes, Trash2, type LucideIcon } from 'lucide-react';
import { Badge } from '../ui';
import { useScaffoldStore } from '../../store';
import { SCAFFOLD_AGENTS } from '../../lib/scaffold-agents';
import { formatDistanceToNow } from 'date-fns';
import type { ScaffoldSession } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Server, Cloud, Cpu, Boxes,
};

const AGENT_COLORS: Record<string, string> = {
  'web-app': '#2a6fff',
  'api-service': '#00e5a0',
  'cloud-infra': '#f5a623',
  'mcp-server': '#b388ff',
  'full-stack': '#ff6b8a',
};

interface SessionListProps {
  sessions: ScaffoldSession[];
  maxItems?: number;
}

export const SessionList = ({ sessions, maxItems }: SessionListProps) => {
  const { setActiveSession, deleteSession } = useScaffoldStore();
  const displayed = maxItems ? sessions.slice(0, maxItems) : sessions;

  if (displayed.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {displayed.map((session) => {
        const agent = SCAFFOLD_AGENTS.find((a) => a.id === session.agentId);
        const Icon = ICON_MAP[agent?.icon ?? 'Boxes'] ?? Boxes;
        const color = AGENT_COLORS[session.agentId] ?? '#2a6fff';

        return (
          <div
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.borderColor = `${color}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}
            >
              <Icon size={13} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate" style={{ color: 'rgba(0, 0, 0, 0.8)' }}>
                {session.title}
              </div>
              <div className="text-[10px]" style={{ color: 'rgba(0, 0, 0, 0.4)' }}>
                {agent?.name} · {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
              </div>
            </div>
            <Badge variant={session.status === 'active' ? 'running' : 'idle'} />
            <button
              onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
              className="p-1 text-transparent hover:text-[#ff4757] transition-colors"
              title="Delete session"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
