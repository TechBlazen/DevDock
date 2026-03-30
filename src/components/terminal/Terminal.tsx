import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  onClose: () => void;
}

export const TerminalPanel = ({ onClose }: TerminalPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontSize: 13,
      fontFamily: "'Source Code Pro', 'JetBrains Mono', monospace",
      cursorBlink: true,
      cursorStyle: 'bar',
      theme: {
        background: '#0c1222',
        foreground: '#c8d6e5',
        cursor: '#3b82f6',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
        black: '#1e293b',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#fca5a5',
        brightGreen: '#6ee7b7',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc',
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    // Small delay to let the DOM settle before fitting
    setTimeout(() => fit.fit(), 50);

    termRef.current = term;
    fitRef.current = fit;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Send initial size
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          term.write(msg.data);
        } else if (msg.type === 'exit') {
          term.write(`\r\n\x1b[90m[Process exited with code ${msg.code}]\x1b[0m\r\n`);
          setConnected(false);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      term.write('\r\n\x1b[90m[Connection closed]\x1b[0m\r\n');
    };

    ws.onerror = () => {
      setConnected(false);
      term.write('\r\n\x1b[31m[Connection error — is the dev server running?]\x1b[0m\r\n');
    };

    // Send terminal input to WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch {
        // ignore resize errors during teardown
      }
    });
    resizeObserver.observe(containerRef.current);

    term.focus();

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Re-fit on expand/collapse
  useEffect(() => {
    setTimeout(() => {
      fitRef.current?.fit();
      if (wsRef.current?.readyState === WebSocket.OPEN && termRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols: termRef.current.cols, rows: termRef.current.rows }));
      }
    }, 100);
  }, [expanded]);

  return (
    <div
      className="flex flex-col transition-all duration-300"
      style={{
        height: expanded ? '70vh' : '35vh',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        background: '#0c1222',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 flex-shrink-0" style={{
        background: 'rgba(255, 255, 255, 0.06)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: connected ? '#34d399' : '#f87171',
              boxShadow: connected ? '0 0 6px rgba(52,211,153,0.5)' : '0 0 6px rgba(248,113,113,0.5)',
            }}
          />
          <span className="text-[11px] font-mono font-semibold" style={{ color: 'rgba(200, 214, 229, 0.7)' }}>
            Terminal
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(200, 214, 229, 0.35)' }}>
            {connected ? 'connected' : 'disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgba(200, 214, 229, 0.4)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(200,214,229,0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200,214,229,0.4)'}
            title={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgba(200, 214, 229, 0.4)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200,214,229,0.4)'}
            title="Close terminal"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div ref={containerRef} className="flex-1 px-1 py-1" style={{ background: '#0c1222' }} />
    </div>
  );
};
