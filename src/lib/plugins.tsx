/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, useCallback } from 'react';
import { HeartPulse, ShieldCheck, BookOpen, FolderOpen, FileText, Search, RefreshCw, Plus, Trash2, Save, ChevronRight, AlertTriangle } from 'lucide-react';
import { usePluginStore, useSettingsStore, useMCPStore, useTelemetryStore } from '../store';
import { Card, CardHeader, SectionTitle, StatusDot, Badge, Pill, Button, Input, EmptyState, Spinner } from '../components/ui';
import type { ForgePlugin, DashboardWidget, PluginPage, PluginWidget, PluginNavItem } from '../types';

// ─── Plugin SDK ──────────────────────────────────────────────────────────────
export function createForgePlugin(plugin: ForgePlugin): ForgePlugin {
  return plugin;
}

// ─── usePluginExtensions Hook ────────────────────────────────────────────────
export function usePluginExtensions() {
  const { plugins, enabledPlugins } = usePluginStore();

  return useMemo(() => {
    const enabled = plugins.filter((p) => enabledPlugins[p.id]);

    const pages: PluginPage[] = [];
    const widgets: PluginWidget[] = [];
    const navItems: PluginNavItem[] = [];
    const routeTitles: Record<string, string> = {};
    const widgetCatalog: DashboardWidget[] = [];
    const widgetComponents: Record<string, React.ComponentType> = {};

    for (const plugin of enabled) {
      if (plugin.pages) {
        for (const page of plugin.pages) {
          pages.push(page);
          routeTitles[page.path] = page.title;
        }
      }
      if (plugin.widgets) {
        for (const widget of plugin.widgets) {
          widgets.push(widget);
          widgetCatalog.push({
            id: widget.id,
            title: widget.title,
            icon: widget.icon,
            description: widget.description,
            defaultSize: widget.defaultSize,
          });
          widgetComponents[widget.id] = widget.component;
        }
      }
      if (plugin.navItems) {
        navItems.push(...plugin.navItems);
      }
    }

    return { pages, widgets, navItems, routeTitles, widgetCatalog, widgetComponents };
  }, [plugins, enabledPlugins]);
}

// ─── Built-in Plugin: System Status ──────────────────────────────────────────
const StatusPageComponent = () => {
  const { reqPerSec, p99Latency, errorRate, activeSpans } = useTelemetryStore();
  const servers = useMCPStore((s) => s.servers);
  const runningMCP = servers.filter((s) => s.status === 'running').length;
  const settings = useSettingsStore((s) => s.settings);

  const metrics = [
    { label: 'Requests/sec', value: reqPerSec, color: '#2a6fff' },
    { label: 'P99 Latency', value: `${p99Latency}ms`, color: '#f5a623' },
    { label: 'Error Rate', value: `${errorRate}%`, color: errorRate > 1 ? '#ff4757' : '#00e5a0' },
    { label: 'Active Spans', value: activeSpans, color: '#b388ff' },
    { label: 'MCP Servers', value: `${runningMCP}/${servers.length}`, color: '#00e5a0' },
    { label: 'AI Provider', value: settings.ai.provider, color: '#2a6fff' },
  ];

  return (
    <div className="p-6">
      <SectionTitle sub="Real-time system health and environment status.">
        System Status
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <StatusDot color={m.color === '#00e5a0' ? 'green' : m.color === '#ff4757' ? 'red' : 'blue'} pulse />
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {m.label}
                </span>
              </div>
              <div className="text-xl font-bold font-mono" style={{ color: m.color }}>
                {m.value}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Environment
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between"><span>OTel Endpoint</span><span>{settings.otel.endpoint}</span></div>
              <div className="flex justify-between"><span>OTel Enabled</span><Badge variant={settings.otel.enabled ? 'running' : 'stopped'} /></div>
              <div className="flex justify-between"><span>Theme</span><Pill>{settings.theme}</Pill></div>
              <div className="flex justify-between"><span>Dashboard Widgets</span><span>{settings.dashboardWidgets.length}</span></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Built-in Plugin: Scratch Notes ──────────────────────────────────────────
const NotesWidgetComponent = () => {
  const { getPluginSetting, setPluginSetting } = usePluginStore();
  const content = (getPluginSetting('forge-notes', 'notes.content') as string) ?? '';

  return (
    <div className="h-full">
      <textarea
        value={content}
        onChange={(e) => setPluginSetting('forge-notes', 'notes.content', e.target.value)}
        placeholder="Scratch notes — persisted to localStorage..."
        className="w-full h-full min-h-[140px] bg-transparent border-none outline-none text-xs resize-none font-mono leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      />
    </div>
  );
};

// ─── Built-in Plugin: Env Inspector ──────────────────────────────────────────
const EnvInspectorComponent = () => {
  const settings = useSettingsStore((s) => s.settings);
  const servers = useMCPStore((s) => s.servers);

  const apiKeys = [
    { name: 'Anthropic', configured: !!settings.ai.apiKeys.anthropic },
    { name: 'OpenAI', configured: !!settings.ai.apiKeys.openai },
    { name: 'Gemini', configured: !!settings.ai.apiKeys.gemini },
    { name: 'GitHub', configured: !!settings.github.accessToken },
    { name: 'Azure DevOps', configured: !!settings.ado.personalAccessToken },
  ];

  return (
    <div className="p-6">
      <SectionTitle sub="Inspect configured API keys, connected services, and environment variables.">
        Environment Inspector
      </SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              API Key Status
            </div>
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.name} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>{k.name}</span>
                  <Badge variant={k.configured ? 'running' : 'stopped'} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              AI Configuration
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between"><span>Provider</span><Pill color="#2a6fff">{settings.ai.provider}</Pill></div>
              <div className="flex justify-between"><span>Model</span><span>{settings.ai.model}</span></div>
              <div className="flex justify-between"><span>Temperature</span><span>{settings.ai.temperature}</span></div>
              <div className="flex justify-between"><span>Max Tokens</span><span>{settings.ai.maxTokens}</span></div>
              <div className="flex justify-between"><span>Local Endpoint</span><span className="truncate max-w-[180px]">{settings.ai.localEndpoint}</span></div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              MCP Servers ({servers.length})
            </div>
            <div className="space-y-2">
              {servers.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                  <div className="flex items-center gap-2">
                    <Pill color={s.transport === 'stdio' ? '#2a6fff' : s.transport === 'sse' ? '#f5a623' : '#b388ff'}>{s.transport}</Pill>
                    <Badge variant={s.status === 'running' ? 'running' : s.status === 'idle' ? 'idle' : 'stopped'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              GitHub Config
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between"><span>Token</span><Badge variant={settings.github.accessToken ? 'running' : 'stopped'} /></div>
              <div className="flex justify-between"><span>Organizations</span><span>{settings.github.orgs.length > 0 ? settings.github.orgs.join(', ') : 'none'}</span></div>
              <div className="flex justify-between"><span>Include Personal</span><span>{settings.github.includePersonal ? 'yes' : 'no'}</span></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Built-in Plugin: Obsidian Vault ─────────────────────────────────────────
interface ObsidianNote {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  updatedAt: string;
}

const DEMO_NOTES: ObsidianNote[] = [
  {
    id: '1', title: 'Architecture Decision Records', folder: 'Engineering',
    content: '# ADR-001: Use React for Frontend\n\n## Status\nAccepted\n\n## Context\nWe need a component-based UI framework that supports TypeScript and has strong ecosystem support.\n\n## Decision\nUse React 19 with TypeScript and Vite for the developer portal frontend.\n\n## Consequences\n- Large talent pool for hiring\n- Rich ecosystem of libraries\n- Strong TypeScript integration',
    tags: ['architecture', 'frontend'], updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '2', title: 'Sprint Retro Notes', folder: 'Team',
    content: '# Sprint 24 Retrospective\n\n## What went well\n- Shipped MCP integration ahead of schedule\n- Zero production incidents\n\n## What could improve\n- PR review turnaround time\n- Better test coverage on API layer\n\n## Action items\n- [ ] Set up automated PR reminders\n- [ ] Add integration test suite for /api routes',
    tags: ['retro', 'agile'], updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '3', title: 'Runbook: Deploy Pipeline', folder: 'DevOps',
    content: '# Deploy Pipeline Runbook\n\n## Prerequisites\n- Access to CI/CD dashboard\n- VPN connected\n\n## Steps\n1. Merge PR to `main`\n2. Monitor GitHub Actions workflow\n3. Verify staging deploy succeeds\n4. Approve production promotion\n5. Check Grafana dashboards post-deploy\n\n## Rollback\n```bash\ngit revert HEAD\ngit push origin main\n```',
    tags: ['devops', 'runbook'], updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '4', title: 'API Design Guidelines', folder: 'Engineering',
    content: '# API Design Guidelines\n\n## Naming\n- Use plural nouns: `/users`, `/repos`\n- Use kebab-case: `/feature-flags`\n\n## Versioning\n- Prefix with `/api/v1/`\n- Breaking changes require version bump\n\n## Response Format\n```json\n{\n  "data": {},\n  "meta": { "page": 1, "total": 42 }\n}\n```',
    tags: ['api', 'guidelines'], updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const ObsidianPageComponent = () => {
  const { getPluginSetting, setPluginSetting } = usePluginStore();
  const vaultPath = (getPluginSetting('forge-obsidian', 'vault.path') as string) ?? '';
  const connected = (getPluginSetting('forge-obsidian', 'vault.connected') as string) === 'true';

  const [notes, setNotes] = useState<ObsidianNote[]>(connected ? DEMO_NOTES : []);
  const [activeNote, setActiveNote] = useState<ObsidianNote | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localPath, setLocalPath] = useState(vaultPath);

  const folders = [...new Set(notes.map((n) => n.folder))].sort();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const filteredNotes = notes.filter((n) => {
    if (activeFolder && n.folder !== activeFolder) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q));
    }
    return true;
  });

  const handleConnect = useCallback(() => {
    if (!localPath.trim()) return;
    setPluginSetting('forge-obsidian', 'vault.path', localPath.trim());
    setPluginSetting('forge-obsidian', 'vault.connected', 'true');
    setNotes(DEMO_NOTES);
  }, [localPath, setPluginSetting]);

  const handleDisconnect = useCallback(() => {
    setPluginSetting('forge-obsidian', 'vault.connected', 'false');
    setNotes([]);
    setActiveNote(null);
  }, [setPluginSetting]);

  const handleSave = useCallback(() => {
    if (!activeNote) return;
    const updated = { ...activeNote, content: editContent, updatedAt: new Date().toISOString() };
    setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
    setActiveNote(updated);
    setEditing(false);
  }, [activeNote, editContent]);

  const handleNewNote = useCallback(() => {
    const note: ObsidianNote = {
      id: String(Date.now()),
      title: 'Untitled Note',
      content: '# Untitled Note\n\nStart writing...',
      folder: activeFolder ?? 'Inbox',
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setActiveNote(note);
    setEditing(true);
    setEditContent(note.content);
  }, [activeFolder]);

  const handleDelete = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  }, [activeNote]);

  // ── Connect prompt ──
  if (!connected) {
    return (
      <div className="p-6">
        <SectionTitle sub="Connect your Obsidian vault to browse and edit notes from the portal.">
          Obsidian Vault
        </SectionTitle>
        <div className="flex flex-col items-center justify-center py-16 gap-6 max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#7c3aed18' }}>
            <BookOpen size={40} style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Connect Obsidian Vault</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Enter your vault path to browse, search, and edit your Obsidian notes directly from Engineer Workbench.
            </p>
          </div>
          <div className="w-full space-y-3">
            <Input
              label="Vault Path"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="/Users/you/Documents/MyVault"
            />
            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <AlertTriangle size={11} className="text-[#f5a623] mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-left" style={{ color: 'var(--text-faint)' }}>
                This connects to a local vault for demo purposes. In production, this would use the Obsidian Local REST API plugin.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={handleConnect} disabled={!localPath.trim()}>
              <BookOpen size={14} /> Connect Vault
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main vault browser ──
  return (
    <div className="p-6">
      <SectionTitle sub={`Connected to ${vaultPath}`}>
        Obsidian Vault
      </SectionTitle>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <div className="w-[260px] flex-shrink-0 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full rounded-lg px-3 py-2 text-[12px] outline-none pr-8"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              />
              <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
            </div>
          </div>

          {/* Folders */}
          <div className="px-2 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5" style={{ color: 'var(--text-faint)' }}>Folders</div>
            <button
              onClick={() => setActiveFolder(null)}
              className="w-full text-left px-2 py-1.5 rounded-md text-[12px] transition-colors"
              style={{
                background: !activeFolder ? 'var(--accent-bg)' : 'transparent',
                color: !activeFolder ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: !activeFolder ? 600 : 400,
                border: 'none', cursor: 'pointer',
              }}
            >
              All Notes ({notes.length})
            </button>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className="w-full text-left px-2 py-1.5 rounded-md text-[12px] flex items-center gap-1.5 transition-colors"
                style={{
                  background: activeFolder === f ? 'var(--accent-bg)' : 'transparent',
                  color: activeFolder === f ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: activeFolder === f ? 600 : 400,
                  border: 'none', cursor: 'pointer',
                }}
              >
                <FolderOpen size={12} />
                {f} ({notes.filter((n) => n.folder === f).length})
              </button>
            ))}
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                Notes ({filteredNotes.length})
              </span>
              <button
                onClick={handleNewNote}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                title="New note"
              >
                <Plus size={14} />
              </button>
            </div>
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => { setActiveNote(note); setEditing(false); }}
                className="px-2 py-2 rounded-lg cursor-pointer transition-colors mb-0.5"
                style={{
                  background: activeNote?.id === note.id ? 'var(--accent-bg)' : 'transparent',
                  borderLeft: activeNote?.id === note.id ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (activeNote?.id !== note.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (activeNote?.id !== note.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-start gap-2">
                  <FileText size={12} className="flex-shrink-0 mt-0.5" style={{ color: activeNote?.id === note.id ? 'var(--accent)' : 'var(--text-faint)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate" style={{ color: activeNote?.id === note.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {note.title}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                      {note.folder} &middot; {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {note.tags.map((t) => (
                          <span key={t} className="text-[9px] px-1 py-0.5 rounded" style={{ background: '#7c3aed18', color: '#7c3aed' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="w-full">
              Disconnect Vault
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          {activeNote ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <BookOpen size={16} style={{ color: '#7c3aed' }} />
                <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                  {activeNote.title}
                </span>
                <Pill color="#7c3aed">{activeNote.folder}</Pill>
                {editing ? (
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    <Save size={12} /> Save
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setEditContent(activeNote.content); }}>
                    Edit
                  </Button>
                )}
                <button
                  onClick={() => handleDelete(activeNote.id)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--text-faint)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#d32f2f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {editing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full min-h-[400px] bg-transparent border-none outline-none text-[13px] font-mono leading-relaxed resize-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {activeNote.content.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-0 mb-3" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</h1>;
                      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</h2>;
                      if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</h3>;
                      if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-center gap-2 py-0.5"><input type="checkbox" disabled className="accent-[#7c3aed]" /><span>{line.slice(6)}</span></div>;
                      if (line.startsWith('- ')) return <div key={i} className="pl-4 py-0.5">&bull; {line.slice(2)}</div>;
                      if (line.startsWith('```')) return <div key={i} className="font-mono text-[11px] py-0.5" style={{ color: 'var(--text-faint)' }}>{line}</div>;
                      if (line.match(/^\d+\. /)) return <div key={i} className="pl-4 py-0.5">{line}</div>;
                      if (!line.trim()) return <br key={i} />;
                      return <p key={i} className="py-0.5">{line}</p>;
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<BookOpen size={40} />}
                title="Select a note to view"
                body="Choose a note from the sidebar or create a new one"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Built-in Plugin: Obsidian Collection Widget ────────────────────────────
const ObsidianCollectionWidget = () => {
  const { getPluginSetting } = usePluginStore();
  const connected = (getPluginSetting('forge-obsidian', 'vault.connected') as string) === 'true';

  const [notes] = useState<ObsidianNote[]>(connected ? DEMO_NOTES : []);
  const [selectedNote, setSelectedNote] = useState<ObsidianNote | null>(null);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.tags.some((t) => t.includes(search.toLowerCase())))
    : notes;

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <BookOpen size={28} style={{ color: 'var(--text-faint)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
          No vault connected
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Enable the Obsidian plugin and connect a vault to view your notes here.
        </span>
      </div>
    );
  }

  // ── Note detail view ──
  if (selectedNote) {
    const lines = selectedNote.content.split('\n');
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => { setSelectedNote(null); setEditMode(false); }}
            className="text-[11px] font-medium"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            &larr; Back
          </button>
          <span className="flex-1 text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {selectedNote.title}
          </span>
          <button
            onClick={() => {
              if (editMode) { setEditMode(false); } else { setEditContent(selectedNote.content); setEditMode(true); }
            }}
            className="text-[10px] font-semibold px-2 py-1 rounded-md"
            style={{
              color: editMode ? '#2e7d32' : 'var(--accent)',
              background: editMode ? '#2e7d3215' : 'var(--accent-bg)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {editMode ? 'Preview' : 'Edit'}
          </button>
        </div>
        <div className="flex gap-1 mb-2 flex-wrap">
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#7c3aed18', color: '#7c3aed' }}>{selectedNote.folder}</span>
          {selectedNote.tags.map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>#{t}</span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {editMode ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full min-h-[120px] bg-transparent border-none outline-none text-[11px] font-mono leading-relaxed resize-none"
              style={{ color: 'var(--text-primary)' }}
            />
          ) : (
            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {lines.map((line, i) => {
                if (line.startsWith('# ')) return <div key={i} className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</div>;
                if (line.startsWith('## ')) return <div key={i} className="text-[12px] font-bold mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</div>;
                if (line.startsWith('### ')) return <div key={i} className="text-[11px] font-bold mt-1.5 mb-0.5" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</div>;
                if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-center gap-1.5 py-0.5 pl-2"><input type="checkbox" disabled className="accent-[#7c3aed]" style={{ width: 12, height: 12 }} /><span>{line.slice(6)}</span></div>;
                if (line.startsWith('- ')) return <div key={i} className="pl-3 py-0.5">&bull; {line.slice(2)}</div>;
                if (line.startsWith('```')) return <div key={i} className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{line}</div>;
                if (line.match(/^\d+\. /)) return <div key={i} className="pl-3 py-0.5">{line}</div>;
                if (!line.trim()) return <div key={i} className="h-1.5" />;
                return <div key={i} className="py-0.5">{line}</div>;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Collection list view ──
  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-lg px-3 py-1.5 text-[11px] outline-none pr-7"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
        />
        <Search size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>No notes found</span>
          </div>
        ) : (
          filtered.map((note) => {
            const preview = note.content.split('\n').find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('```'));
            return (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-start gap-2">
                  <FileText size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#7c3aed' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{note.title}</div>
                    {preview && (
                      <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>
                        {preview.slice(0, 60)}{preview.length > 60 ? '...' : ''}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>{note.folder}</span>
                      {note.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[8px] px-1 py-0.5 rounded" style={{ background: '#7c3aed12', color: '#7c3aed' }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={12} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 2 }} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="pt-2 mt-1 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>
          {notes.length} notes &middot; {[...new Set(notes.map((n) => n.folder))].length} folders
        </span>
      </div>
    </div>
  );
};

// ─── Built-in Plugins ────────────────────────────────────────────────────────
export const BUILT_IN_PLUGINS: ForgePlugin[] = [
  createForgePlugin({
    id: 'forge-status-page',
    name: 'System Status',
    description: 'Real-time system health dashboard showing telemetry metrics, MCP server status, and environment configuration.',
    version: '1.0.0',
    author: 'DevDock Team',
    icon: 'HeartPulse',
    category: 'plugin',
    context: 'global',
    enabled: true,
    tags: ['observability', 'health', 'monitoring'],
    pages: [{ path: '/status', title: 'System Status', component: StatusPageComponent }],
    navItems: [{ to: '/status', icon: HeartPulse, label: 'Status' }],
  }),

  createForgePlugin({
    id: 'forge-notes',
    name: 'Scratch Notes',
    description: 'A simple persistent notepad widget for your dashboard. Great for quick notes, TODOs, and scratch work.',
    version: '1.0.0',
    author: 'DevDock Team',
    icon: 'StickyNote',
    category: 'widget',
    context: 'dashboard',
    enabled: true,
    tags: ['productivity', 'notes', 'dashboard'],
    widgets: [{
      id: 'plugin:notes:scratchpad',
      title: 'Scratch Notes',
      icon: '📝',
      description: 'Persistent notepad widget',
      defaultSize: 'sm',
      component: NotesWidgetComponent,
    }],
    settings: [{ key: 'notes.content', label: 'Notes Content', type: 'text', defaultValue: '' }],
  }),

  createForgePlugin({
    id: 'forge-env-inspector',
    name: 'Env Inspector',
    description: 'Inspect configured API keys, connected services, MCP servers, and environment settings at a glance.',
    version: '1.0.0',
    author: 'DevDock Team',
    icon: 'ShieldCheck',
    category: 'integration',
    context: 'global',
    enabled: true,
    tags: ['config', 'security', 'environment'],
    pages: [{ path: '/env-inspector', title: 'Environment Inspector', component: EnvInspectorComponent }],
    navItems: [{ to: '/env-inspector', icon: ShieldCheck, label: 'Env Inspector' }],
  }),

  createForgePlugin({
    id: 'forge-obsidian',
    name: 'Obsidian',
    description: 'Connect and edit your Obsidian vault notes directly from Engineer Workbench. Browse folders, search, create, and edit markdown notes.',
    version: '1.0.0',
    author: 'DevDock Team',
    icon: 'BookOpen',
    category: 'integration',
    context: 'global',
    enabled: true,
    tags: ['obsidian', 'notes', 'markdown', 'knowledge-base', 'vault'],
    pages: [{ path: '/obsidian', title: 'Obsidian Vault', component: ObsidianPageComponent }],
    navItems: [{ to: '/obsidian', icon: BookOpen, label: 'Obsidian' }],
    settings: [
      { key: 'vault.path', label: 'Vault Path', type: 'text', defaultValue: '' },
      { key: 'vault.connected', label: 'Connected', type: 'toggle', defaultValue: false },
    ],
  }),

  createForgePlugin({
    id: 'forge-obsidian-collection',
    name: 'Obsidian Collection Viewer',
    description: 'A dashboard widget to browse, search, and interact with your Obsidian vault notes. View markdown content, edit inline, and navigate between notes without leaving the dashboard.',
    version: '1.0.0',
    author: 'DevDock Team',
    icon: 'BookOpen',
    category: 'widget',
    context: 'dashboard',
    enabled: true,
    tags: ['obsidian', 'notes', 'markdown', 'dashboard', 'widget', 'collection'],
    widgets: [{
      id: 'plugin:obsidian:collection',
      title: 'Obsidian Collection',
      icon: '📓',
      description: 'Browse and interact with Obsidian vault notes',
      defaultSize: 'md',
      component: ObsidianCollectionWidget,
    }],
  }),
];
