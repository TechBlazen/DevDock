import { SCAFFOLD_AGENTS } from '../../lib/scaffold-agents';
import { useScaffoldStore } from '../../store';
import { AgentCard } from './AgentCard';
import { SessionList } from './SessionList';
import type { ScaffoldAgentId } from '../../types';

interface AgentGridProps {
  onSelect: (agentId: ScaffoldAgentId) => void;
}

export const AgentGrid = ({ onSelect }: AgentGridProps) => {
  const sessions = useScaffoldStore((s) => s.sessions);

  return (
    <div className="space-y-8">
      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCAFFOLD_AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onSelect={onSelect} />
        ))}
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
            Recent Sessions
          </div>
          <SessionList sessions={sessions} maxItems={5} />
        </div>
      )}
    </div>
  );
};
