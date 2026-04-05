import { useState, type ReactNode } from 'react';
import {
  Key, Activity, GitFork, GitBranch, Code2, Save, Check, Lock, AlertTriangle, Globe,
  ChevronDown, ChevronRight, LayoutDashboard, Shield, Plus, Trash2, Users, Palette,
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

  const handleTestConnection = async () => {
    setTestStatus('testing');

    if (config.mode === 'azure-ad') {
      // Azure AD: validate fields locally (no server-side OAuth test yet)
      const isValid = config.tenantId && config.clientId && config.domain;
      setTestStatus(isValid ? 'success' : 'error');
      setTimeout(() => setTestStatus('idle'), 3000);
      return;
    }

    // On-prem: call the real LDAP test endpoint
    try {
      const { directoryApi } = await import('../lib/api');
      const result = await directoryApi.testConnection({
        ldapUrl: config.ldapUrl,
        baseDn: config.baseDn,
        bindDn: config.bindDn,
        bindPassword: config.bindPassword,
        useSsl: config.useSsl,
        userSearchFilter: config.userSearchFilter,
        userDisplayNameAttr: config.userDisplayNameAttr,
        userEmailAttr: config.userEmailAttr,
        groupSearchFilter: config.groupSearchFilter,
      });
      setTestStatus(result.success ? 'success' : 'error');
      setTimeout(() => setTestStatus('idle'), 4000);
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const adFont: React.CSSProperties = { fontFamily: 'Verdana, Geneva, sans-serif' };
  const adLabel: React.CSSProperties = { ...adFont, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' };
  const adInput: React.CSSProperties = { ...adFont, fontSize: 13, background: 'var(--bg-input)', border: '2px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 8, padding: '10px 14px', width: '100%', outline: 'none' };
  const adSelect: React.CSSProperties = { ...adInput, cursor: 'pointer' };

  return (
    <div className="space-y-8" style={adFont}>
      {/* Connection */}
      <Card>
        <CardHeader>
          <Shield size={14} className="text-[#0078d4]" />
          <span style={{ ...adFont, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connection</span>
          <div className="flex-1" />
          <Toggle
            checked={config.enabled}
            onChange={(v) => onUpdate({ enabled: v })}
            label={config.enabled ? 'Enabled' : 'Disabled'}
            color="#0078d4"
          />
        </CardHeader>
        <div className="p-6 space-y-6">
          {/* Mode toggle */}
          <div>
            <label style={{ ...adLabel, marginBottom: 10 }}>Directory Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => onUpdate({ mode: 'azure-ad' })}
                className="flex-1 rounded-lg text-center transition-all cursor-pointer"
                style={{
                  padding: '14px 16px',
                  fontFamily: 'Verdana, Geneva, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  ...(config.mode === 'azure-ad'
                    ? { background: 'rgba(0,120,212,0.1)', color: '#0078d4', border: '2px solid #0078d4' }
                    : { color: 'var(--text-muted)', border: '2px solid var(--border-subtle)', background: 'transparent' }
                  ),
                }}
              >
                <div>Azure AD (Cloud)</div>
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 4, opacity: 0.7 }}>Microsoft Entra ID / Azure Active Directory</div>
              </button>
              <button
                onClick={() => onUpdate({ mode: 'on-prem' })}
                className="flex-1 rounded-lg text-center transition-all cursor-pointer"
                style={{
                  padding: '14px 16px',
                  fontFamily: 'Verdana, Geneva, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  ...(config.mode === 'on-prem'
                    ? { background: 'rgba(107,114,128,0.1)', color: '#6b7280', border: '2px solid #6b7280' }
                    : { color: 'var(--text-muted)', border: '2px solid var(--border-subtle)', background: 'transparent' }
                  ),
                }}
              >
                <div>On-Premises AD</div>
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 4, opacity: 0.7 }}>Active Directory via LDAP / LDAPS</div>
              </button>
            </div>
          </div>

          {/* Azure AD fields */}
          {config.mode === 'azure-ad' && (
            <>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={adLabel}>Azure AD Tenant ID</label>
                  <input value={config.tenantId} onChange={(e) => onUpdate({ tenantId: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={adInput} />
                </div>
                <div>
                  <label style={adLabel}>Domain</label>
                  <input value={config.domain} onChange={(e) => onUpdate({ domain: e.target.value })} placeholder="contoso.com" style={adInput} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={adLabel}>Client ID (App Registration)</label>
                  <input value={config.clientId} onChange={(e) => onUpdate({ clientId: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={adInput} />
                </div>
                <div>
                  <label style={adLabel}>Client Secret</label>
                  <div className="flex items-center gap-2">
                    <Lock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input type="password" value={config.clientSecret} onChange={(e) => onUpdate({ clientSecret: e.target.value })} placeholder="Client secret..." style={{ ...adInput, flex: 1 }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* On-Prem AD / LDAP fields */}
          {config.mode === 'on-prem' && (
            <>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={adLabel}>LDAP Server URL</label>
                  <input value={config.ldapUrl} onChange={(e) => onUpdate({ ldapUrl: e.target.value })} placeholder="ldaps://dc.contoso.com:636" style={adInput} />
                  <p style={{ ...adFont, fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>Use ldaps:// for SSL or ldap:// for non-SSL</p>
                </div>
                <div>
                  <label style={adLabel}>Base DN</label>
                  <input value={config.baseDn} onChange={(e) => onUpdate({ baseDn: e.target.value })} placeholder="DC=contoso,DC=com" style={adInput} />
                  <p style={{ ...adFont, fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>The root of the directory tree to search</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={adLabel}>Bind DN (Service Account)</label>
                  <input value={config.bindDn} onChange={(e) => onUpdate({ bindDn: e.target.value })} placeholder="CN=svc-portal,OU=Service Accounts,DC=contoso,DC=com" style={adInput} />
                </div>
                <div>
                  <label style={adLabel}>Bind Password</label>
                  <div className="flex items-center gap-2">
                    <Lock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input type="password" value={config.bindPassword} onChange={(e) => onUpdate({ bindPassword: e.target.value })} placeholder="Service account password..." style={{ ...adInput, flex: 1 }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={adLabel}>Domain</label>
                  <input value={config.domain} onChange={(e) => onUpdate({ domain: e.target.value })} placeholder="contoso.com" style={adInput} />
                </div>
                <div className="flex items-end pb-1">
                  <Toggle
                    checked={config.useSsl}
                    onChange={(v) => onUpdate({ useSsl: v })}
                    label="Require SSL/TLS"
                    color="#0078d4"
                  />
                </div>
              </div>

              <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: 20, marginTop: 8 }}>
                <div style={{ ...adFont, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  LDAP Search Filters
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label style={adLabel}>User Search Filter</label>
                    <input value={config.userSearchFilter} onChange={(e) => onUpdate({ userSearchFilter: e.target.value })} placeholder="(&(objectClass=user)(sAMAccountName={username}))" style={adInput} />
                  </div>
                  <div>
                    <label style={adLabel}>Group Search Filter</label>
                    <input value={config.groupSearchFilter} onChange={(e) => onUpdate({ groupSearchFilter: e.target.value })} placeholder="(&(objectClass=group)(member={userDn}))" style={adInput} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 mt-4">
                  <div>
                    <label style={adLabel}>Display Name Attribute</label>
                    <input value={config.userDisplayNameAttr} onChange={(e) => onUpdate({ userDisplayNameAttr: e.target.value })} placeholder="displayName" style={adInput} />
                  </div>
                  <div>
                    <label style={adLabel}>Email Attribute</label>
                    <input value={config.userEmailAttr} onChange={(e) => onUpdate({ userEmailAttr: e.target.value })} placeholder="mail" style={adInput} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ paddingTop: 20, marginTop: 12, borderTop: '1px solid var(--border-subtle)' }} className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testStatus === 'testing'}>
              {testStatus === 'testing' ? <>Testing...</> : testStatus === 'success' ? <><Check size={12} className="text-[#2e7d32]" /> Connected</> : testStatus === 'error' ? <><AlertTriangle size={12} className="text-[#d32f2f]" /> Failed</> : <>Test Connection</>}
            </Button>
            {testStatus === 'error' && (
              <span style={{ ...adFont, fontSize: 12, color: '#d32f2f' }}>
                {config.mode === 'azure-ad'
                  ? 'Please fill in Tenant ID, Client ID, and Domain'
                  : 'Please fill in LDAP URL, Base DN, and Bind DN'}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Security Groups */}
      <Card>
        <CardHeader>
          <Users size={14} className="text-[#0078d4]" />
          <span style={{ ...adFont, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Groups</span>
          <div className="flex-1" />
          <span style={{ ...adFont, fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>
            {config.securityGroups.length} group{config.securityGroups.length !== 1 ? 's' : ''}
          </span>
        </CardHeader>
        <div className="p-6 space-y-6">
          <p style={{ ...adFont, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Map Active Directory security groups to portal roles. Users in these groups will be automatically assigned the corresponding role when they sign in via AD.
          </p>

          {/* Existing groups */}
          {config.securityGroups.length > 0 && (
            <div className="space-y-2">
              {config.securityGroups.map((group) => {
                const roleInfo = ROLE_OPTIONS.find((r) => r.value === group.role);
                return (
                  <div key={group.id} className="flex items-center gap-3 px-5 py-4 rounded-lg" style={{ background: 'var(--bg-inset)', border: '2px solid var(--border-color)' }}>
                    <Users size={16} style={{ color: '#0078d4', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ ...adFont, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{group.name}</div>
                      {group.description && (
                        <div style={{ ...adFont, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{group.description}</div>
                      )}
                    </div>
                    <select value={group.role} onChange={(e) => updateGroupRole(group.id, e.target.value as UserRole)} style={{ ...adFont, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '6px 10px', background: `${roleInfo?.color}12`, color: roleInfo?.color, border: `2px solid ${roleInfo?.color}40`, outline: 'none', cursor: 'pointer' }}>
                      {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                    </select>
                    <button onClick={() => removeGroup(group.id)} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--text-faint)', background: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#d32f2f'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }} title="Remove group">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new group */}
          <div className="rounded-lg p-5" style={{ background: 'var(--bg-inset)', border: '2px dashed var(--border-color)' }}>
            <div style={{ ...adFont, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Add Security Group
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={adLabel}>Group Name</label>
                  <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. SG-Portal-Admins" style={adInput} />
                </div>
                <div>
                  <label style={adLabel}>Assigned Role</label>
                  <select value={newGroupRole} onChange={(e) => setNewGroupRole(e.target.value as UserRole)} style={adSelect}>
                    {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label style={adLabel}>Description (optional)</label>
                <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="e.g. Portal administrators with full access" style={adInput} />
              </div>
              <Button variant="outline" size="sm" onClick={addGroup} disabled={!newGroupName.trim()}>
                <Plus size={12} /> Add Group
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: '#0078d408', border: '1px solid #0078d41a' }}>
            <Shield size={14} className="text-[#0078d4] mt-0.5 flex-shrink-0" />
            <p style={{ ...adFont, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
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
    updateBranding,
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
           SECTION 1.5 — Branding
           ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon={<Palette size={16} className="text-[#a855f7]" />}
        title="Branding"
        description="Customize the application logo, title, and tagline. Upload a PNG, JPEG, or provide an SVG to replace the default logo."
      >
        <Card>
          <CardHeader>
            <Palette size={14} className="text-[#a855f7]" />
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Logo &amp; Title</span>
          </CardHeader>
          <div className="p-5 space-y-5">
            {/* Current logo preview */}
            <div>
              <label className="text-[12px] font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Current Logo</label>
              <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <img
                  src={settings.branding?.logoUrl || '/devdock-logo.svg'}
                  alt="Logo preview"
                  style={{ height: 40, maxWidth: 200, objectFit: 'contain' }}
                />
                {settings.branding?.logoType === 'upload' && (
                  <Button variant="ghost" size="sm" onClick={() => updateBranding({ logoUrl: '/devdock-logo.svg', logoType: 'default' })}>
                    Reset to Default
                  </Button>
                )}
              </div>
            </div>

            {/* Upload logo */}
            <div>
              <label className="text-[12px] font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Upload New Logo
                <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>(PNG, JPEG, or SVG — recommended 200x50px)</span>
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="text-[12px]"
                style={{ color: 'var(--text-muted)' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    alert('Logo file must be under 2 MB');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateBranding({ logoUrl: reader.result as string, logoType: 'upload' });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            {/* SVG input */}
            <div>
              <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Or Paste SVG Markup
              </label>
              <textarea
                placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50">...</svg>'
                className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-y font-mono"
                style={{ minHeight: 80, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                onBlur={(e) => {
                  const svg = e.target.value.trim();
                  if (svg && svg.startsWith('<svg')) {
                    const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
                    updateBranding({ logoUrl: encoded, logoType: 'upload' });
                    e.target.value = '';
                  }
                }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                Paste raw SVG code and click outside to apply. Must start with {'<svg'}.
              </p>
            </div>

            {/* App name */}
            <Input
              label="Application Name"
              value={settings.branding?.appName ?? 'DevDock'}
              onChange={(e) => updateBranding({ appName: e.target.value })}
              placeholder="DevDock"
            />

            {/* Tagline */}
            <Input
              label="Tagline"
              value={settings.branding?.tagline ?? 'AI Developer Portal'}
              onChange={(e) => updateBranding({ tagline: e.target.value })}
              placeholder="AI Developer Portal"
            />
          </div>
        </Card>
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

      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, marginBottom: 30 }} />

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
