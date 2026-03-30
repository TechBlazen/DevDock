import type { SearchSource, SearchDocument } from '../types';
import type { MCPServer } from '../../../types';

interface MCPStoreState {
  servers: MCPServer[];
}

export function createMCPSource(getState: () => MCPStoreState): SearchSource {
  return {
    category: 'mcp-server',
    label: 'MCP Servers',
    icon: 'Cpu',
    getDocuments(): SearchDocument[] {
      return getState().servers.map((server) => ({
        id: `mcp-server:${server.id}`,
        category: 'mcp-server',
        title: server.name,
        description: server.description,
        url: '/mcp',
        icon: 'Cpu',
        tags: server.capabilities?.join(' ') ?? '',
        extra: server.transport,
        meta: {
          status: server.status,
          transport: server.transport,
        },
      }));
    },
  };
}
