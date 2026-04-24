import { Sun, Moon, Monitor, Shield, Clock, Mail, Key } from 'lucide-react';
import { useAuthStore, useUserAccountsStore, useSettingsStore } from '../store';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useTheme } from '../hooks/useTheme';
import { formatDistanceToNow } from 'date-fns';
import { BookmarkWidget } from '../components/profile/BookmarkWidget';
import { PasswordVault } from '../components/profile/PasswordVault';
import { SUPPORTED_LANGUAGES } from '../i18n';
import type { UserPreferences } from '../types';

const ACCENT_COLORS = [
  { value: '#005DAA', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#dc2626', label: 'Red' },
  { value: '#0891b2', label: 'Teal' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: '#d32f2f',
  editor: '#ed6c02',
  viewer: '#2e7d32',
};

export const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);
  const provider = useAuthStore((s) => s.provider);
  const accounts = useUserAccountsStore((s) => s.accounts);
  const { prefs, update } = useUserPreferences();
  const settingsLang = useSettingsStore((s) => s.settings.defaultLanguage);
  useTheme(); // ensure theme is applied

  const userAccount = accounts.find((a) => a.id === user?.id);
  const role = user?.role ?? userAccount?.role ?? 'viewer';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', marginBottom: 24 }}>Profile & Preferences</h1>

      {/* User Info Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
      }}>
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border-color)' }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700,
            }}>
              {(user?.displayName ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</div>
            <div className="flex items-center gap-3 mt-1">
              {user?.email && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <Mail size={12} /> {user.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                <Key size={12} /> {provider ?? 'local'}
              </span>
            </div>
          </div>
          <div className="ml-auto">
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
              background: `${ROLE_COLORS[role] ?? '#9e9e9e'}18`,
              color: ROLE_COLORS[role] ?? '#9e9e9e',
              border: `1px solid ${ROLE_COLORS[role] ?? '#9e9e9e'}40`,
            }}>
              <Shield size={12} /> {role}
            </span>
          </div>
        </div>

        {userAccount?.lastLogin && (
          <div className="flex items-center gap-1 mt-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <Clock size={12} />
            Last login: {formatDistanceToNow(new Date(userAccount.lastLogin), { addSuffix: true })}
            <span style={{ marginLeft: 8 }}>
              Account created: {formatDistanceToNow(new Date(userAccount.createdAt), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      {/* Theme Preference */}
      <SectionCard title="Theme">
        <div className="flex gap-3">
          {([
            { value: 'light' as const, label: 'Light', Icon: Sun },
            { value: 'dark' as const, label: 'Dark', Icon: Moon },
            { value: 'system' as const, label: 'System', Icon: Monitor },
          ]).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => update({ theme: value })}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 0',
                borderRadius: 10,
                border: '2px solid',
                borderColor: prefs.theme === value ? 'var(--accent)' : 'var(--border-color)',
                background: prefs.theme === value ? 'var(--accent-bg)' : 'var(--bg-surface)',
                color: prefs.theme === value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={24} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Accent Color */}
      <SectionCard title="Accent Color">
        <div className="flex gap-4">
          {ACCENT_COLORS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => update({ accentColor: value })}
              title={label}
              className="flex flex-col items-center gap-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: value,
                border: prefs.accentColor === value ? '3px solid var(--text-primary)' : '2px solid var(--border-color)',
                outline: prefs.accentColor === value ? `3px solid ${value}` : 'none',
                outlineOffset: 3,
                transition: 'all 0.15s',
              }} />
              <span style={{ fontSize: 11, color: prefs.accentColor === value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Greeting Style */}
      <SectionCard title="Greeting Style">
        <div className="flex gap-3">
          {([
            { value: 'time-based' as const, label: 'Time-based', desc: 'Good morning / afternoon / evening' },
            { value: 'simple' as const, label: 'Simple', desc: 'Welcome, {name}' },
          ]).map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => update({ greeting: value })}
              style={{
                flex: 1,
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 10,
                border: '2px solid',
                borderColor: prefs.greeting === value ? 'var(--accent)' : 'var(--border-color)',
                background: prefs.greeting === value ? 'var(--accent-bg)' : 'var(--bg-surface)',
                color: prefs.greeting === value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{desc}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard title="Language">
        <div>
          <select
            value={prefs.language ?? ''}
            onChange={(e) => update({ language: (e.target.value || undefined) as UserPreferences['language'] })}
            className="w-full max-w-xs rounded-lg px-3 py-2.5 text-[13px] outline-none cursor-pointer"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          >
            <option value="">Use default ({SUPPORTED_LANGUAGES.find(l => l.code === (settingsLang ?? 'en'))?.name ?? 'English'})</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
            ))}
          </select>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>
            Override the default application language for your account. Leave as "Use default" to follow the admin setting.
          </p>
        </div>
      </SectionCard>

      {/* Bookmarks */}
      <SectionCard title="Password Vault">
        <PasswordVault />
      </SectionCard>

      <SectionCard title="Bookmarks">
        <BookmarkWidget />
      </SectionCard>
    </div>
  );
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 16,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 16 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
