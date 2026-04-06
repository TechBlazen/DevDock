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
    <div className="w-[420px] h-full bg-[#080f1e] border-l border-[#1c2840] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1c2840]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2a6fff,#00e5a0)' }}
        >
          <Bot size={16} color="#fff" />
        </div>
        <div>
          <div className="text-sm font-bold text-[#e0e8ff] font-mono">DevDock AI</div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#3a4a6a] font-mono">
            <StatusDot color="green" pulse />
            MCP: {runningMCP} active
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={clearMessages}
            className="p-1.5 text-[#3a4a6a] hover:text-[#ff4757] transition-colors"
            title="Clear chat"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-[#3a4a6a] hover:text-[#8090b0] transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Provider selector */}
      <div className="flex gap-2 px-3 py-2.5 border-b border-[#0d1526] flex-wrap">
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
                color: active ? p.color : hasKey ? '#6a7a9a' : '#2a3550',
                border: active ? `2px solid ${p.color}` : '2px solid #1c2840',
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
              className="text-[10px] bg-[#0d1526] border border-[#1c2840] text-[#4a5a7a] px-2 py-1 rounded-lg hover:text-[#8090b0] hover:border-[#2a3a5a] transition-all font-mono"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-3 pb-3 pt-1">
        <div className="flex gap-2 bg-[#0d1526] border border-[#1c2840] rounded-xl p-2.5 items-end focus-within:border-[#2a6fff44] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask DevDock AI anything… (⏎ send, ⇧⏎ newline)"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-[#c8d8ff] text-[13px] resize-none font-sans placeholder:text-[#2a3a5a] max-h-[120px] leading-relaxed"
            style={{ minHeight: 22 }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: input.trim() && !isLoading ? '#2a6fff' : '#1c2840' }}
          >
            {isLoading ? <Spinner size={14} /> : <Send size={13} color="#fff" />}
          </button>
        </div>
        <div className="text-[10px] text-[#1c2840] text-center mt-1.5 font-mono">
          {currentProvider.label} · {currentProvider.model}
        </div>
      </div>
    </div>
  );
};
