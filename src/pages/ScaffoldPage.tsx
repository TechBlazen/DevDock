import { useScaffoldStore } from '../store';
import { SCAFFOLD_AGENTS } from '../lib/scaffold-agents';
import { SectionTitle } from '../components/ui';
import { AgentGrid, ScaffoldChat } from '../components/scaffold';
import type { ScaffoldAgentId } from '../types';

export const ScaffoldPage = () => {
  const { activeSessionId, createSession, setActiveSession } = useScaffoldStore();

  const handleSelect = (agentId: ScaffoldAgentId) => {
    const agent = SCAFFOLD_AGENTS.find((a) => a.id === agentId);
    if (!agent) return;
    createSession(agentId, agent.welcomeMessage);
  };

  const handleBack = () => {
    setActiveSession(null);
  };

  if (activeSessionId) {
    return (
      <div className="p-6 h-full flex flex-col">
        <ScaffoldChat onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <SectionTitle sub="Choose an agent to scaffold your next application, service, or infrastructure.">
        Scaffold a Solution
      </SectionTitle>
      <div className="mt-6">
        <AgentGrid onSelect={handleSelect} />
      </div>
    </div>
  );
};
