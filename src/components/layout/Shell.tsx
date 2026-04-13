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

interface ShellProps {
  children: ReactNode;
  editMode?: boolean;
  onToggleEdit?: () => void;
}

export const Shell = ({ children, editMode = false, onToggleEdit = () => {} }: ShellProps) => {
  const isOpen = useChatStore((s) => s.isOpen);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

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
      {/* Topbar spans full width */}
      <Topbar />

      {/* Below topbar: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <main data-testid="main-content" className="flex-1 overflow-y-auto" style={{ paddingLeft: 16 }}>
              {children}
            </main>

            {isOpen && (
              <div className="flex-shrink-0 animate-[slideIn_0.25s_ease]">
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
