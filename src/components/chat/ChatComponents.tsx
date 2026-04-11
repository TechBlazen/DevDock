/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import type { AIProvider, ChatMessage } from '../../types';

// ─── Provider config ──────────────────────────────────────────────────────────
export const providers: { id: AIProvider; label: string; color: string; model: string }[] = [
  { id: 'anthropic', label: 'Claude',        color: '#cc785c', model: 'claude-sonnet-4-20250514' },
  { id: 'openai',    label: 'GPT-4o',        color: '#10a37f', model: 'gpt-4o' },
  { id: 'gemini',    label: 'Gemini',         color: '#4285f4', model: 'gemini-2.0-flash' },
  { id: 'local',     label: 'Ollama',         color: '#b388ff', model: 'llama3.2' },
];

// ─── Simple markdown renderer ─────────────────────────────────────────────────
export const MarkdownText = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  // Split on code fences
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-[13px] leading-relaxed space-y-2" style={{ color: 'var(--text-secondary)' }}>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <div key={i} className="relative group">
              <pre
                className="rounded-lg p-3 overflow-x-auto text-[11px] font-mono leading-relaxed"
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--code-text)',
                }}
              >
                {lines}
              </pre>
              <button
                onClick={() => handleCopy(lines, i)}
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                {copied === i ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          );
        }

        // Inline formatting
        const html = part
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>')
          .replace(/`(.+?)`/g, '<code style="background:var(--code-bg);color:var(--code-text);padding:1px 4px;border-radius:4px;font-size:11px;font-family:monospace">$1</code>')
          .replace(/^### (.+)$/gm, '<div style="color:var(--text-primary);font-weight:700;font-size:14px;font-family:monospace;margin-top:4px">$1</div>')
          .replace(/^## (.+)$/gm, '<div style="color:var(--text-primary);font-weight:900;font-size:14px;font-family:monospace;margin-top:8px">$1</div>')
          .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 items-start"><span style="color:var(--accent);margin-top:2px;flex-shrink:0">›</span><span>$1</span></div>')
          .replace(/\n\n/g, '<br/><br/>')
          .replace(/\n/g, '<br/>');

        return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
};

// ─── Message bubble ───────────────────────────────────────────────────────────
export const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={{
          background: isUser ? 'var(--accent-bg)' : 'var(--bg-inset)',
          color: isUser ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        {isUser ? 'J' : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
          isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={{
          background: isUser ? 'var(--accent-bg)' : 'var(--bg-surface)',
          border: `1px solid ${isUser ? 'var(--accent)' : 'var(--border-color)'}`,
          borderColor: isUser ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border-color)',
        }}
      >
        <MarkdownText text={msg.content} />

        {/* Footer meta */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.provider && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{msg.provider}</span>
          )}
          {msg.traceId && (
            <span
              className="text-[10px] font-mono cursor-pointer transition-colors hover:opacity-70"
              style={{ color: 'var(--text-faint)' }}
              title={`OTel trace: ${msg.traceId}`}
              onClick={() => navigator.clipboard.writeText(msg.traceId!)}
            >
              ⚡ {msg.traceId.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Typing indicator ─────────────────────────────────────────────────────────
export const TypingIndicator = () => (
  <div className="flex gap-2.5">
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center"
      style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
    >
      <Bot size={14} />
    </div>
    <div
      className="rounded-xl rounded-tl-sm px-3.5 py-3 flex gap-1.5 items-center"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accent)', animation: `forge-pulse 1.2s ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  </div>
);
