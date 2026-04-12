import { useState, useEffect, useRef } from 'react';
import { Bell, Bot, ChevronDown } from 'lucide-react';
import { useChatStore, useAuthStore, useUserAccountsStore, useSettingsStore } from '../../store';
import { Button, Pill } from '../ui';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { UserPreferencesPanel } from './UserPreferencesPanel';
import { formatDistanceToNow } from 'date-fns';

function getGreeting(name: string, mode: 'time-based' | 'simple'): string {
  if (mode === 'simple') return `Welcome, ${name}`;
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#C00000',
  editor: '#E58A00',
  viewer: '#2e7d32',
};

export const Topbar = () => {
  const [showPrefs, setShowPrefs] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);
  const setOpen = useChatStore((s) => s.setOpen);
  const isOpen = useChatStore((s) => s.isOpen);
  const user = useAuthStore((s) => s.user);
  const accounts = useUserAccountsStore((s) => s.accounts);
  const branding = useSettingsStore((s) => s.settings.branding);
  const aiEnabled = useSettingsStore((s) => s.settings.aiEnabled);
  const { prefs } = useUserPreferences();

  const userAccount = accounts.find((a) => a.id === user?.id);
  const role = user?.role ?? userAccount?.role ?? 'viewer';

  // Click outside to close prefs
  useEffect(() => {
    if (!showPrefs) return;
    const handler = (e: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setShowPrefs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPrefs]);

  return (
    <header className="h-[52px] flex items-center px-6 gap-4 flex-shrink-0 relative z-10" style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      boxShadow: 'var(--header-shadow)',
    }}>
      {/* Logo */}
      <img src={branding?.logoUrl || '/devdock-logo.svg'} alt={branding?.appName || 'DevDock'} style={{ height: 32, maxWidth: 180, objectFit: 'contain' }} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right nav links */}
      <nav className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative px-2 py-1.5 transition-colors" style={{ color: 'var(--text-secondary)', borderRadius: 'var(--btn-radius)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--btn-hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#C00000' }} />
        </button>

        {/* AI Chat */}
        {aiEnabled && (
          <Button
            variant={isOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setOpen(!isOpen)}
          >
            <Bot size={13} />
            {branding?.appName || 'DevDock'} AI
          </Button>
        )}

        {/* Separator */}
        <div className="w-px h-5 mx-3" style={{ background: 'var(--border-color)' }} />

        {/* User + Preferences */}
        <div ref={prefsRef} className="relative">
          <button
            onClick={() => setShowPrefs((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 transition-colors"
            style={{ background: showPrefs ? 'var(--btn-hover-bg)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 'var(--btn-radius)' }}
            onMouseEnter={(e) => { if (!showPrefs) e.currentTarget.style.background = 'var(--btn-hover-bg)'; }}
            onMouseLeave={(e) => { if (!showPrefs) e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="text-left">
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {getGreeting(user?.displayName ?? 'User', prefs.greeting)}
              </div>
              {userAccount?.lastLogin && (
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Last login: {formatDistanceToNow(new Date(userAccount.lastLogin), { addSuffix: true })}
                </div>
              )}
            </div>
            <Pill color={ROLE_COLORS[role] ?? '#9e9e9e'}>{role}</Pill>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: showPrefs ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {showPrefs && <UserPreferencesPanel onClose={() => setShowPrefs(false)} />}
        </div>
      </nav>
    </header>
  );
};
