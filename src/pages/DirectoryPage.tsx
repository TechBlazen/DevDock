import { useState } from 'react';
import {
  Users, User, Search, Shield, CheckCircle,
  Loader2, ChevronRight, Building2, Mail, Briefcase, AlertTriangle,
} from 'lucide-react';
import { useSettingsStore } from '../store';
import { directoryApi } from '../lib/api';
import { SectionTitle, Card, CardHeader, Button, Pill } from '../components/ui';

type Tab = 'users' | 'groups';

interface DirectoryUser {
  dn: string;
  sAMAccountName: string;
  displayName: string;
  email: string;
  memberOf: string[];
  department?: string;
  title?: string;
  enabled: boolean;
}

interface DirectoryGroup {
  dn: string;
  cn: string;
  description: string;
  members: string[];
  memberCount: number;
}

function getAdConfig(settings: ReturnType<typeof useSettingsStore.getState>['settings']) {
  const ad = settings.activeDirectory;
  return {
    ldapUrl: ad.ldapUrl,
    baseDn: ad.baseDn,
    bindDn: ad.bindDn,
    bindPassword: ad.bindPassword,
    useSsl: ad.useSsl,
    userSearchFilter: ad.userSearchFilter,
    userDisplayNameAttr: ad.userDisplayNameAttr,
    userEmailAttr: ad.userEmailAttr,
    groupSearchFilter: ad.groupSearchFilter,
  };
}

export const DirectoryPage = () => {
  const settings = useSettingsStore((s) => s.settings);
  const ad = settings.activeDirectory;

  const [tab, setTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DirectoryGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<DirectoryUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const isConfigured = ad.enabled && ad.mode === 'on-prem' && ad.ldapUrl && ad.baseDn && ad.bindDn;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await directoryApi.testConnection(getAdConfig(settings));
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, message: e instanceof Error ? e.message : 'Connection failed' });
    }
    setTesting(false);
  };

  const handleSearch = async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError('');
    try {
      if (tab === 'users') {
        const data = await directoryApi.listUsers(getAdConfig(settings), search || undefined, 200);
        setUsers(data.users);
      } else {
        const data = await directoryApi.listGroups(getAdConfig(settings), search || undefined, 200);
        setGroups(data.groups);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to query directory');
    }
    setLoading(false);
  };

  const handleGroupClick = async (group: DirectoryGroup) => {
    setSelectedGroup(group);
    setLoadingMembers(true);
    try {
      const data = await directoryApi.getGroupMembers(getAdConfig(settings), group.dn);
      setGroupMembers(data.members);
    } catch {
      setGroupMembers([]);
    }
    setLoadingMembers(false);
  };

  if (!ad.enabled || ad.mode !== 'on-prem') {
    return (
      <div className="p-8">
        <SectionTitle sub="Browse users and groups from your Active Directory">
          Directory
        </SectionTitle>
        <Card>
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <Shield size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
              Active Directory Not Configured
            </h3>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 20px' }}>
              Configure an on-premises Active Directory connection in Settings to browse your directory here.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.hash = '#/settings'}>
              Go to Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <SectionTitle sub={`Connected to ${ad.domain || ad.ldapUrl} — browse users and security groups from Active Directory`}>
          Directory
        </SectionTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={testing}
        >
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
          {testResult?.success ? 'Connected' : 'Test Connection'}
        </Button>
      </div>

      {/* Connection status */}
      {testResult && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-[12px]" style={{
          background: testResult.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: testResult.success ? '#16a34a' : '#dc2626',
        }}>
          {testResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {testResult.message}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {([
            { key: 'users' as Tab, label: 'Users', icon: User },
            { key: 'groups' as Tab, label: 'Groups', icon: Users },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelectedGroup(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer"
              style={{
                background: tab === key ? 'var(--accent-bg)' : 'transparent',
                color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
                border: tab === key ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-sm relative">
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={tab === 'users' ? 'Search users by name, username, or email...' : 'Search groups by name...'}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
        </div>

        <Button variant="primary" size="sm" onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Search
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-[12px]" style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626',
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          {users.length === 0 && !loading && (
            <Card>
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <User size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Click Search to query your Active Directory for users.
                </p>
              </div>
            </Card>
          )}

          {users.length > 0 && (
            <Card>
              <CardHeader>
                <User size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {users.length} User{users.length !== 1 ? 's' : ''}
                </span>
              </CardHeader>
              <div>
                {users.map((user, i) => (
                  <div
                    key={user.dn}
                    className="flex items-center gap-4"
                    style={{
                      padding: '14px 22px',
                      borderBottom: i < users.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{
                      background: user.enabled ? 'linear-gradient(135deg, #3b82f6cc, #3b82f688)' : 'linear-gradient(135deg, #9ca3afcc, #9ca3af88)',
                    }}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{user.displayName}</span>
                        {!user.enabled && <Pill color="#9ca3af">Disabled</Pill>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span>@{user.sAMAccountName}</span>
                        {user.email && <span className="flex items-center gap-1"><Mail size={10} />{user.email}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                      {user.title && <span className="flex items-center gap-1"><Briefcase size={10} />{user.title}</span>}
                      {user.department && <span className="flex items-center gap-1"><Building2 size={10} />{user.department}</span>}
                    </div>
                    <div className="text-[10px] shrink-0" style={{ color: 'var(--text-faint)', maxWidth: 120 }}>
                      {user.memberOf.length} group{user.memberOf.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Groups tab */}
      {tab === 'groups' && !selectedGroup && (
        <div>
          {groups.length === 0 && !loading && (
            <Card>
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Users size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Click Search to query your Active Directory for security groups.
                </p>
              </div>
            </Card>
          )}

          {groups.length > 0 && (
            <Card>
              <CardHeader>
                <Users size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {groups.length} Group{groups.length !== 1 ? 's' : ''}
                </span>
              </CardHeader>
              <div>
                {groups.map((group, i) => (
                  <div
                    key={group.dn}
                    onClick={() => handleGroupClick(group)}
                    className="flex items-center gap-4 cursor-pointer transition-colors"
                    style={{
                      padding: '14px 22px',
                      borderBottom: i < groups.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                      background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.2)',
                    }}>
                      <Users size={18} style={{ color: '#0078d4' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{group.cn}</span>
                      {group.description && (
                        <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{group.description}</div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Group detail view */}
      {tab === 'groups' && selectedGroup && (
        <div>
          <button
            onClick={() => { setSelectedGroup(null); setGroupMembers([]); }}
            className="flex items-center gap-1.5 text-[13px] font-medium mb-4 cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: 0 }}
          >
            <ChevronRight size={14} className="rotate-180" />
            Back to Groups
          </button>

          <Card>
            <CardHeader>
              <Users size={14} style={{ color: '#0078d4' }} />
              <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {selectedGroup.cn}
              </span>
              <div className="flex-1" />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
              </span>
            </CardHeader>

            {selectedGroup.description && (
              <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{selectedGroup.description}</p>
              </div>
            )}

            {loadingMembers ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-faint)', margin: '0 auto' }} />
              </div>
            ) : groupMembers.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No members found in this group.</p>
              </div>
            ) : (
              <div>
                {groupMembers.map((member, i) => (
                  <div
                    key={member.dn}
                    className="flex items-center gap-4"
                    style={{
                      padding: '12px 22px',
                      borderBottom: i < groupMembers.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{
                      background: member.enabled ? '#3b82f6' : '#9ca3af',
                    }}>
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{member.displayName}</span>
                      <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>@{member.sAMAccountName}</div>
                    </div>
                    {member.email && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{member.email}</span>}
                    {!member.enabled && <Pill color="#9ca3af">Disabled</Pill>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
