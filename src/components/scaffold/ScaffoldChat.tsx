import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Send, CheckCircle, Trash2,
  Globe, Server, Cloud, Cpu, Boxes, GitBranch, FlaskConical, type LucideIcon,
} from 'lucide-react';
import { useScaffoldStore, useSettingsStore } from '../../store';
import { sendChatMessage } from '../../lib/ai';
import { SCAFFOLD_AGENTS } from '../../lib/scaffold-agents';
import { Button, Spinner } from '../ui';
import { providers, MessageBubble, TypingIndicator, DateSeparator } from '../chat/ChatComponents';
import type { ChatMessage } from '../../types';
import { nanoid } from 'nanoid';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Server, Cloud, Cpu, Boxes, GitBranch, FlaskConical,
};

const AGENT_COLORS: Record<string, string> = {
  'web-app': '#2a6fff',
  'api-service': '#00e5a0',
  'cloud-infra': '#f5a623',
  'mcp-server': '#b388ff',
  'full-stack': '#ff6b8a',
  'devops-github': '#24292e',
  'playwright-testing': '#2ecc40',
};

interface ScaffoldChatProps {
  onBack: () => void;
}

export const ScaffoldChat = ({ onBack }: ScaffoldChatProps) => {
  const { sessions, activeSessionId, addMessage, completeSession, deleteSession, setActiveSession, updateSessionTitle } = useScaffoldStore();
  const { settings, updateAIProvider } = useSettingsStore();

  const session = sessions.find((s) => s.id === activeSessionId);
  const agent = session ? SCAFFOLD_AGENTS.find((a) => a.id === session.agentId) : null;
  const Icon = ICON_MAP[agent?.icon ?? 'Boxes'] ?? Boxes;
  const color = AGENT_COLORS[session?.agentId ?? ''] ?? '#2a6fff';
  // Blend the agent color with --bg-surface so the AI bubble reads against
  // ScaffoldChat's near-black panel regardless of the agent color's
  // luminance. Pure alpha-over-panel fails for dark agent colors (e.g.
  // 'devops-github' is #24292e — essentially black).
  const bubbleTint = `color-mix(in srgb, ${color} 22%, var(--bg-surface))`;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isLoading]);

  if (!session || !agent) return null;

  const messages = session.messages;

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
    addMessage(session.id, userMsg);
    setIsLoading(true);

    // Auto-title after first user message
    if (messages.filter((m) => m.role === 'user').length === 0) {
      const title = text.length > 50 ? text.slice(0, 47) + '...' : text;
      updateSessionTitle(session.id, title);
    }

    await sendChatMessage(
      [...messages, userMsg],
      settings.ai,
      {
        onToken: () => {},
        onDone: (fullText, traceId) => {
          addMessage(session.id, {
            id: nanoid(),
            role: 'assistant',
            content: fullText,
            timestamp: new Date(),
            provider: settings.ai.provider,
            traceId,
          });
          setIsLoading(false);
        },
        onError: (error) => {
          addMessage(session.id, {
            id: nanoid(),
            role: 'assistant',
            content: `⚠️ **Error:** ${error}`,
            timestamp: new Date(),
          });
          setIsLoading(false);
        },
      },
      agent.systemPrompt
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleDelete = () => {
    deleteSession(session.id);
    onBack();
  };

  const handleComplete = () => {
    completeSession(session.id);
  };

  const handleTitleSave = () => {
    if (titleDraft.trim()) {
      updateSessionTitle(session.id, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const currentProvider = providers.find((p) => p.id === settings.ai.provider) ?? providers[0];

  return (
    <div className="h-full flex flex-col bg-[#080f1e] rounded-2xl overflow-hidden" style={{
      border: '1px solid rgba(28, 40, 64, 0.8)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1c2840]">
        <button
          onClick={() => { setActiveSession(null); onBack(); }}
          className="p-1.5 text-[#4a5a7a] hover:text-[#8090b0] transition-colors rounded-lg hover:bg-[#0d1526]"
          title="Back to agents"
        >
          <ArrowLeft size={16} />
        </button>

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
        >
          <Icon size={15} style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="bg-[#0d1526] border border-[#2a6fff44] rounded px-2 py-0.5 text-sm text-[#e0e8ff] font-mono outline-none w-full"
            />
          ) : (
            <div
              className="text-sm font-bold text-[#e0e8ff] font-mono truncate cursor-pointer hover:text-white transition-colors"
              onClick={() => { setEditingTitle(true); setTitleDraft(session.title); }}
              title="Click to rename"
            >
              {session.title}
            </div>
          )}
          <div className="text-[10px] text-[#3a4a6a] font-mono">{agent.name}</div>
        </div>

        <div className="flex items-center gap-2">
          {session.status === 'active' && (
            <Button variant="success" size="sm" onClick={handleComplete}>
              <CheckCircle size={12} />
              Complete
            </Button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 text-[#3a4a6a] hover:text-[#ff4757] transition-colors"
            title="Delete session"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-[#0d1526] flex-wrap">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => updateAIProvider(p.id)}
            style={
              settings.ai.provider === p.id
                ? { background: p.color + '20', color: p.color, borderColor: p.color + '66' }
                : {}
            }
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold transition-all ${
              settings.ai.provider === p.id
                ? ''
                : 'border-[#1c2840] text-[#3a4a6a] hover:border-[#2a3a5a] hover:text-[#6a7a9a]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const next = idx < messages.length - 1 ? messages[idx + 1] : null;

          const msgDate = new Date(msg.timestamp);
          const prevDate = prev ? new Date(prev.timestamp) : null;
          const showDate = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

          const isFirstInGroup = !prev || prev.role !== msg.role || showDate;
          const isLastInGroup = !next || next.role !== msg.role
            || new Date(next.timestamp).toDateString() !== msgDate.toDateString();

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="py-3">
                  <DateSeparator date={msgDate} />
                </div>
              )}
              <div className={isLastInGroup ? 'mb-1' : 'mb-0.5'}>
                <MessageBubble
                  msg={msg}
                  showSenderName={isFirstInGroup}
                  showAvatar={isLastInGroup}
                  senderName={agent.name}
                  accentColor={color}
                  avatarIcon={<Icon size={16} />}
                  bubbleBg={bubbleTint}
                />
              </div>
            </div>
          );
        })}
        {isLoading && (
          <TypingIndicator accentColor={color} avatarIcon={<Icon size={16} />} bubbleBg={bubbleTint} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex gap-2 bg-[#0d1526] border border-[#1c2840] rounded-xl p-2.5 items-end focus-within:border-[#2a6fff44] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Describe what you want to scaffold… (⏎ send)`}
            rows={1}
            disabled={session.status === 'completed'}
            className="flex-1 bg-transparent border-none outline-none text-[#c8d8ff] text-[13px] resize-none font-sans placeholder:text-[#2a3a5a] max-h-[160px] leading-relaxed disabled:opacity-40"
            style={{ minHeight: 22 }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={isLoading || !input.trim() || session.status === 'completed'}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: input.trim() && !isLoading ? color : '#1c2840' }}
          >
            {isLoading ? <Spinner size={14} /> : <Send size={13} color="#fff" />}
          </button>
        </div>
        <div className="text-[10px] text-[#1c2840] text-center mt-1.5 font-mono">
          {currentProvider.label} · {currentProvider.model} · {session.status === 'completed' ? 'Session completed' : 'Scaffold mode'}
        </div>
      </div>
    </div>
  );
};
