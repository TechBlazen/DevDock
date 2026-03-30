import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, Bot, ChevronDown } from 'lucide-react';
import { useChatStore, useTelemetryStore, useAuthStore } from '../../store';
import { Button } from '../ui';

interface TopbarProps {
  editMode: boolean;
  onToggleEdit: () => void;
}

export const Topbar = ({ editMode, onToggleEdit }: TopbarProps) => {
  const { pathname } = useLocation();
  const [time, setTime] = useState(new Date());
  const setOpen = useChatStore((s) => s.setOpen);
  const isOpen = useChatStore((s) => s.isOpen);
  const { reqPerSec, errorRate } = useTelemetryStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isHome = pathname === '/';

  return (
    <header className="h-[52px] flex items-center px-5 gap-4 flex-shrink-0" style={{
      background: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
    }}>
      {/* Logo */}
      <img src="/devdock-logo.svg" alt="DevDock" style={{ height: 32 }} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right nav links */}
      <nav className="flex items-center gap-1">
        {/* Clock */}
        <span className="text-[12px] tabular-nums font-mono mr-2 hidden md:block" style={{ color: '#999' }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>

        {/* OTel status */}
        <Link to="/telemetry" className="px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors" style={{ color: '#005DAA' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f9ff'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          OTel
          <span className="ml-1 text-[11px]" style={{ color: errorRate > 1 ? '#d32f2f' : '#2e7d32' }}>{reqPerSec}/s</span>
        </Link>

        {/* Customize (dashboard only) */}
        {isHome && (
          <button
            onClick={onToggleEdit}
            className="px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors"
            style={{ color: editMode ? '#2e7d32' : '#005DAA' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f9ff'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {editMode ? '✓ Done' : 'Edit'}
          </button>
        )}

        {/* Notifications */}
        <button className="relative px-2 py-1.5 rounded-md transition-colors" style={{ color: '#666' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#d32f2f' }} />
        </button>

        {/* AI Chat */}
        <Button
          variant={isOpen ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setOpen(!isOpen)}
        >
          <Bot size={13} />
          Forge AI
        </Button>

        {/* Separator */}
        <div className="w-px h-5 mx-1" style={{ background: '#e0e0e0' }} />

        {/* User */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md cursor-default">
          <span className="text-[13px] font-medium" style={{ color: '#333' }}>
            Welcome, {user?.displayName ?? 'User'}
          </span>
          <ChevronDown size={14} style={{ color: '#999' }} />
        </div>
      </nav>
    </header>
  );
};
