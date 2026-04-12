import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Shield, Pencil, Check, MessageSquare } from 'lucide-react';

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
      className="flex items-center px-7 flex-shrink-0"
      style={{
        height: 36,
        background: 'var(--footer-bg)',
        borderTop: '1px solid var(--border-color)',
        fontSize: 12,
        color: 'var(--footer-text)',
      }}
    >
      {/* Left: Links */}
      <nav className="flex items-center gap-4">
        <Link
          to="/whats-new"
          className="flex items-center gap-1 transition-colors"
          style={{ color: 'var(--footer-text)', textDecoration: 'none', opacity: 0.85 }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
        >
          <Sparkles size={12} />
          What's New
        </Link>

        <Link
          to="/privacy"
          className="flex items-center gap-1 transition-colors"
          style={{ color: 'var(--footer-text)', textDecoration: 'none', opacity: 0.85 }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
        >
          <Shield size={12} />
          Privacy Policy
        </Link>

        <Link
          to="/forum"
          className="flex items-center gap-1 transition-colors"
          style={{ color: 'var(--footer-text)', textDecoration: 'none', opacity: 0.85 }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
        >
          <MessageSquare size={12} />
          Community
        </Link>

        <span style={{ color: 'var(--footer-text)', opacity: 0.6 }}>
          &copy; {year} DevDock
        </span>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Timestamp + Edit */}
      <div className="flex items-center gap-3">
        <span className="tabular-nums font-mono hidden md:block" style={{ color: 'var(--footer-text)', opacity: 0.7 }}>
          {time.toLocaleDateString([], { month: 'short', year: 'numeric' })} &middot; {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>

        {isHome && (
          <>
            <div className="w-px h-4" style={{ background: 'var(--footer-text)', opacity: 0.3 }} />
            <button
              onClick={onToggleEdit}
              className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
              style={{
                color: 'var(--footer-text)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
