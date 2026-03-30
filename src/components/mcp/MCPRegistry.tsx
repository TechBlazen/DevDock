import { useState } from 'react';
import { Server, Play, Square, Trash2, Plus, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useMCPStore } from '../../store';
import { Card, Badge, Button, Input, Pill } from '../ui';
import type { MCPServer } from '../../types';

// ─── Individual server card ───────────────────────────────────────────────────
const ServerCard = ({ server }: { server: MCPServer }) => {
  const { setStatus, removeServer } = useMCPStore();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus(server.id, server.status === 'running' ? 'stopped' : 'running');
  };

  const transportColor: Record<string, string> = {
    stdio: '#b388ff',
    sse: '#00e5a0',
    websocket: '#f5a623',
  };

  return (
    <Card>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
          background: 'rgba(42, 111, 255, 0.1)',
          border: '1px solid rgba(42, 111, 255, 0.2)',
          color: '#2a6fff'
        }}>
          <Server size={15} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{server.name}</span>
            <Pill color={transportColor[server.transport] ?? '#8090b0'}>{server.transport}</Pill>
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{server.description}</div>
        </div>

        {/* Stats + status */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge variant={server.status as 'running' | 'idle' | 'stopped' | 'error'} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{server.callCount} calls · :{server.port}</span>
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={`p-1.5 rounded-lg border transition-all ${
            server.status === 'running'
              ? 'bg-[#ff475715] text-[#ff4757] border-[#ff475744] hover:bg-[#ff475730]'
              : 'bg-[#00e5a015] text-[#00e5a0] border-[#00e5a044] hover:bg-[#00e5a030]'
          }`}
          title={server.status === 'running' ? 'Stop server' : 'Start server'}
        >
          {server.status === 'running' ? <Square size={13} /> : <Play size={13} />}
        </button>

        {/* Expand chevron */}
        <span style={{ color: 'var(--text-faint)' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Capabilities */}
          {server.capabilities && server.capabilities.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Capabilities</div>
              <div className="flex gap-1.5 flex-wrap">
                {server.capabilities.map((cap) => (
                  <span key={cap} className="text-[11px] rounded px-2 py-0.5" style={{
                    background: 'rgba(42, 111, 255, 0.1)',
                    color: 'rgba(42, 111, 255, 0.8)',
                    border: '1px solid rgba(42, 111, 255, 0.2)'
                  }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Command */}
          {server.command && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Command</div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Terminal size={12} style={{ color: 'var(--text-muted)' }} />
                <code className="text-[11px]" style={{ color: 'rgba(0, 180, 120, 1)' }}>{server.command} @modelcontextprotocol/server-{server.name}</code>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm">
              <Terminal size={11} /> Logs
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => { e.stopPropagation(); removeServer(server.id); }}
            >
              <Trash2 size={11} /> Remove
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Add server modal ─────────────────────────────────────────────────────────
const AddServerModal = ({ onClose }: { onClose: () => void }) => {
  const addServer = useMCPStore((s) => s.addServer);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [port, setPort] = useState('3010');
  const [transport, setTransport] = useState<MCPServer['transport']>('stdio');

  const handleAdd = () => {
    if (!name) return;
    addServer({
      id: `custom_${Date.now()}`,
      name,
      description: desc,
      port: Number(port),
      status: 'stopped',
      callCount: 0,
      transport,
      capabilities: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{
      background: 'var(--overlay)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    }}>
      <div
        className="rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Register MCP Server</h3>

        <div className="space-y-3">
          <Input label="Server Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-custom-server" />
          <Input label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this server do?" />
          <Input label="Port" type="number" value={port} onChange={(e) => setPort(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Transport</label>
            <div className="flex gap-2">
              {(['stdio', 'sse', 'websocket'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTransport(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: transport === t ? 'rgba(42, 111, 255, 0.12)' : 'transparent',
                    color: transport === t ? '#2a6fff' : 'var(--text-muted)',
                    border: transport === t ? '1px solid rgba(42, 111, 255, 0.3)' : '1px solid var(--border-input)'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleAdd}>Register Server</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Full MCP Registry ────────────────────────────────────────────────────────
export const MCPRegistry = () => {
  const servers = useMCPStore((s) => s.servers);
  const [showModal, setShowModal] = useState(false);

  const running = servers.filter((s) => s.status === 'running').length;
  const totalCalls = servers.reduce((sum, s) => sum + s.callCount, 0);

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total', value: servers.length, color: '#8090b0' },
          { label: 'Running', value: running, color: '#00e5a0' },
          { label: 'Total Calls', value: totalCalls, color: '#2a6fff' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl px-4 py-2.5" style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${color}40`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <div style={{ color }} className="text-lg font-black leading-none">{value}</div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Server list */}
      <div className="space-y-2">
        {servers.map((s) => <ServerCard key={s.id} server={s} />)}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 border border-dashed rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-muted)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(42, 111, 255, 0.4)';
          e.currentTarget.style.color = '#2a6fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <Plus size={14} /> Register MCP Server
      </button>

      {showModal && <AddServerModal onClose={() => setShowModal(false)} />}
    </div>
  );
};
