import { useState } from 'react';
import { Server, Play, Square, Trash2, Plus, ChevronDown, ChevronRight, Terminal, Wrench, RefreshCw, AlertTriangle } from 'lucide-react';
import { useMCPStore, type NewMCPServerInput } from '../../store';
import { mcpApi } from '../../lib/api';
import {
  Card, Badge, Button, Pill, Spinner,
  FormTitle, FormCard, FormField, FormInput, FormTextarea, FormPrimaryButton, FormSecondaryButton, FormFieldLabel, FormHelpText,
} from '../ui';
import type { MCPServer, MCPTool } from '../../types';
import { McpServerCommentSection } from './McpServerCommentSection';

const transportColor: Record<string, string> = {
  stdio: '#b388ff',
  sse: '#00e5a0',
  websocket: '#f5a623',
};

// A normalized status for the Badge (the live status flows straight through).
const statusVariant = (s: MCPServer['status']) => s;

// ─── Inline tool invoker (data plane) ──────────────────────────────────────────
// Calls a single tool on its server with user-supplied JSON arguments. This is
// the visible end of the data plane / Tool Gateway Router.
const ToolRow = ({ serverId, tool, canCall }: { serverId: string; tool: MCPTool; canCall: boolean }) => {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState('{}');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = async () => {
    setBusy(true); setError(null); setResult(null);
    let parsed: unknown = {};
    try { parsed = args.trim() ? JSON.parse(args) : {}; }
    catch { setError('Arguments must be valid JSON'); setBusy(false); return; }
    try {
      const res = await mcpApi.callTool(serverId, tool.name, parsed);
      setResult(JSON.stringify(res.result ?? res, null, 2));
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? (e instanceof Error ? e.message : String(e)));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <Wrench size={12} style={{ color: 'var(--text-muted)' }} />
        <code className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{tool.name}</code>
        <span className="text-[11px] truncate flex-1" style={{ color: 'var(--text-muted)' }}>{tool.description}</span>
        {tool.callCount > 0 && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{tool.callCount} calls</span>}
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="text-[10px] uppercase tracking-widest pt-2" style={{ color: 'var(--text-muted)' }}>Arguments (JSON)</div>
          <FormTextarea value={args} onChange={(e) => setArgs(e.target.value)} rows={3} style={{ fontFamily: 'monospace', fontSize: 11 }} />
          <Button variant="primary" size="sm" onClick={call} disabled={busy || !canCall} title={canCall ? 'Invoke tool' : 'Server must be running'}>
            {busy ? <Spinner size={11} /> : <Play size={11} />} Call
          </Button>
          {error && <pre className="text-[11px] whitespace-pre-wrap rounded p-2" style={{ background: 'rgba(211,47,47,0.08)', color: '#d32f2f' }}>{error}</pre>}
          {result && <pre className="text-[11px] whitespace-pre-wrap rounded p-2 overflow-auto" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', maxHeight: 220 }}>{result}</pre>}
        </div>
      )}
    </div>
  );
};

// ─── Individual server card ───────────────────────────────────────────────────
const ServerCard = ({ server }: { server: MCPServer }) => {
  const { startServer, stopServer, removeServer } = useMCPStore();
  const [expanded, setExpanded] = useState(false);
  const [tools, setTools] = useState<MCPTool[] | null>(null);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const running = server.status === 'running';
  const transitioning = server.status === 'idle';

  const loadDetail = async () => {
    setLoadingDetail(true);
    try {
      const res = await mcpApi.serverTools(server.id);
      setTools((res.tools ?? []) as MCPTool[]);
    } catch { setTools([]); }
    finally { setLoadingDetail(false); }
  };

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && tools === null) loadDetail();
  };

  const toggleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (running || transitioning) stopServer(server.id);
    else startServer(server.id).then(() => { if (expanded) loadDetail(); });
  };

  const fetchLogs = async () => {
    setShowLogs((v) => !v);
    try { const res = await mcpApi.logs(server.id); setLogs(res.logs); }
    catch { setLogs([]); }
  };

  return (
    <Card>
      <div className="flex items-center gap-3 cursor-pointer select-none" style={{ padding: '14px 20px' }} onClick={toggleExpand}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
          background: 'rgba(42, 111, 255, 0.1)', border: '1px solid rgba(42, 111, 255, 0.2)', color: '#2a6fff',
        }}>
          <Server size={15} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{server.name}</span>
            <Pill color={transportColor[server.transport] ?? '#8090b0'}>{server.transport}</Pill>
            {server.autoStart && <Pill color="#2a6fff">auto</Pill>}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{server.description}</div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge variant={statusVariant(server.status)} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {server.callCount} calls{server.toolCount ? ` · ${server.toolCount} tools` : ''}{server.port ? ` · :${server.port}` : ''}
          </span>
        </div>

        <button
          onClick={toggleRun}
          disabled={transitioning}
          className={`p-1.5 rounded-lg border transition-all ${
            running || transitioning
              ? 'bg-[#ff475715] text-[#ff4757] border-[#ff475744] hover:bg-[#ff475730]'
              : 'bg-[#00e5a015] text-[#00e5a0] border-[#00e5a044] hover:bg-[#00e5a030]'
          }`}
          title={running || transitioning ? 'Stop server' : 'Start server'}
        >
          {transitioning ? <Spinner size={13} /> : running ? <Square size={13} /> : <Play size={13} />}
        </button>

        <span style={{ color: 'var(--text-faint)' }}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {server.lastError && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-[11px]" style={{ background: 'rgba(211,47,47,0.08)', color: '#d32f2f' }}>
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> <span className="break-all">{server.lastError}</span>
            </div>
          )}

          {server.capabilities && server.capabilities.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Capabilities</div>
              <div className="flex gap-1.5 flex-wrap">
                {server.capabilities.map((cap) => (
                  <span key={cap} className="text-[11px] rounded px-2 py-0.5" style={{
                    background: 'rgba(42, 111, 255, 0.1)', color: 'rgba(42, 111, 255, 0.8)', border: '1px solid rgba(42, 111, 255, 0.2)',
                  }}>{cap}</span>
                ))}
              </div>
            </div>
          )}

          {/* Connection detail — real command/args/url, not a templated guess. */}
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {server.transport === 'stdio' ? 'Command' : 'Endpoint'}
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <Terminal size={12} style={{ color: 'var(--text-muted)' }} />
              <code className="text-[11px] break-all" style={{ color: 'rgba(0, 180, 120, 1)' }}>
                {server.transport === 'stdio'
                  ? [server.command, ...(server.args ?? [])].filter(Boolean).join(' ') || '(no command set)'
                  : server.url || '(no url set)'}
              </code>
            </div>
          </div>

          {/* Discovered tools — the Tool Gateway Router registry for this server. */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Tools{tools ? ` (${tools.length})` : ''}
              </div>
              <button onClick={loadDetail} title="Refresh tools" className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={11} />
              </button>
            </div>
            {loadingDetail && <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Loading…</div>}
            {!loadingDetail && tools && tools.length === 0 && (
              <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                {running ? 'No tools exposed.' : 'Start the server to discover its tools.'}
              </div>
            )}
            {tools && tools.length > 0 && (
              <div className="space-y-1.5">
                {tools.map((t) => <ToolRow key={t.id || t.name} serverId={server.id} tool={t} canCall={running} />)}
              </div>
            )}
          </div>

          {/* Logs (real stdout/stderr + handshake trace from the process) */}
          {showLogs && (
            <pre className="text-[10px] whitespace-pre-wrap rounded-lg p-2 overflow-auto" style={{
              background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', maxHeight: 220,
            }}>{logs && logs.length > 0 ? logs.join('\n') : '(no logs — start the server to capture output)'}</pre>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fetchLogs(); }}>
              <Terminal size={11} /> {showLogs ? 'Hide Logs' : 'Logs'}
            </Button>
            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); removeServer(server.id); }}>
              <Trash2 size={11} /> Remove
            </Button>
          </div>

          {/* Discussion — mirrors the repo comment section, tied to the forum. */}
          <McpServerCommentSection server={server} />
        </div>
      )}
    </Card>
  );
};

// ─── Add server modal ─────────────────────────────────────────────────────────
const AddServerModal = ({ onClose }: { onClose: () => void }) => {
  const createServer = useMCPStore((s) => s.createServer);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [transport, setTransport] = useState<MCPServer['transport']>('stdio');
  const [command, setCommand] = useState('npx');
  const [argsText, setArgsText] = useState('');
  const [url, setUrl] = useState('');
  const [envText, setEnvText] = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    setError(null);
    if (!name.trim()) return;

    let env: Record<string, string> | undefined;
    if (envText.trim()) {
      try {
        const parsed = JSON.parse(envText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) env = parsed;
        else throw new Error();
      } catch { setError('Environment must be a JSON object, e.g. {"KEY":"value"}'); return; }
    }

    const input: NewMCPServerInput = {
      name: name.trim(),
      description: desc.trim(),
      transport,
      autoStart,
      env,
      ...(transport === 'stdio'
        ? { command: command.trim(), args: argsText.trim() ? argsText.trim().split(/\s+/) : [] }
        : { url: url.trim() }),
    };
    if (transport === 'stdio' && !input.command) { setError('A command is required for stdio servers'); return; }
    if (transport !== 'stdio' && !input.url) { setError('A URL is required for sse/websocket servers'); return; }

    setBusy(true);
    const created = await createServer(input);
    setBusy(false);
    if (created) onClose();
    else setError('Failed to register server — is the API reachable?');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{ background: 'var(--overlay)' }}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <FormTitle>Register MCP Server</FormTitle>
        <FormCard>
          <div className="space-y-4">
            <FormField label="Server Name" htmlFor="mcp-name">
              <FormInput id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-custom-server" autoFocus />
            </FormField>

            <FormField label="Description" htmlFor="mcp-desc">
              <FormInput id="mcp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this server do?" />
            </FormField>

            <div>
              <FormFieldLabel>Transport</FormFieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {(['stdio', 'sse', 'websocket'] as const).map((t) => {
                  const active = transport === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTransport(t)}
                      className="text-[14px] font-medium transition-colors"
                      style={{
                        height: 'var(--form-input-height)', borderRadius: 'var(--form-radius)',
                        background: active ? 'var(--form-secondary-bg-hover)' : 'var(--form-input-bg)',
                        color: active ? 'var(--form-primary-bg)' : 'var(--text-secondary)',
                        border: `1px solid ${active ? 'var(--form-primary-bg)' : 'var(--form-input-border)'}`,
                      }}
                    >{t}</button>
                  );
                })}
              </div>
              {transport === 'sse' && <FormHelpText>Point at an MCP HTTP+SSE endpoint — DevDock reads the stream and POSTs back to the endpoint it advertises.</FormHelpText>}
              {transport === 'websocket' && <FormHelpText>Point at a WebSocket MCP endpoint speaking JSON-RPC text frames.</FormHelpText>}
            </div>

            {transport === 'stdio' ? (
              <>
                <FormField label="Command" htmlFor="mcp-cmd">
                  <FormInput id="mcp-cmd" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" />
                </FormField>
                <FormField label="Arguments" htmlFor="mcp-args">
                  <FormInput id="mcp-args" value={argsText} onChange={(e) => setArgsText(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem ." />
                </FormField>
              </>
            ) : (
              <FormField label="URL" htmlFor="mcp-url">
                <FormInput id="mcp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={transport === 'websocket' ? 'ws://localhost:8000/mcp' : 'http://localhost:8000/sse'} />
              </FormField>
            )}

            <FormField label="Environment (JSON, optional)" htmlFor="mcp-env">
              <FormTextarea id="mcp-env" value={envText} onChange={(e) => setEnvText(e.target.value)} rows={2} placeholder='{"API_KEY":"..."}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </FormField>

            <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={autoStart} onChange={(e) => setAutoStart(e.target.checked)} />
              Auto-start on server boot
            </label>

            {error && <div className="text-[12px]" style={{ color: '#d32f2f' }}>{error}</div>}

            <FormPrimaryButton onClick={handleAdd} disabled={!name.trim() || busy}>
              {busy ? 'Registering…' : 'Register Server'}
            </FormPrimaryButton>
            <FormSecondaryButton onClick={onClose}>Cancel</FormSecondaryButton>
          </div>
        </FormCard>
      </div>
    </div>
  );
};

// ─── Full MCP Registry ────────────────────────────────────────────────────────
export const MCPRegistry = () => {
  const servers = useMCPStore((s) => s.servers);
  const refreshStatuses = useMCPStore((s) => s.refreshStatuses);
  const syncError = useMCPStore((s) => s.syncError);
  const [showModal, setShowModal] = useState(false);

  const running = servers.filter((s) => s.status === 'running').length;
  const totalCalls = servers.reduce((sum, s) => sum + s.callCount, 0);
  const totalTools = servers.reduce((sum, s) => sum + (s.toolCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 8 }}>
        {[
          { label: 'Total', value: servers.length, color: '#8090b0' },
          { label: 'Running', value: running, color: '#00e5a0' },
          { label: 'Tools', value: totalTools, color: '#b388ff' },
          { label: 'Total Calls', value: totalCalls, color: '#2a6fff' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '14px 20px', background: 'var(--bg-surface)', border: `1px solid ${color}40`, borderRadius: 12 }}>
            <div style={{ color }} className="text-lg font-black leading-none">{value}</div>
            <div className="text-[10px] uppercase tracking-wider mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
        <button onClick={() => refreshStatuses()} className="ml-auto flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }} title="Refresh status">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {syncError && (
        <div className="text-[12px] rounded-lg px-3 py-2" style={{ background: 'rgba(237,108,2,0.1)', color: '#ed6c02' }}>
          MCP API unavailable ({syncError}) — showing the local registry. Start the DevDock server to manage live servers.
        </div>
      )}

      <div className="space-y-2" style={{ marginTop: 12 }}>
        {servers.map((s) => <ServerCard key={s.id} server={s} />)}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 border border-dashed rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(42, 111, 255, 0.4)'; e.currentTarget.style.color = '#2a6fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <Plus size={14} /> Register MCP Server
      </button>

      {showModal && <AddServerModal onClose={() => setShowModal(false)} />}
    </div>
  );
};
