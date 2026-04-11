import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Bot, ChevronDown } from 'lucide-react';
import { useChatStore, useTelemetryStore, useAuthStore, useUserAccountsStore, useSettingsStore } from '../../store';
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
  admin: '#d32f2f',
  editor: '#ed6c02',
  viewer: '#2e7d32',
};

export const Topbar = () => {
  const [showPrefs, setShowPrefs] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);
  const setOpen = useChatStore((s) => s.setOpen);
  const isOpen = useChatStore((s) => s.isOpen);
  const { reqPerSec, errorRate } = useTelemetryStore();
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
    <header className="h-[52px] flex items-center px-5 gap-4 flex-shrink-0" style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      {/* Logo */}
      <img src={branding?.logoUrl || '/devdock-logo.svg'} alt={branding?.appName || 'DevDock'} style={{ height: 32, maxWidth: 180, objectFit: 'contain' }} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right nav links */}
      <nav className="flex items-center gap-1">
        {/* OTel status */}
        <Link to="/telemetry" className="px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors" style={{ color: 'var(--accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          OTel
          <span className="ml-1 text-[11px]" style={{ color: errorRate > 1 ? '#d32f2f' : '#2e7d32' }}>{reqPerSec}/s</span>
        </Link>

        {/* Notifications */}
        <button className="relative px-2 py-1.5 rounded-md transition-colors" style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#d32f2f' }} />
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
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* User + Preferences */}
        <div ref={prefsRef} className="relative">
          <button
            onClick={() => setShowPrefs((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors"
            style={{ background: showPrefs ? 'var(--bg-hover)' : 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { if (!showPrefs) e.currentTarget.style.background = 'var(--bg-hover)'; }}
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
