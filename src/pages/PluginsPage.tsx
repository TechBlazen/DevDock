import { useState } from 'react';
import {
  HeartPulse, StickyNote, ShieldCheck, Puzzle, BookOpen,
  ChevronDown, ChevronUp, Globe, Layout, Link2,
  Check, X, Clock, Send,
  type LucideIcon,
} from 'lucide-react';
import { usePluginStore, useAuthStore } from '../store';
import { usePluginSubmissionStore } from '../store/plugin-submission-store';
import { SectionTitle, Card, CardHeader, Pill, Toggle, Button, Input } from '../components/ui';
import type { PluginCategory, PluginSubmission } from '../types';

const ICON_MAP: Record<string, LucideIcon> = {
  HeartPulse, StickyNote, ShieldCheck, Puzzle, Globe, Layout, Link2, BookOpen,
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

// ─── Plugin Submission Form ──────────────────────────────────────────────────
const PluginSubmitForm = () => {
  const currentUser = useAuthStore((s) => s.user);
  const { submitPlugin } = usePluginSubmissionStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [icon, setIcon] = useState('Puzzle');
  const [category, setCategory] = useState<PluginCategory>('plugin');
  const [tags, setTags] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;
    submitPlugin({
      name: name.trim(),
      description: description.trim(),
      version,
      author: currentUser?.displayName ?? 'Unknown',
      icon,
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      submittedBy: currentUser?.id ?? '',
      submittedByName: currentUser?.displayName ?? 'Unknown',
    });
    setName('');
    setDescription('');
    setVersion('1.0.0');
    setTags('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-lg">
      <p className="text-[13px] mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Submit a plugin idea for review. An administrator will review your submission before it becomes available in the marketplace.
      </p>
      <Card>
        <CardHeader>
          <Send size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Submit Plugin</span>
        </CardHeader>
        <div className="p-5 space-y-4">
          <Input label="Plugin Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Plugin" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this plugin do?"
              rows={3}
              className="w-full rounded-md px-3 py-2 text-[13px] outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PluginCategory)}
                className="rounded-md px-3 py-2 text-[13px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              >
                <option value="plugin">Plugin</option>
                <option value="widget">Widget</option>
                <option value="integration">Integration</option>
                <option value="template">Template</option>
              </select>
            </div>
          </div>
          <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="productivity, devops, monitoring" />
          <Input label="Icon (lucide icon name)" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Puzzle" />

          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!name.trim() || !description.trim()}>
            {submitted ? <><Check size={13} /> Submitted!</> : <><Send size={13} /> Submit for Review</>}
          </Button>
        </div>
      </Card>

      {/* My submissions */}
      <MySubmissions />
    </div>
  );
};

// ─── My Submissions List ─────────────────────────────────────────────────────
const MySubmissions = () => {
  const currentUser = useAuthStore((s) => s.user);
  const { submissions } = usePluginSubmissionStore();
  const mine = submissions.filter((s) => s.submittedBy === currentUser?.id);

  if (mine.length === 0) return null;

  const statusColor = (s: PluginSubmission['status']) =>
    s === 'approved' ? '#2e7d32' : s === 'rejected' ? '#d32f2f' : '#f5a623';
  const statusIcon = (s: PluginSubmission['status']) =>
    s === 'approved' ? Check : s === 'rejected' ? X : Clock;

  return (
    <div className="mt-6">
      <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>My Submissions</h3>
      <div className="space-y-2">
        {mine.map((sub) => {
          const StatusIcon = statusIcon(sub.status);
          return (
            <Card key={sub.id}>
              <div className="p-3 flex items-center gap-3">
                <StatusIcon size={16} style={{ color: statusColor(sub.status) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{sub.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(sub.submittedAt).toLocaleDateString()} &middot; {sub.status}
                  </div>
                </div>
                <Pill color={statusColor(sub.status)}>{sub.status}</Pill>
                {sub.status === 'rejected' && sub.rejectionReason && (
                  <span className="text-[10px] max-w-[200px] truncate" style={{ color: '#d32f2f' }} title={sub.rejectionReason}>
                    {sub.rejectionReason}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ─── Admin Approval Panel ────────────────────────────────────────────────────
const PluginApprovalPanel = () => {
  const currentUser = useAuthStore((s) => s.user);
  const { submissions, approveSubmission, rejectSubmission } = usePluginSubmissionStore();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pending = submissions.filter((s) => s.status === 'pending');
  const reviewed = submissions.filter((s) => s.status !== 'pending');

  const handleReject = (id: string) => {
    rejectSubmission(id, currentUser?.id ?? '', rejectReason);
    setRejectId(null);
    setRejectReason('');
  };

  return (
    <div>
      <p className="text-[13px] mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Review and approve plugin submissions from users. Approved plugins will appear in the marketplace for all users.
      </p>

      {/* Pending */}
      <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Clock size={14} style={{ color: '#f5a623' }} />
        Pending Review ({pending.length})
      </h3>

      {pending.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
            No pending submissions
          </div>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {pending.map((sub) => (
            <Card key={sub.id}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5a62318', border: '1px solid #f5a62330' }}>
                    {(() => { const I = ICON_MAP[sub.icon] ?? Puzzle; return <I size={20} style={{ color: '#f5a623' }} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{sub.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      by {sub.submittedByName} &middot; {new Date(sub.submittedAt).toLocaleDateString()} &middot; v{sub.version}
                    </div>
                    <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{sub.description}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Pill color={CATEGORY_COLORS[sub.category]}>{sub.category}</Pill>
                      {sub.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {rejectId === sub.id ? (
                  <div className="mt-3 pt-3 space-y-2 animate-[fadeIn_0.15s_ease]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <Input label="Rejection Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm" onClick={() => handleReject(sub.id)} disabled={!rejectReason.trim()}>
                        <X size={12} /> Reject
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <Button variant="success" size="sm" onClick={() => approveSubmission(sub.id, currentUser?.id ?? '')}>
                      <Check size={12} /> Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setRejectId(sub.id)}>
                      <X size={12} /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reviewed history */}
      {reviewed.length > 0 && (
        <>
          <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Review History</h3>
          <div className="space-y-2">
            {reviewed.map((sub) => (
              <Card key={sub.id}>
                <div className="p-3 flex items-center gap-3">
                  {sub.status === 'approved' ? <Check size={14} style={{ color: '#2e7d32' }} /> : <X size={14} style={{ color: '#d32f2f' }} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{sub.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      by {sub.submittedByName} &middot; Reviewed {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <Pill color={sub.status === 'approved' ? '#2e7d32' : '#d32f2f'}>{sub.status}</Pill>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export const PluginsPage = () => {
  const { plugins, enabledPlugins, togglePlugin } = usePluginStore();
  const currentUser = useAuthStore((s) => s.user);
  const { submissions } = usePluginSubmissionStore();
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'submit' | 'approval'>('marketplace');
  const isAdmin = currentUser?.role === 'admin';
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  const filtered = filter === 'all' ? plugins : plugins.filter((p) => p.category === filter);
  const enabledCount = plugins.filter((p) => enabledPlugins[p.id]).length;
  const totalPages = plugins.reduce((n, p) => n + (enabledPlugins[p.id] ? (p.pages?.length ?? 0) : 0), 0);
  const totalWidgets = plugins.reduce((n, p) => n + (enabledPlugins[p.id] ? (p.widgets?.length ?? 0) : 0), 0);

  return (
    <div className="p-6">
      <SectionTitle sub="Browse, enable, and develop plugins that extend DevDock.">
        Plugin Marketplace
      </SectionTitle>

      {/* Tabs */}
      <div className="flex gap-2 mb-8" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 0 }}>
        {([
          { key: 'marketplace' as const, label: 'Marketplace' },
          { key: 'submit' as const, label: 'Submit Plugin' },
          ...(isAdmin ? [{ key: 'approval' as const, label: `Pending Approval${pendingCount > 0 ? ` (${pendingCount})` : ''}` }] : []),
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="text-[13px] font-semibold transition-colors"
            style={{
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              background: activeTab === tab.key ? 'var(--accent-bg)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '3px solid var(--accent)' : '3px solid transparent',
              padding: '10px 20px',
              marginBottom: -2,
              borderRadius: '6px 6px 0 0',
            }}
            onMouseEnter={(e) => { if (activeTab !== tab.key) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (activeTab !== tab.key) e.currentTarget.style.background = 'transparent'; }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'submit' && <PluginSubmitForm />}
      {activeTab === 'approval' && isAdmin && <PluginApprovalPanel />}

      {activeTab === 'marketplace' && <>
      {!isAdmin && (
        <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2" style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444',
        }}>
          <ShieldCheck size={16} />
          <span className="text-xs font-medium">Only administrators can enable or disable plugins. Contact an admin to modify plugin settings.</span>
        </div>
      )}

      {/* Summary chips */}
      <div className="flex gap-3 mb-0 flex-wrap">
        {[
          { label: 'Total', value: plugins.length, color: '#2a6fff' },
          { label: 'Enabled', value: enabledCount, color: '#00e5a0' },
          { label: 'Pages', value: totalPages, color: '#f5a623' },
          { label: 'Widgets', value: totalWidgets, color: '#b388ff' },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{
            background: `${c.color}10`,
            border: `1px solid ${c.color}25`,
          }}>
            <span className="text-[11px] font-bold" style={{ color: c.color }}>{c.value}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 16, marginBottom: 16 }} />

      {/* Category filter */}
      <div className="flex gap-2 mb-0 flex-wrap">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="font-semibold transition-all"
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              fontSize: 12,
              ...(filter === key
                ? {
                    background: 'var(--accent)',
                    color: '#ffffff',
                    border: '1px solid var(--accent)',
                    boxShadow: 'var(--shadow-sm)',
                  }
                : {
                    background: 'var(--bg-surface)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                  }),
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { if (filter !== key) e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { if (filter !== key) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 16, marginBottom: 24 }} />

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
                    disabled={!isAdmin}
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
          Extend DevDock by creating plugins. Plugins are plain TypeScript objects — no build tooling or npm packaging required.
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
      </>}
    </div>
  );
};
