import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plug, Unplug, Send, Trash2, ArrowRight, ArrowLeft,
  Clock, Loader2, ArrowDownToLine,
} from 'lucide-react';
import { Button } from '../ui';

interface WsMessage {
  id: number;
  direction: 'sent' | 'received';
  content: string;
  timestamp: Date;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  disconnected: { color: '#d32f2f', label: 'Disconnected' },
  connecting: { color: '#ed6c02', label: 'Connecting...' },
  connected: { color: '#2e7d32', label: 'Connected' },
};

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
  '.' + String(d.getMilliseconds()).padStart(3, '0');

export const WebSocketDebugger = () => {
  const [url, setUrl] = useState('wss://echo.websocket.org');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [duration, setDuration] = useState('0s');
  const nextId = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Duration timer
  useEffect(() => {
    if (!connectedAt) { setDuration('0s'); return; }
    const id = setInterval(() => setDuration(formatDuration(Date.now() - connectedAt)), 1000);
    return () => clearInterval(id);
  }, [connectedAt]);

  const connect = useCallback(() => {
    if (!url.trim()) return;
    setStatus('connecting');

    try {
      const ws = new WebSocket(url.trim());
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setConnectedAt(Date.now());
      };

      ws.onclose = () => {
        setStatus('disconnected');
        setConnectedAt(null);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setStatus('disconnected');
        setConnectedAt(null);
        wsRef.current = null;
      };

      ws.onmessage = (e) => {
        setMessages((prev) => [
          ...prev,
          { id: nextId.current++, direction: 'received', content: String(e.data), timestamp: new Date() },
        ]);
      };
    } catch {
      setStatus('disconnected');
    }
  }, [url]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
    setConnectedAt(null);
  }, []);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(input);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, direction: 'sent', content: input, timestamp: new Date() },
    ]);
    setInput('');
  }, [input]);

  const isConnected = status === 'connected';
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="h-full flex flex-col" style={{ color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex flex-col gap-3 p-4"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
      >
        {/* URL row */}
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-md px-3 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
            placeholder="WebSocket URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status !== 'disconnected'}
            onKeyDown={(e) => e.key === 'Enter' && !isConnected && connect()}
          />
          {status === 'disconnected' ? (
            <Button variant="primary" size="md" onClick={connect}>
              <Plug size={14} /> Connect
            </Button>
          ) : status === 'connecting' ? (
            <Button variant="ghost" size="md" disabled>
              <Loader2 size={14} className="animate-spin" /> Connecting
            </Button>
          ) : (
            <Button variant="danger" size="md" onClick={disconnect}>
              <Unplug size={14} /> Disconnect
            </Button>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: cfg.color,
                animation: status === 'connecting' ? 'forge-pulse 2s infinite' : undefined,
              }}
            />
            <span style={{ color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Clock size={12} /> {duration}
            </div>
          )}
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <ArrowDownToLine size={12} /> Auto-scroll
          </label>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            <Trash2 size={12} /> Clear
          </Button>
        </div>
      </div>

      {/* Message log */}
      <div
        ref={logRef}
        className="flex-1 overflow-auto p-4"
        style={{ background: 'var(--bg-inset)' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-faint)' }}>
            <Plug size={32} />
            <span className="text-[13px]">No messages yet</span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Connect to a WebSocket server and start sending messages
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-2 rounded-md px-3 py-1.5 text-[13px] font-mono"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--text-faint)', minWidth: 90 }}>
                  {formatTime(msg.timestamp)}
                </span>
                {msg.direction === 'sent' ? (
                  <ArrowRight size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <ArrowLeft size={14} style={{ color: '#2e7d32', flexShrink: 0, marginTop: 2 }} />
                )}
                <span
                  className="break-all whitespace-pre-wrap"
                  style={{ color: msg.direction === 'sent' ? 'var(--accent)' : '#2e7d32' }}
                >
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message input */}
      <div
        className="flex-shrink-0 flex items-end gap-2 p-4"
        style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
      >
        <textarea
          className="flex-1 rounded-md px-3 py-2 text-[13px] outline-none resize-none font-mono"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
            minHeight: 60,
            maxHeight: 120,
          }}
          placeholder={isConnected ? 'Type a message...' : 'Connect to send messages'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button variant="primary" size="md" onClick={sendMessage} disabled={!isConnected || !input.trim()}>
          <Send size={14} /> Send
        </Button>
      </div>
    </div>
  );
};
