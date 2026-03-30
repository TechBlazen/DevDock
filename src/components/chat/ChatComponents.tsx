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
    <div className="text-[13px] leading-relaxed text-[#b0bcd8] space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <div key={i} className="relative group">
              <pre className="bg-[#060c18] border border-[#1c2840] rounded-lg p-3 overflow-x-auto text-[11px] text-[#00e5a0] font-mono leading-relaxed">
                {lines}
              </pre>
              <button
                onClick={() => handleCopy(lines, i)}
                className="absolute top-2 right-2 p-1 bg-[#0d1526] border border-[#1c2840] rounded text-[#4a5a7a] hover:text-[#8090b0] opacity-0 group-hover:opacity-100 transition-all"
              >
                {copied === i ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          );
        }

        // Inline formatting
        const html = part
          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e0e8ff] font-semibold">$1</strong>')
          .replace(/`(.+?)`/g, '<code class="bg-[#0d1526] text-[#00e5a0] px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
          .replace(/^### (.+)$/gm, '<div class="text-[#e0e8ff] font-bold text-sm font-mono mt-1">$1</div>')
          .replace(/^## (.+)$/gm, '<div class="text-[#e0e8ff] font-black text-sm font-mono mt-2">$1</div>')
          .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 items-start"><span class="text-[#2a6fff] mt-0.5 flex-shrink-0">›</span><span>$1</span></div>')
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
        className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-[#2a6fff33] text-[#2a6fff]' : 'bg-[#00e5a022] text-[#00e5a0]'
        }`}
      >
        {isUser ? 'J' : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 border ${
          isUser
            ? 'bg-[#1a2a44] border-[#2a6fff33] rounded-tr-sm'
            : 'bg-[#0d1526] border-[#1c2840] rounded-tl-sm'
        }`}
      >
        <MarkdownText text={msg.content} />

        {/* Footer meta */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-[#2a3a5a] font-mono">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.provider && (
            <span className="text-[10px] text-[#2a3a5a] font-mono">{msg.provider}</span>
          )}
          {msg.traceId && (
            <span
              className="text-[10px] text-[#2a3a5a] font-mono cursor-pointer hover:text-[#4a5a7a] transition-colors"
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
    <div className="w-7 h-7 rounded-lg bg-[#00e5a022] flex items-center justify-center">
      <Bot size={14} className="text-[#00e5a0]" />
    </div>
    <div className="bg-[#0d1526] border border-[#1c2840] rounded-xl rounded-tl-sm px-3.5 py-3 flex gap-1.5 items-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#2a6fff]"
          style={{ animation: `forge-pulse 1.2s ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  </div>
);
