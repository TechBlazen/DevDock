import { Globe, Server, Cloud, Cpu, Boxes, GitBranch, FlaskConical, type LucideIcon } from 'lucide-react';
import { Card, Pill } from '../ui';
import type { ScaffoldAgent, ScaffoldAgentId } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Server, Cloud, Cpu, Boxes, GitBranch, FlaskConical,
};

const AGENT_COLORS: Record<string, string> = {
  'web-app': '#2a6fff',
  'api-service': '#00e5a0',
  'cloud-infra': '#f5a623',
  'mcp-server': '#b388ff',
  'full-stack': '#ff6b8a',
  'devops-github': '#24292e',
  'playwright-testing': '#2ecc40',
};

interface AgentCardProps {
  agent: ScaffoldAgent;
  onSelect: (id: ScaffoldAgentId) => void;
}

export const AgentCard = ({ agent, onSelect }: AgentCardProps) => {
  const Icon = ICON_MAP[agent.icon] ?? Boxes;
  const color = AGENT_COLORS[agent.id] ?? '#2a6fff';

  return (
    <Card onClick={() => onSelect(agent.id)}>
      <div className="p-5 flex flex-col gap-3 cursor-pointer group">
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}33`,
              boxShadow: `0 4px 16px ${color}20`,
            }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </div>
            <div className="text-[11px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {agent.description}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {agent.tags.slice(0, 4).map((tag) => (
            <Pill key={tag} color={color}>{tag}</Pill>
          ))}
          {agent.tags.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5" style={{ color: 'var(--text-faint)' }}>
              +{agent.tags.length - 4}
            </span>
          )}
        </div>

        {/* CTA hint */}
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
          Start scaffolding →
        </div>
      </div>
    </Card>
  );
};
