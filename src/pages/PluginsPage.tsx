import { useState } from 'react';
import {
  HeartPulse, StickyNote, ShieldCheck, Puzzle,
  ChevronDown, ChevronUp, Globe, Layout, Link2,
  type LucideIcon,
} from 'lucide-react';
import { usePluginStore } from '../store';
import { SectionTitle, Card, Pill, Toggle } from '../components/ui';
import type { PluginCategory } from '../types';

const ICON_MAP: Record<string, LucideIcon> = {
  HeartPulse, StickyNote, ShieldCheck, Puzzle, Globe, Layout, Link2,
};

const CATEGORY_COLORS: Record<PluginCategory, string> = {
  plugin: '#2a6fff',
  template: '#00e5a0',
  integration: '#f5a623',
  widget: '#b388ff',
  example: '#ff6b8a',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  plugin: 'Plugins',
  widget: 'Widgets',
  integration: 'Integrations',
  template: 'Templates',
  example: 'Examples',
};

export const PluginsPage = () => {
  const { plugins, enabledPlugins, togglePlugin } = usePluginStore();
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === 'all' ? plugins : plugins.filter((p) => p.category === filter);
  const enabledCount = plugins.filter((p) => enabledPlugins[p.id]).length;
  const totalPages = plugins.reduce((n, p) => n + (enabledPlugins[p.id] ? (p.pages?.length ?? 0) : 0), 0);
  const totalWidgets = plugins.reduce((n, p) => n + (enabledPlugins[p.id] ? (p.widgets?.length ?? 0) : 0), 0);

  return (
    <div className="p-6">
      <SectionTitle sub="Browse, enable, and develop plugins that extend Forge Portal.">
        Plugin Marketplace
      </SectionTitle>

      {/* Summary chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { label: 'Total', value: plugins.length, color: '#2a6fff' },
          { label: 'Enabled', value: enabledCount, color: '#00e5a0' },
          { label: 'Pages', value: totalPages, color: '#f5a623' },
          { label: 'Widgets', value: totalWidgets, color: '#b388ff' },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{
            background: `${c.color}10`,
            border: `1px solid ${c.color}25`,
          }}>
            <span className="text-[10px] font-semibold" style={{ color: c.color }}>{c.value}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={
              filter === key
                ? {
                    background: 'rgba(42, 111, 255, 0.12)',
                    color: '#2a6fff',
                    border: '1px solid rgba(42, 111, 255, 0.3)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plugin cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {filtered.map((plugin) => {
          const Icon = ICON_MAP[plugin.icon] ?? Puzzle;
          const color = CATEGORY_COLORS[plugin.category] ?? '#2a6fff';
          const isEnabled = enabledPlugins[plugin.id] ?? false;
          const isExpanded = expanded === plugin.id;

          return (
            <Card key={plugin.id}>
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {plugin.name}
                      </span>
                      <Pill color="rgba(0,0,0,0.3)">{plugin.version}</Pill>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      by {plugin.author}
                    </div>
                  </div>
                  <Toggle
                    checked={isEnabled}
                    onChange={() => togglePlugin(plugin.id)}
                    color={color}
                  />
                </div>

                {/* Description */}
                <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {plugin.description}
                </p>

                {/* Tags + badges */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <Pill color={color}>{plugin.category}</Pill>
                  <Pill color="rgba(0,0,0,0.3)">{plugin.context}</Pill>
                  {plugin.tags?.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{
                      background: 'var(--bg-inset)',
                      color: 'var(--text-muted)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Expand/collapse detail */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : plugin.id)}
                  className="flex items-center gap-1 mt-3 text-[10px] font-medium transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = color}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isExpanded ? 'Less' : 'Details'}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 space-y-2 text-[11px] animate-[fadeIn_0.2s_ease]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {plugin.pages && plugin.pages.length > 0 && (
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Pages: </span>
                        {plugin.pages.map((p) => (
                          <Pill key={p.path} color="#2a6fff">{p.path}</Pill>
                        ))}
                      </div>
                    )}
                    {plugin.widgets && plugin.widgets.length > 0 && (
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Widgets: </span>
                        {plugin.widgets.map((w) => (
                          <Pill key={w.id} color="#b388ff">{w.title}</Pill>
                        ))}
                      </div>
                    )}
                    {plugin.navItems && plugin.navItems.length > 0 && (
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Nav items: </span>
                        <span style={{ color: 'var(--text-muted)' }}>{plugin.navItems.map((n) => n.label).join(', ')}</span>
                      </div>
                    )}
                    {plugin.settings && plugin.settings.length > 0 && (
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Settings: </span>
                        <span style={{ color: 'var(--text-muted)' }}>{plugin.settings.map((s) => s.label).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Develop a Plugin section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Develop a Plugin</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
          Extend Forge Portal by creating plugins. Plugins are plain TypeScript objects — no build tooling or npm packaging required.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plugin Interface */}
        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Plugin Interface
            </div>
            <pre className="text-[11px] font-mono leading-relaxed p-3 rounded-lg overflow-x-auto" style={{
              background: 'var(--bg-inset)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}>{`interface ForgePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;       // lucide icon name
  category: 'plugin' | 'template'
    | 'integration' | 'widget' | 'example';
  context: 'global' | 'dashboard' | 'entity';
  enabled: boolean;

  // Extension points
  pages?: PluginPage[];
  widgets?: PluginWidget[];
  navItems?: PluginNavItem[];
  settings?: PluginSetting[];
}`}</pre>
          </div>
        </Card>

        {/* Starter Template */}
        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Starter Template
            </div>
            <pre className="text-[11px] font-mono leading-relaxed p-3 rounded-lg overflow-x-auto" style={{
              background: 'var(--bg-inset)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}>{`import { createForgePlugin } from './plugins';
import { MyIcon } from 'lucide-react';

const MyPage = () => (
  <div className="p-6">
    <h1>My Plugin Page</h1>
  </div>
);

export default createForgePlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'A custom plugin.',
  version: '0.1.0',
  author: 'Your Name',
  icon: 'Puzzle',
  category: 'plugin',
  context: 'global',
  enabled: true,
  pages: [{
    path: '/my-plugin',
    title: 'My Plugin',
    component: MyPage,
  }],
  navItems: [{
    to: '/my-plugin',
    icon: MyIcon,
    label: 'My Plugin',
  }],
});`}</pre>
          </div>
        </Card>

        {/* What Plugins Can Do */}
        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              What Plugins Can Do
            </div>
            <ul className="space-y-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {[
                ['Add Pages', 'Register new routes with full-page React components'],
                ['Add Widgets', 'Contribute drag-drop dashboard widgets'],
                ['Add Nav Items', 'Insert sidebar navigation entries'],
                ['Add Settings', 'Register configuration fields persisted to localStorage'],
                ['Access Stores', 'Read/write to all Zustand stores (auth, settings, MCP, repos, etc.)'],
                ['Use UI Kit', 'Import Button, Card, Input, Toggle, Badge, Pill, Spinner, and more'],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-2">
                  <span className="text-[#2a6fff] font-bold flex-shrink-0">›</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{title}</strong> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Available SDK */}
        <Card>
          <div className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Available SDK
            </div>
            <div className="space-y-3 text-[11px]">
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>UI Components</div>
                <div className="flex gap-1 flex-wrap">
                  {['Button', 'Card', 'CardHeader', 'Input', 'Toggle', 'Badge', 'Pill', 'StatusDot', 'Spinner', 'SectionTitle', 'EmptyState', 'Tooltip'].map((c) => (
                    <Pill key={c} color="#2a6fff">{c}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Zustand Stores</div>
                <div className="flex gap-1 flex-wrap">
                  {['useAuthStore', 'useSettingsStore', 'useMCPStore', 'useChatStore', 'useRepoStore', 'useTelemetryStore', 'usePluginStore'].map((s) => (
                    <Pill key={s} color="#00e5a0">{s}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Registration</div>
                <p style={{ color: 'var(--text-muted)' }}>
                  Add your plugin to the <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-inset)' }}>BUILT_IN_PLUGINS</code> array in <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-inset)' }}>src/lib/plugins.ts</code>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
