import { useState, useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChatPanel } from '../chat/ChatPanel';
import { TerminalPanel } from '../terminal/Terminal';
import { useChatStore } from '../../store';

interface ShellProps {
  children: ReactNode;
  editMode?: boolean;
  onToggleEdit?: () => void;
}

export const Shell = ({ children, editMode = false, onToggleEdit = () => {} }: ShellProps) => {
  const isOpen = useChatStore((s) => s.isOpen);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  useEffect(() => {
    const handler = () => setTerminalOpen((v) => !v);
    window.addEventListener('forge:toggle-terminal', handler);
    return () => window.removeEventListener('forge:toggle-terminal', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ color: '#1a1a2e' }}>
      {/* Topbar spans full width */}
      <Topbar editMode={editMode} onToggleEdit={onToggleEdit} />

      {/* Below topbar: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-y-auto" style={{ paddingLeft: 16 }}>
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
    </div>
  );
};
