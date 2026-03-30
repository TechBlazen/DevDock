import type { SearchSource, SearchDocument } from '../types';
import { SCAFFOLD_AGENTS } from '../../scaffold-agents';

export function createScaffoldSource(): SearchSource {
  return {
    category: 'scaffold-agent',
    label: 'Scaffold Agents',
    icon: 'Hammer',
    getDocuments(): SearchDocument[] {
      return SCAFFOLD_AGENTS.map((agent) => ({
        id: `scaffold-agent:${agent.id}`,
        category: 'scaffold-agent',
        title: agent.name,
        description: agent.description,
        url: '/scaffold',
        icon: 'Hammer',
        tags: agent.tags.join(' '),
      }));
    },
  };
}
