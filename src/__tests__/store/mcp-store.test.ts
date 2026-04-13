import { describe, it, expect, beforeEach } from 'vitest';
import { useMCPStore } from '../../store';
import type { MCPServer } from '../../types';

const testServer: MCPServer = {
  id: 'mcp-test',
  name: 'Test Server',
  description: 'A test MCP server',
  port: 3333,
  status: 'stopped',
  callCount: 0,
  transport: 'stdio',
  command: 'npx test-server',
  capabilities: ['test'],
};

describe('useMCPStore', () => {
  const initial = useMCPStore.getInitialState().servers;

  beforeEach(() => {
    useMCPStore.setState({ servers: structuredClone(initial) });
  });

  it('is seeded with demo servers on init', () => {
    const { servers } = useMCPStore.getState();
    expect(servers.length).toBeGreaterThan(0);
    for (const s of servers) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.status).toBeTruthy();
    }
  });

  it('adds a new MCP server', () => {
    const before = useMCPStore.getState().servers.length;
    useMCPStore.getState().addServer(testServer);
    const after = useMCPStore.getState().servers;
    expect(after.length).toBe(before + 1);
    expect(after.find((s) => s.id === 'mcp-test')).toBeDefined();
  });

  it('removes an MCP server by id', () => {
    useMCPStore.getState().addServer(testServer);
    useMCPStore.getState().removeServer('mcp-test');
    expect(useMCPStore.getState().servers.find((s) => s.id === 'mcp-test')).toBeUndefined();
  });

  it('updates server status via setStatus', () => {
    useMCPStore.getState().addServer(testServer);
    useMCPStore.getState().setStatus('mcp-test', 'running');
    const server = useMCPStore.getState().servers.find((s) => s.id === 'mcp-test');
    expect(server?.status).toBe('running');
  });

  it('updates server fields partially via updateServer', () => {
    useMCPStore.getState().addServer(testServer);
    useMCPStore.getState().updateServer('mcp-test', { name: 'Renamed Server' });
    const server = useMCPStore.getState().servers.find((s) => s.id === 'mcp-test');
    expect(server?.name).toBe('Renamed Server');
    // other fields preserved
    expect(server?.command).toBe('npx test-server');
  });

  it('removeServer on unknown id is a no-op', () => {
    const before = useMCPStore.getState().servers.length;
    useMCPStore.getState().removeServer('does-not-exist');
    expect(useMCPStore.getState().servers.length).toBe(before);
  });
});
