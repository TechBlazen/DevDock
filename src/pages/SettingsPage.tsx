import { useState, type ReactNode } from 'react';
import {
  Key, Activity, GitFork, GitBranch, Code2, Save, Check, Lock, AlertTriangle, Globe,
  ChevronDown, ChevronRight, LayoutDashboard, Shield, Plus, Trash2, Users,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useSettingsStore } from '../store';
import { FederatedSourcesPage } from './FederatedSourcesPage';
import { initOTel } from '../otel';
import { SectionTitle, Input, Toggle, Button, Card, CardHeader } from '../components/ui';
import { NavigationEditor } from '../components/settings/NavigationEditor';
import type { AIProvider, UserRole, ActiveDirectorySecurityGroup } from '../types';

const providers: { id: AIProvider; label: string; color: string; placeholder: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)',  color: '#cc785c', placeholder: 'sk-ant-api03-...' },
  { id: 'openai',    label: 'OpenAI (GPT-4o)',     color: '#10a37f', placeholder: 'sk-proj-...' },
  { id: 'gemini',    label: 'Google Gemini',       color: '#4285f4', placeholder: 'AIza...' },
  { id: 'local',     label: 'Local (Ollama)',      color: '#b388ff', placeholder: 'no key needed' },
];

// ─── Collapsible Section ─────────────────────────────────────────────────────
const CollapsibleSection = ({
  icon,
  iconColor,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  icon: ReactNode;
  iconColor?: string;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-sm font-bold uppercase tracking-wider mb-0 flex items-center gap-2 cursor-pointer select-none"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '2px solid var(--border-subtle)',
          paddingBottom: 8,
          background: 'none',
          border: 'none',
          borderBlockEnd: '2px solid var(--border-subtle)',
        }}
      >
        <span className={iconColor ? `text-[${iconColor}]` : ''} style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        {title}
        <span className="ml-auto" style={{ color: 'var(--text-faint)' }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {description && (
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {open && (
        <div className="mt-4 animate-[fadeIn_0.15s_ease]">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Active Directory Settings ───────────────────────────────────────────────
const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: '#dc2626' },
  { value: 'editor', label: 'Editor', color: '#2a6fff' },
  { value: 'viewer', label: 'Viewer', color: '#2e7d32' },
];

const ActiveDirectorySettings = ({
  config,
  onUpdate,
}: {
  config: AppSettings['activeDirectory'];
  onUpdate: (partial: Partial<AppSettings['activeDirectory']>) => void;
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupRole, setNewGroupRole] = useState<UserRole>('viewer');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const group: ActiveDirectorySecurityGroup = {
      id: nanoid(8),
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      role: newGroupRole,
    };
    onUpdate({ securityGroups: [...config.securityGroups, group] });
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupRole('viewer');
  };

  const removeGroup = (id: string) => {
    onUpdate({ securityGroups: config.securityGroups.filter((g) => g.id !== id) });
  };

  const updateGroupRole = (id: string, role: UserRole) => {
    onUpdate({
      securityGroups: config.securityGroups.map((g) => g.id === id ? { ...g, role } : g),
    });
  };

  const handleTestConnection = () => {
    setTestStatus('testing');
    // Simulate connection test
    setTimeout(() => {
      if (config.tenantId && config.clientId && config.domain) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Connection toggle */}
      <Card>
        <CardHeader>
          <Shield size={14} className="text-[#0078d4]" />
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Connection</span>
          <div className="flex-1" />
          <Toggle
            checked={config.enabled}
            onChange={(v) => onUpdate({ enabled: v })}
            label={config.enabled ? 'Enabled' : 'Disabled'}
            color="#0078d4"
          />
        </CardHeader>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Azure AD Tenant ID"
              value={config.tenantId}
              onChange={(e) => onUpdate({ tenantId: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <Input
              label="Domain"
              value={config.domain}
              onChange={(e) => onUpdate({ domain: e.target.value })}
              placeholder="contoso.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Client ID (App Registration)"
              value={config.clientId}
              onChange={(e) => onUpdate({ clientId: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Client Secret</label>
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-[var(--text-faint)] flex-shrink-0" />
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => onUpdate({ clientSecret: e.target.value })}
                  placeholder="Client secret..."
                  className="flex-1 rounded-md px-3 py-2 text-[13px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              LDAP Configuration (Optional)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="LDAP URL"
                value={config.ldapUrl}
                onChange={(e) => onUpdate({ ldapUrl: e.target.value })}
                placeholder="ldaps://dc.contoso.com:636"
              />
              <Input
                label="Base DN"
                value={config.baseDn}
                onChange={(e) => onUpdate({ baseDn: e.target.value })}
                placeholder="DC=contoso,DC=com"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
            >
              {testStatus === 'testing' ? (
                <>Testing...</>
              ) : testStatus === 'success' ? (
                <><Check size={12} className="text-[#2e7d32]" /> Connected</>
              ) : testStatus === 'error' ? (
                <><AlertTriangle size={12} className="text-[#d32f2f]" /> Failed</>
              ) : (
                <>Test Connection</>
              )}
            </Button>
            {testStatus === 'error' && (
              <span className="text-[11px]" style={{ color: '#d32f2f' }}>
                Please fill in Tenant ID, Client ID, and Domain
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Security Groups */}
      <Card>
        <CardHeader>
          <Users size={14} className="text-[#0078d4]" />
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Security Groups</span>
          <div className="flex-1" />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>
            {config.securityGroups.length} group{config.securityGroups.length !== 1 ? 's' : ''}
          </span>
        </CardHeader>
        <div className="p-5 space-y-4">
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Map Active Directory security groups to portal roles. Users in these groups will be automatically assigned the corresponding role when they sign in via AD.
          </p>

          {/* Existing groups */}
          {config.securityGroups.length > 0 && (
            <div className="space-y-2">
              {config.securityGroups.map((group) => {
                const roleInfo = ROLE_OPTIONS.find((r) => r.value === group.role);
                return (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
                  >
                    <Users size={14} style={{ color: '#0078d4', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {group.name}
                      </div>
                      {group.description && (
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {group.description}
                        </div>
                      )}
                    </div>
                    <select
                      value={group.role}
                      onChange={(e) => updateGroupRole(group.id, e.target.value as UserRole)}
                      className="text-[11px] font-semibold rounded-md px-2 py-1 outline-none"
                      style={{
                        background: `${roleInfo?.color}12`,
                        color: roleInfo?.color,
                        border: `1px solid ${roleInfo?.color}40`,
                      }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--text-faint)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#d32f2f'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
                      title="Remove group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new group */}
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-inset)', border: '1px dashed var(--border-color)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Add Security Group
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. SG-Portal-Admins"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Assigned Role</label>
                  <select
                    value={newGroupRole}
                    onChange={(e) => setNewGroupRole(e.target.value as UserRole)}
                    className="rounded-md px-3 py-2 text-[13px] outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Input
                label="Description (optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="e.g. Portal administrators with full access"
              />
              <Button variant="outline" size="sm" onClick={addGroup} disabled={!newGroupName.trim()}>
                <Plus size={12} /> Add Group
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: '#0078d408', border: '1px solid #0078d41a' }}>
            <Shield size={12} className="text-[#0078d4] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
              Security groups are synced from Active Directory. Users are automatically provisioned with the mapped role when they authenticate.
              Groups can be nested — users inherit the highest-privilege role from all their group memberships.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── Import AppSettings type for AD component ────────────────────────────────
import type { AppSettings } from '../types';

export const SettingsPage = () => {
  const {
    settings,
    updateApiKey,
    updateOTelConfig,
    updateGitHubConfig,
    updateADOConfig,
    updateActiveDirectoryConfig,
  } = useSettingsStore();

  const [saved, setSaved] = useState(false);
  const [otelApplied, setOtelApplied] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleApplyOTel = () => {
    initOTel({
      endpoint: settings.otel.endpoint,
      exportTraces: settings.otel.exportTraces,
      exportMetrics: settings.otel.exportMetrics,
    });
    setOtelApplied(true);
    setTimeout(() => setOtelApplied(false), 2500);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      <SectionTitle sub="Configure AI providers, OpenTelemetry, and version control integrations">
        Settings
      </SectionTitle>

      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, marginBottom: 30 }} />

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 1 — Sidebar Navigation (placeholder for nav editor PR)
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<LayoutDashboard size={16} className="text-[#8b5cf6]" />}
        title="Sidebar Navigation"
        description="Customize the sidebar layout by adding, removing, or reordering navigation items. Supports groups, dividers, and external links."
      >
        <NavigationEditor />
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 2 — Organizations & Repositories
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<GitFork size={16} className="text-[#8090b0]" />}
        title="Organizations &amp; Repositories"
        description="Connect your GitHub and Azure DevOps accounts to browse repositories. Add access tokens and specify which organizations or projects to include."
      >
        <div className="space-y-4">
          {/* GitHub Token + Orgs */}
          <Card>
            <CardHeader>
              <GitFork size={14} className="text-[#8090b0]" />
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">GitHub</span>
            </CardHeader>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Access Token</label>
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-[var(--text-faint)] flex-shrink-0" />
                  <input
                    type="password"
                    value={settings.github.accessToken}
                    onChange={(e) => updateGitHubConfig({ accessToken: e.target.value })}
                    placeholder="ghp_..."
                    className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', fontFamily: 'Verdana, Geneva, sans-serif' }}
                  />
                </div>
              </div>
              <Input
                label="Organizations (comma-separated)"
                value={settings.github.orgs.join(', ')}
                onChange={(e) => updateGitHubConfig({ orgs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="my-org, another-org"
              />
              <Toggle
                checked={settings.github.includePersonal}
                onChange={(v) => updateGitHubConfig({ includePersonal: v })}
                label="Include personal repositories"
                color="#2a6fff"
              />
            </div>
          </Card>

          {/* Azure DevOps Token + Projects */}
          <Card>
            <CardHeader>
              <GitBranch size={14} className="text-[#0078d4]" />
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Azure DevOps</span>
            </CardHeader>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Personal Access Token</label>
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-[var(--text-faint)] flex-shrink-0" />
                  <input
                    type="password"
                    value={settings.ado.personalAccessToken}
                    onChange={(e) => updateADOConfig({ personalAccessToken: e.target.value })}
                    placeholder="Personal Access Token..."
                    className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', fontFamily: 'Verdana, Geneva, sans-serif' }}
                  />
                </div>
              </div>
              <Input
                label="Organization"
                value={settings.ado.organization}
                onChange={(e) => updateADOConfig({ organization: e.target.value })}
                placeholder="my-organization"
              />
              <Input
                label="Projects (comma-separated)"
                value={settings.ado.projects.join(', ')}
                onChange={(e) => updateADOConfig({ projects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="Platform, DevOps, Overwatch"
              />
            </div>
          </Card>
        </div>
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 3 — OpenTelemetry Configuration
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<Activity size={16} className="text-[#00e5a0]" />}
        title="OpenTelemetry Configuration"
        description="Configure the OTLP collector endpoint and choose which telemetry signals to export. Changes take effect after applying the config."
      >
        <Card>
          <CardHeader>
            <Activity size={14} className="text-[#00e5a0]" />
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">OTLP Collector</span>
          </CardHeader>
          <div className="p-5 space-y-4">
            <Input
              label="OTLP Collector Endpoint"
              value={settings.otel.endpoint}
              onChange={(e) => updateOTelConfig({ endpoint: e.target.value })}
              placeholder="http://localhost:4317"
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
                <Toggle
                  checked={settings.otel.exportTraces}
                  onChange={(v) => updateOTelConfig({ exportTraces: v })}
                  label="Traces"
                  color="#2a6fff"
                />
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
                <Toggle
                  checked={settings.otel.exportMetrics}
                  onChange={(v) => updateOTelConfig({ exportMetrics: v })}
                  label="Metrics"
                  color="#00e5a0"
                />
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
                <Toggle
                  checked={settings.otel.exportLogs}
                  onChange={(v) => updateOTelConfig({ exportLogs: v })}
                  label="Logs"
                  color="#f5a623"
                />
              </div>
            </div>

            <Button
              variant="success"
              onClick={handleApplyOTel}
            >
              {otelApplied ? <><Check size={13} /> Applied!</> : <><Activity size={13} /> Apply OTel Config</>}
            </Button>
          </div>
        </Card>
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 4 — IDE Extensions
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<Code2 size={16} className="text-[#007acc]" />}
        title="IDE Extensions"
        description="Install IDE extensions to open repositories directly from the portal and get AI-assisted code review in your editor."
      >
        <Card>
          <CardHeader>
            <Code2 size={14} className="text-[#007acc]" />
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">VS Code Extension</span>
          </CardHeader>
          <div className="p-5 space-y-3">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Install the <strong className="text-[var(--text-primary)]">DevDock VS Code Extension</strong> to open
              repos directly from the browser into your local IDE, and get AI-assisted code review
              powered by DevDock AI and your configured MCP servers.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.open('vscode:extension/devdock.devdock-vscode', '_blank')}>
                <Code2 size={12} /> Install from VS Code Marketplace
              </Button>
            </div>
            <div className="flex items-start gap-2 bg-[#f5a62308] border border-[#f5a62322] rounded-xl p-3">
              <AlertTriangle size={12} className="text-[#f5a623] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[var(--text-muted)]">
                Extension is in preview. Install manually via{' '}
                <code className="text-[#f5a623] bg-[#f5a62312] px-1 rounded font-mono">VSIX</code> until
                marketplace listing is live.
              </p>
            </div>
          </div>
        </Card>
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 5 — Search Sources (Federated Search)
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<Globe size={16} className="text-[#2a6fff]" />}
        title="Search Sources"
        description="Manage federated search sources to include external data providers in your search results."
      >
        <FederatedSourcesPage embedded />
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 6 — Active Directory
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<Shield size={16} className="text-[#0078d4]" />}
        title="Active Directory"
        description="Connect to Azure AD or on-premises Active Directory to manage user access via security groups and domain authentication."
      >
        <ActiveDirectorySettings
          config={settings.activeDirectory}
          onUpdate={updateActiveDirectoryConfig}
        />
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════════
           SECTION 7 — API Keys & Authentication (moved to bottom)
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<Key size={16} className="text-[#2a6fff]" />}
        title="API Keys &amp; Authentication"
        description="Set API keys for AI providers used by the chat panel. Keys are stored locally and sent directly to each provider."
      >
        <div className="space-y-4">
          {/* AI Provider Keys */}
          <Card>
            <CardHeader>
              <Key size={14} className="text-[#2a6fff]" />
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">AI Provider API Keys</span>
            </CardHeader>
            <div className="p-5 space-y-4">
              {providers.map(({ id, label, color, placeholder }) => (
                <div key={id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock size={12} className="text-[var(--text-faint)] flex-shrink-0" />
                    <input
                      type="password"
                      value={settings.ai.apiKeys[id]}
                      onChange={(e) => updateApiKey(id, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', fontFamily: 'Verdana, Geneva, sans-serif' }}
                    />
                  </div>
                </div>
              ))}

              <div>
                <Input
                  label="Local Ollama Endpoint"
                  value={settings.ai.localEndpoint}
                  onChange={(e) => updateApiKey('local', e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />
              </div>

              <div className="flex items-start gap-2 bg-[#2a6fff08] border border-[#2a6fff1a] rounded-xl p-3">
                <Lock size={12} className="text-[#2a6fff] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                  Keys are stored in <code className="text-[#2a6fff] bg-[#2a6fff12] px-1 rounded font-mono">localStorage</code> only.
                  They are sent <strong className="text-[var(--text-primary)]">directly to the provider</strong> — never to any third-party server.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </CollapsibleSection>

      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, marginBottom: 30 }} />

      {/* Save */}
      <Button variant="primary" size="lg" onClick={handleSave}>
        {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Settings</>}
      </Button>
    </div>
  );
};
