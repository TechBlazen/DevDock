import { useState, useRef, useEffect } from 'react';
import { X, Bot, Send, Trash2 } from 'lucide-react';
import { useChatStore, useSettingsStore, useMCPStore } from '../../store';
import { sendChatMessage } from '../../lib/ai';
import { StatusDot, Spinner } from '../ui';
import type { ChatMessage } from '../../types';
import { nanoid } from 'nanoid';
import { providers, MessageBubble, TypingIndicator } from './ChatComponents';

// ─── Main chat panel ──────────────────────────────────────────────────────────
export const ChatPanel = () => {
  const { messages, isLoading, addMessage, clearMessages, setLoading, setOpen } = useChatStore();
  const { settings, updateAIProvider } = useSettingsStore();
  const servers = useMCPStore((s) => s.servers);
  const runningMCP = servers.filter((s) => s.status === 'running').length;

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setLoading(true);

    await sendChatMessage([...messages, userMsg], settings.ai, {
      onToken: () => {},
      onDone: (fullText, traceId) => {
        addMessage({
          id: nanoid(),
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
          provider: settings.ai.provider,
          traceId,
        });
        setLoading(false);
      },
      onError: (error) => {
        addMessage({
          id: nanoid(),
          role: 'assistant',
          content: `⚠️ **Error:** ${error}`,
          timestamp: new Date(),
        });
        setLoading(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const currentProvider = providers.find((p) => p.id === settings.ai.provider) ?? providers[0];

  return (
    <div
      className="w-[420px] h-full flex flex-col"
      style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Bot size={16} color="#fff" />
        </div>
        <div>
          <div className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>DevDock AI</div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            <StatusDot color="green" pulse />
            MCP: {runningMCP} active
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={clearMessages}
            className="p-1.5 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
            title="Clear chat"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Provider selector */}
      <div
        className="flex gap-2 px-3 py-2.5 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        {providers.map((p) => {
          const active = settings.ai.provider === p.id;
          const hasKey = p.id === 'local' || settings.ai.apiKeys[p.id]?.trim();
          return (
            <button
              key={p.id}
              onClick={() => updateAIProvider(p.id)}
              className="rounded-lg transition-all"
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Verdana, Geneva, sans-serif',
                background: active ? p.color + '25' : 'transparent',
                color: active ? p.color : hasKey ? 'var(--text-muted)' : 'var(--text-faint)',
                border: active ? `2px solid ${p.color}` : '2px solid var(--border-color)',
                cursor: 'pointer',
                opacity: hasKey ? 1 : 0.5,
              }}
              title={hasKey ? `${p.label} — ${p.model}` : `${p.label} — no API key configured`}
            >
              {p.label}
              {active && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>{p.model}</span>}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
          {[
            'How do I add a new MCP server?',
            'Explain the OTel traces panel',
            'Help me write a GitHub Actions workflow',
            'What repos need attention?',
          ].map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); textareaRef.current?.focus(); }}
              className="text-[10px] px-2 py-1 rounded-lg transition-all font-mono hover:opacity-80"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex gap-2 rounded-xl p-3 items-end transition-all" style={{
          background: 'var(--bg-inset)',
          border: '2px solid var(--border-input)',
          boxShadow: 'var(--shadow-sm)',
        }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask DevDock AI anything… (⏎ send, ⇧⏎ newline)"
            rows={2}
            className="flex-1 bg-transparent border-none outline-none text-[14px] resize-none max-h-[160px] leading-relaxed chat-block-cursor"
            style={{
              minHeight: 44,
              caretColor: 'var(--accent)',
              fontFamily: 'Verdana, Geneva, sans-serif',
              color: 'var(--text-primary)',
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--border-color)' }}
          >
            {isLoading ? <Spinner size={14} /> : <Send size={13} color="#fff" />}
          </button>
        </div>
        <div className="text-[10px] text-center mt-1.5 font-mono" style={{ color: 'var(--text-faint)' }}>
          {currentProvider.label} · {currentProvider.model}
        </div>
      </div>
    </div>
  );
};
