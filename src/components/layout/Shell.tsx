import { useState, useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { ChatPanel } from '../chat/ChatPanel';
import { TerminalPanel } from '../terminal/Terminal';
import { CommandPalette } from '../search/CommandPalette';
import { useChatStore, useSearchStore } from '../../store';
import { useSearchSync } from '../../hooks/useSearchSync';
import { useAnalyticsTracker } from '../../hooks/useAnalyticsTracker';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';

interface ShellProps {
  children: ReactNode;
  editMode?: boolean;
  onToggleEdit?: () => void;
}

export const Shell = ({ children, editMode = false, onToggleEdit = () => {} }: ShellProps) => {
  const isOpen = useChatStore((s) => s.isOpen);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ≥ lg: sidebar is an in-flow column. < lg (tablet/phone): off-canvas drawer.
  // The drawer only renders while `!isDesktop`, so growing to desktop hides it
  // without needing to reset state. It closes on nav-link taps (see below).
  const isDesktop = useMediaQuery(BREAKPOINTS.lg);
  // < md (phone): the chat panel takes over the screen instead of docking.
  const chatIsOverlay = !useMediaQuery(BREAKPOINTS.md);

  // Initialize search engine on mount
  useEffect(() => {
    useSearchStore.getState().initialize();
  }, []);

  // Keep search index in sync with store data
  useSearchSync();

  // Track page views and errors for admin analytics
  useAnalyticsTracker();

  useEffect(() => {
    const handler = () => setTerminalOpen((v) => !v);
    window.addEventListener('forge:toggle-terminal', handler);
    return () => window.removeEventListener('forge:toggle-terminal', handler);
  }, []);

  return (
    <div data-testid="shell" className="flex flex-col h-screen overflow-hidden" style={{ color: 'var(--text-primary)' }}>
      <CommandPalette />
      {/* Topbar spans full width. Hamburger only shows below lg (see Topbar). */}
      <Topbar onMenuClick={() => setMobileNavOpen(true)} />

      {/* Below topbar: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: in-flow sidebar column */}
        {isDesktop && (
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        )}

        {/* Tablet/phone: off-canvas drawer + backdrop */}
        {!isDesktop && mobileNavOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed inset-y-0 left-0 z-50 flex animate-[slideIn_0.2s_ease]"
              onClick={(e) => {
                // NavLinks render <a>; tapping one navigates, so dismiss the drawer.
                if ((e.target as HTMLElement).closest('a')) setMobileNavOpen(false);
              }}
            >
              <Sidebar collapsed={false} onToggle={() => setMobileNavOpen(false)} />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <main data-testid="main-content" className="flex-1 overflow-y-auto min-w-0" style={{ paddingLeft: 16 }}>
              {children}
            </main>

            {isOpen && (
              <div
                className={
                  chatIsOverlay
                    ? 'fixed inset-0 z-[60]'
                    : 'flex-shrink-0 animate-[slideIn_0.25s_ease]'
                }
              >
                <ChatPanel />
              </div>
            )}
          </div>

          {terminalOpen && (
            <TerminalPanel onClose={() => setTerminalOpen(false)} />
          )}
        </div>
      </div>

      {/* Footer spans full width */}
      <Footer editMode={editMode} onToggleEdit={onToggleEdit} />
    </div>
  );
};
