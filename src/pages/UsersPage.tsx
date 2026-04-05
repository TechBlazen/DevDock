import { useState } from 'react';
import { UserPlus, Trash2, Shield, Pencil, X, Check } from 'lucide-react';
import { useUserAccountsStore, useAuthStore } from '../store';
import { SectionTitle, Card, Button, Pill, Toggle } from '../components/ui';
import { getRoleLabel, getRoleColor } from '../lib/rbac';
import type { UserRole, Permission } from '../types';

const ALL_PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/github', label: 'GitHub' },
  { path: '/ado', label: 'Azure DevOps' },
  { path: '/mcp', label: 'MCP Servers' },
  { path: '/telemetry', label: 'Observability' },
  { path: '/catalog', label: 'Catalog' },
  { path: '/scaffold', label: 'Scaffold' },
  { path: '/docs', label: 'Docs' },
  { path: '/network', label: 'Network' },
  { path: '/plugins', label: 'Plugins' },
  { path: '/settings', label: 'Settings' },
];

const ALL_WIDGETS = [
  'repos_github', 'repos_ado', 'mcp_status', 'telemetry',
  'quick_actions', 'activity_feed', 'ai_metrics', 'network_map',
];

export const UsersPage = () => {
  const { accounts, addAccount, removeAccount, updateAccount, updatePassword } = useUserAccountsStore();
  const currentUser = useAuthStore((s) => s.user);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [error, setError] = useState('');
  const [passwordChange, setPasswordChange] = useState<Record<string, string>>({});

  const handleAdd = () => {
    setError('');
    if (!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()) {
      setError('Username, password, and display name are required.');
      return;
    }
    const account = addAccount(newUsername.trim(), newPassword, newDisplayName.trim(), newRole, newEmail.trim() || undefined);
    if (!account) {
      setError('Username already exists.');
      return;
    }
    setShowAddForm(false);
    setNewUsername(''); setNewPassword(''); setNewDisplayName(''); setNewEmail(''); setNewRole('viewer');
  };

  const handlePermToggle = (accountId: string, perms: Permission, key: keyof Permission, value: unknown) => {
    updateAccount(accountId, { permissions: { ...perms, [key]: value } });
  };

  const handlePageToggle = (accountId: string, perms: Permission, path: string) => {
    if (perms.pages.includes('*')) return;
    const pages = perms.pages.includes(path)
      ? perms.pages.filter((p) => p !== path)
      : [...perms.pages, path];
    updateAccount(accountId, { permissions: { ...perms, pages } });
  };

  const handleWidgetToggle = (accountId: string, perms: Permission, widgetId: string) => {
    if (perms.widgets.includes('*')) return;
    const widgets = perms.widgets.includes(widgetId)
      ? perms.widgets.filter((w) => w !== widgetId)
      : [...perms.widgets, widgetId];
    updateAccount(accountId, { permissions: { ...perms, widgets } });
  };

  return (
    <div className="p-6">
      <SectionTitle sub="Manage user accounts, roles, and permissions.">
        User Management
      </SectionTitle>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap" style={{ marginTop: 24, marginBottom: 28 }}>
        {(['admin', 'editor', 'viewer'] as UserRole[]).map((role) => {
          const count = accounts.filter((a) => a.role === role).length;
          const color = getRoleColor(role);
          return (
            <div key={role} className="rounded-2xl px-4 py-2.5" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
              <div className="text-lg font-bold font-mono" style={{ color }}>{count}</div>
              <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{getRoleLabel(role)}s</div>
            </div>
          );
        })}
        <div className="ml-auto">
          <Button variant="primary" size="md" onClick={() => setShowAddForm(!showAddForm)}>
            <UserPlus size={14} /> Add User
          </Button>
        </div>
      </div>

      {/* Add user form */}
      {showAddForm && (
        <Card className="mb-5">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>New User Account</h3>
              <button onClick={() => setShowAddForm(false)} style={{ color: 'var(--text-faint)' }}><X size={16} /></button>
            </div>
            {error && (
              <div className="text-[11px] px-3 py-2 rounded-xl mb-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#ef4444' }}>
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="rounded-2xl px-3 py-2 text-xs outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }} />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="rounded-2xl px-3 py-2 text-xs outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }} />
              <input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="Display Name" className="rounded-2xl px-3 py-2 text-xs outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }} />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email (optional)" className="rounded-2xl px-3 py-2 text-xs outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Role:</span>
              {(['admin', 'editor', 'viewer'] as UserRole[]).map((r) => (
                <button key={r} onClick={() => setNewRole(r)} className="px-3 py-1 rounded-xl text-[11px] font-semibold transition-all" style={newRole === r ? { background: `${getRoleColor(r)}15`, color: getRoleColor(r), border: `1px solid ${getRoleColor(r)}30` } : { color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {getRoleLabel(r)}
                </button>
              ))}
            </div>
            <Button variant="primary" size="md" onClick={handleAdd}>Create User</Button>
          </div>
        </Card>
      )}

      {/* User list */}
      <div className="space-y-3">
        {accounts.map((account) => {
          const isEditing = editingId === account.id;
          const isSelf = account.id === currentUser?.id;
          const roleColor = getRoleColor(account.role);

          return (
            <Card key={account.id} highlight={isSelf}>
              <div className="p-4">
                {/* User header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{
                    background: `linear-gradient(135deg, ${roleColor}cc, ${roleColor}88)`,
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}>
                    {account.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{account.displayName}</span>
                      <Pill color={roleColor}>{getRoleLabel(account.role)}</Pill>
                      {isSelf && <Pill color="#3b82f6">you</Pill>}
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      @{account.username} {account.email && `· ${account.email}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingId(isEditing ? null : account.id)} className="p-1.5 rounded-xl transition-all" style={{ color: 'var(--text-faint)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}>
                      {isEditing ? <X size={14} /> : <Pencil size={14} />}
                    </button>
                    {account.username !== 'admin' && !isSelf && (
                      <button onClick={() => removeAccount(account.id)} className="p-1.5 rounded-xl transition-all" style={{ color: 'var(--text-faint)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded edit panel */}
                {isEditing && (
                  <div className="pt-3 space-y-4 animate-[fadeIn_0.15s_ease]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Role selector */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Role</div>
                      <div className="flex gap-2">
                        {(['admin', 'editor', 'viewer'] as UserRole[]).map((r) => (
                          <button key={r} onClick={() => updateAccount(account.id, { role: r })} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all" style={account.role === r ? { background: `${getRoleColor(r)}15`, color: getRoleColor(r), border: `1px solid ${getRoleColor(r)}30` } : { color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                            <Shield size={11} className="inline mr-1" />{getRoleLabel(r)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Password change */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Password</div>
                      <div className="flex gap-2">
                        <input type="password" value={passwordChange[account.id] ?? ''} onChange={(e) => setPasswordChange({ ...passwordChange, [account.id]: e.target.value })} placeholder="New password" className="flex-1 rounded-2xl px-3 py-1.5 text-xs outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }} />
                        <Button variant="outline" size="sm" disabled={!passwordChange[account.id]?.trim()} onClick={() => { updatePassword(account.id, passwordChange[account.id]); setPasswordChange({ ...passwordChange, [account.id]: '' }); }}>
                          <Check size={12} /> Set
                        </Button>
                      </div>
                    </div>

                    {/* Page permissions */}
                    {account.role !== 'admin' && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Page Access</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {ALL_PAGES.map(({ path, label }) => {
                            const hasAccess = account.permissions.pages.includes('*') || account.permissions.pages.includes(path);
                            return (
                              <button key={path} onClick={() => handlePageToggle(account.id, account.permissions, path)} className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all" style={hasAccess ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' } : { color: 'var(--text-faint)', border: '1px solid var(--border-subtle)' }}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Widget permissions */}
                    {account.role !== 'admin' && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Widget Access</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {ALL_WIDGETS.map((w) => {
                            const hasAccess = account.permissions.widgets.includes('*') || account.permissions.widgets.includes(w);
                            return (
                              <button key={w} onClick={() => handleWidgetToggle(account.id, account.permissions, w)} className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all" style={hasAccess ? { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' } : { color: 'var(--text-faint)', border: '1px solid var(--border-subtle)' }}>
                                {w}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Capability toggles */}
                    {account.role !== 'admin' && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Capabilities</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Toggle checked={account.permissions.canEditDocs} onChange={(v) => handlePermToggle(account.id, account.permissions, 'canEditDocs', v)} label="Edit Docs" />
                          <Toggle checked={account.permissions.canAccessTerminal} onChange={(v) => handlePermToggle(account.id, account.permissions, 'canAccessTerminal', v)} label="Terminal" />
                          <Toggle checked={account.permissions.canAccessNetwork} onChange={(v) => handlePermToggle(account.id, account.permissions, 'canAccessNetwork', v)} label="Network Scan" />
                          <Toggle checked={account.permissions.canManagePlugins} onChange={(v) => handlePermToggle(account.id, account.permissions, 'canManagePlugins', v)} label="Manage Plugins" />
                        </div>
                      </div>
                    )}

                    {account.role === 'admin' && (
                      <div className="text-[11px] px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', color: 'rgba(59,130,246,0.7)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        Admins have full access to all pages, widgets, and capabilities.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
