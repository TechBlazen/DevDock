import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Shield, Pencil, Check } from 'lucide-react';

interface FooterProps {
  editMode: boolean;
  onToggleEdit: () => void;
}

export const Footer = ({ editMode, onToggleEdit }: FooterProps) => {
  const { pathname } = useLocation();
  const [time, setTime] = useState(new Date());
  const isHome = pathname === '/';

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer
      className="flex items-center px-5 flex-shrink-0"
      style={{
        height: 36,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-color)',
        fontSize: 12,
      }}
    >
      {/* Left: Links */}
      <nav className="flex items-center gap-4">
        <Link
          to="/whats-new"
          className="flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Sparkles size={12} />
          What's New
        </Link>

        <Link
          to="/privacy"
          className="flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Shield size={12} />
          Privacy Policy
        </Link>

        <span style={{ color: 'var(--text-faint)' }}>
          &copy; {year} Forge Portal
        </span>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Timestamp + Edit */}
      <div className="flex items-center gap-3">
        <span className="tabular-nums font-mono hidden md:block" style={{ color: 'var(--text-muted)' }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>

        {isHome && (
          <>
            <div className="w-px h-4" style={{ background: 'var(--border-color)' }} />
            <button
              onClick={onToggleEdit}
              className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
              style={{
                color: editMode ? '#2e7d32' : 'var(--accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {editMode ? <Check size={12} /> : <Pencil size={12} />}
              {editMode ? 'Done' : 'Edit'}
            </button>
          </>
        )}
      </div>
    </footer>
  );
};
