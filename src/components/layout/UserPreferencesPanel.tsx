import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor, User } from 'lucide-react';
import { useUserPreferences } from '../../hooks/useUserPreferences';

const ACCENT_COLORS = [
  { value: '#005DAA', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#dc2626', label: 'Red' },
  { value: '#0891b2', label: 'Teal' },
];

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', Icon: Sun },
  { value: 'dark' as const, label: 'Dark', Icon: Moon },
  { value: 'system' as const, label: 'System', Icon: Monitor },
];

interface Props {
  onClose: () => void;
}

export function UserPreferencesPanel({ onClose }: Props) {
  const navigate = useNavigate();
  const { prefs, update } = useUserPreferences();

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 300,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Theme */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Theme
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => update({ theme: value })}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 0',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 8,
                border: '1px solid',
                borderColor: prefs.theme === value ? 'var(--accent)' : 'var(--border-color)',
                background: prefs.theme === value ? 'var(--accent-bg)' : 'transparent',
                color: prefs.theme === value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 16px' }} />

      {/* Accent Color */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Accent Color
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {ACCENT_COLORS.map(({ value, label }) => (
            <button
              key={value}
              title={label}
              onClick={() => update({ accentColor: value })}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: value,
                border: prefs.accentColor === value ? '3px solid var(--text-primary)' : '2px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                outline: prefs.accentColor === value ? `2px solid ${value}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 16px' }} />

      {/* Greeting */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Greeting Style
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['time-based', 'simple'] as const).map((value) => (
            <button
              key={value}
              onClick={() => update({ greeting: value })}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 8,
                border: '1px solid',
                borderColor: prefs.greeting === value ? 'var(--accent)' : 'var(--border-color)',
                background: prefs.greeting === value ? 'var(--accent-bg)' : 'transparent',
                color: prefs.greeting === value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {value === 'time-based' ? 'Time-based' : 'Simple'}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 16px' }} />

      {/* Profile link */}
      <div style={{ padding: '12px 16px' }}>
        <button
          onClick={() => { navigate('/profile'); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 0',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <User size={14} />
          View Profile
        </button>
      </div>
    </div>
  );
}
