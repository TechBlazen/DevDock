/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { HeartPulse, ShieldCheck } from 'lucide-react';
import { usePluginStore, useSettingsStore, useMCPStore, useTelemetryStore } from '../store';
import { Card, SectionTitle, StatusDot, Badge, Pill } from '../components/ui';
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
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(0,0,0,0.5)' }}>
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
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>
              Environment
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'rgba(0,0,0,0.7)' }}>
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
        style={{ color: 'rgba(0,0,0,0.7)' }}
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
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>
              API Key Status
            </div>
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.name} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'rgba(0,0,0,0.7)' }}>{k.name}</span>
                  <Badge variant={k.configured ? 'running' : 'stopped'} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>
              AI Configuration
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'rgba(0,0,0,0.7)' }}>
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
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>
              MCP Servers ({servers.length})
            </div>
            <div className="space-y-2">
              {servers.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono" style={{ color: 'rgba(0,0,0,0.7)' }}>{s.name}</span>
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
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>
              GitHub Config
            </div>
            <div className="space-y-2 text-xs font-mono" style={{ color: 'rgba(0,0,0,0.7)' }}>
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

// ─── Built-in Plugins ────────────────────────────────────────────────────────
export const BUILT_IN_PLUGINS: ForgePlugin[] = [
  createForgePlugin({
    id: 'forge-status-page',
    name: 'System Status',
    description: 'Real-time system health dashboard showing telemetry metrics, MCP server status, and environment configuration.',
    version: '1.0.0',
    author: 'Forge Team',
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
    author: 'Forge Team',
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
    author: 'Forge Team',
    icon: 'ShieldCheck',
    category: 'integration',
    context: 'global',
    enabled: true,
    tags: ['config', 'security', 'environment'],
    pages: [{ path: '/env-inspector', title: 'Environment Inspector', component: EnvInspectorComponent }],
    navItems: [{ to: '/env-inspector', icon: ShieldCheck, label: 'Env Inspector' }],
  }),
];
