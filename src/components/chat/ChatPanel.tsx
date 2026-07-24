import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Bot, Send, Trash2, Shield, ChevronDown, Wifi, WifiOff, Sparkles, History, Plus } from 'lucide-react';
import { useChatStore, useSettingsStore, useMCPStore } from '../../store';
import { sendChatMessage } from '../../lib/ai';
import { sendOverwatchMessage } from '../../lib/overwatch';
import { fetchDocsContext } from '../../lib/rag';
import { chatHistoryApi } from '../../lib/api';
import { usePageContext } from '../../lib/page-context';
import { StatusDot, Spinner } from '../ui';
import type { ChatMessage, ChatMode, ChatSession, RagCitation } from '../../types';
import { nanoid } from 'nanoid';
import { providers, MessageBubble, TypingIndicator, OverwatchToolCallProgress, DateSeparator, OVERWATCH_ACCENT, CHAT_ACCENT } from './ChatComponents';

// ─── Session history strip ───────────────────────────────────────────────────
function SessionHistoryStrip({
  sessions,
  currentSessionId,
  onSelect,
  onNew,
}: {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelect: (session: ChatSession) => void;
  onNew: () => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar"
      style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-inset)' }}
    >
      <button
        onClick={onNew}
        title="New conversation"
        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-opacity hover:opacity-80"
        style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
      >
        <Plus size={10} /> New
      </button>
      {sessions.map((s) => {
        const isActive = s.id === currentSessionId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            title={`${s.title}\n${s.pageContext}`}
            className="flex-shrink-0 max-w-[120px] truncate text-[10px] font-mono px-2 py-1 rounded transition-all hover:opacity-80"
            style={{
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'}`,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {s.title || 'Untitled'}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main chat panel ─────────────────────────────────────────────────────────────────
export const ChatPanel = () => {
  const {
    messages, isLoading, addMessage, clearMessages, setLoading, setOpen,
    chatMode, setChatMode, overwatchToolCalls, overwatchThinking,
    setOverwatchToolCalls, setOverwatchThinking,
    neo4jSessionId, setNeo4jSessionId, pageContext, setPageContext,
    historyEnabled, recentSessions, setRecentSessions, loadSessionHistory,
  } = useChatStore();
  const { settings, updateAIProvider, updateAIUseDocsAsContext } = useSettingsStore();
  const useDocs = settings.ai.useDocsAsContext ?? false;
  const servers = useMCPStore((s) => s.servers);
  const runningMCP = servers.filter((s) => s.status === 'running').length;
  const isOverwatch = chatMode === 'overwatch';
  const currentPageContext = usePageContext();

  const [input, setInput] = useState('');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Stable id for this chat session — keeps MCP tool routing sticky across turns.
  const sessionIdRef = useRef(nanoid());

  // ── On open: capture page context and (if Neo4j is on) fetch recent sessions
  // and create a new graph session for this conversation.
  useEffect(() => {
    const chatState = useChatStore.getState();
    if (!chatState.isOpen) return;

    // Always update the current page context.
    setPageContext(currentPageContext);

    if (!historyEnabled) return;

    // Only start a new Neo4j session once per chat open (avoid re-creating on
    // re-renders while the panel stays open).
    if (neo4jSessionId) {
      // Already have a session — just refresh the recent sessions list.
      chatHistoryApi.listSessions().then(setRecentSessions).catch(() => {});
      return;
    }

    chatHistoryApi.createSession(chatMode, currentPageContext)
      .then((s) => setNeo4jSessionId(s.id))
      .catch(() => { /* Neo4j unavailable — continue without history */ });

    chatHistoryApi.listSessions()
      .then(setRecentSessions)
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useChatStore.getState().isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, overwatchToolCalls]);

  // ── Persist a message pair to Neo4j (fire-and-forget).
  const persistMessage = useCallback((
    role: string, content: string, meta?: { provider?: string; traceId?: string; chatMode?: string }
  ) => {
    const sid = useChatStore.getState().neo4jSessionId;
    if (!historyEnabled || !sid) return;
    chatHistoryApi.appendMessage(sid, role, content, meta).catch(() => {});
  }, [historyEnabled]);

  // ── Load a prior session into the panel.
  const handleSelectSession = useCallback(async (session: ChatSession) => {
    try {
      const msgs = await chatHistoryApi.getMessages(session.id);
      const chatMsgs: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role as ChatMessage['role'],
        content: m.content,
        timestamp: new Date(m.timestamp),
        provider: m.provider as ChatMessage['provider'],
        traceId: m.traceId,
        chatMode: m.chatMode as ChatMode,
      }));
      loadSessionHistory(session, chatMsgs);
      setHistoryVisible(false);
    } catch {
      // ignore — stay on current conversation
    }
  }, [loadSessionHistory]);

  // ── Start a fresh conversation.
  const handleNewSession = useCallback(() => {
    clearMessages();
    sessionIdRef.current = nanoid();
    if (historyEnabled) {
      chatHistoryApi.createSession(chatMode, currentPageContext)
        .then((s) => setNeo4jSessionId(s.id))
        .catch(() => {});
    }
    setHistoryVisible(false);
  }, [clearMessages, chatMode, currentPageContext, historyEnabled, setNeo4jSessionId]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      chatMode,
    };
    addMessage(userMsg);
    setLoading(true);

    // Persist the user message to Neo4j (best-effort).
    persistMessage('user', text, { chatMode });

    if (isOverwatch) {
      // Route to Overwatch agent
      await sendOverwatchMessage([...messages, userMsg], settings.overwatch, {
        onToken: () => {},
        onDone: (fullText, traceId) => {
          addMessage({
            id: nanoid(),
            role: 'assistant',
            content: fullText,
            timestamp: new Date(),
            chatMode: 'overwatch',
            traceId,
          });
          persistMessage('assistant', fullText, { traceId, chatMode: 'overwatch' });
          setLoading(false);
          setOverwatchToolCalls([]);
          setOverwatchThinking(false);
        },
        onError: (error) => {
          addMessage({
            id: nanoid(),
            role: 'assistant',
            content: `⚠️ **Overwatch Error:** ${error}`,
            timestamp: new Date(),
            chatMode: 'overwatch',
          });
          setLoading(false);
          setOverwatchToolCalls([]);
          setOverwatchThinking(false);
        },
        onToolCallUpdate: (calls) => setOverwatchToolCalls(calls),
        onThinkingChange: (val) => setOverwatchThinking(val),
      });
    } else {
      // Route to DevDock AI. If the user has "Use my docs" on, retrieve
      // semantic context first and inject it into the system prompt. RAG is
      // best-effort: if retrieval fails (server down, 503, etc.) we proceed
      // without context rather than blocking the chat.
      let systemPrompt: string | undefined;
      let citations: RagCitation[] | undefined;
      if (useDocs) {
        const ctx = await fetchDocsContext(text);
        if (ctx) {
          systemPrompt = ctx.contextPrompt;
          citations = ctx.citations;
        }
      }

      // Build the system prompt — inject the current page context so the AI
      // knows where the user is in the app without them having to explain.
      const pageCtx = useChatStore.getState().pageContext;
      const pageContextPrefix = pageCtx
        ? `[Context: The user is currently on the ${pageCtx}.]\n\n`
        : '';
      const contextualSystemPrompt = systemPrompt
        ? pageContextPrefix + systemPrompt
        : pageContextPrefix || undefined;

      await sendChatMessage([...messages, userMsg], settings.ai, {
        onToken: () => {},
        onDone: (fullText, traceId, meta) => {
          addMessage({
            id: nanoid(),
            role: 'assistant',
            content: fullText,
            timestamp: new Date(),
            provider: settings.ai.provider,
            chatMode: 'devdock',
            traceId,
            ragCitations: citations,
            mcpToolCalls: meta?.mcpToolCalls,
          });
          persistMessage('assistant', fullText, {
            provider: settings.ai.provider,
            traceId,
            chatMode: 'devdock',
          });
          setLoading(false);
        },
        onError: (error) => {
          addMessage({
            id: nanoid(),
            role: 'assistant',
            content: `⚠️ **Error:** ${error}`,
            timestamp: new Date(),
            chatMode: 'devdock',
          });
          setLoading(false);
        },
      }, contextualSystemPrompt, { enableTools: runningMCP > 0, sessionId: sessionIdRef.current });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const currentProvider = providers.find((p) => p.id === settings.ai.provider) ?? providers[0];

  const handleModeSwitch = (mode: ChatMode) => {
    if (mode === chatMode) return;
    setChatMode(mode);
    setModeDropdownOpen(false);
  };

  const overwatchEnabled = settings.overwatch?.enabled;

  return (
    <div
      className="w-[420px] h-full flex flex-col"
      style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
    >
      {/* Header with mode selector */}
      <div
        className="flex items-center gap-3 px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isOverwatch ? OVERWATCH_ACCENT : 'var(--accent)' }}
        >
          {isOverwatch ? <Shield size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
        </div>

        {/* Mode dropdown */}
        <div className="relative">
          <button
            onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div>
              <div className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                {isOverwatch ? 'Overwatch Ask AI' : 'DevDock AI'}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {isOverwatch ? (
                  <>
                    <StatusDot color={overwatchEnabled ? 'green' : 'yellow'} pulse={overwatchEnabled} />
                    ITOps Agent
                  </>
                ) : (
                  <>
                    <StatusDot color="green" pulse />
                    MCP: {runningMCP} active
                  </>
                )}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {modeDropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1.5 w-64 rounded-lg overflow-hidden z-50"
              style={{
                background: 'var(--bg-elevated)',
                border: '2px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <button
                onClick={() => handleModeSwitch('devdock')}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition-all cursor-pointer"
                style={{
                  background: chatMode === 'devdock' ? 'var(--accent-bg)' : 'transparent',
                  borderLeft: chatMode === 'devdock' ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <Bot size={16} style={{ color: 'var(--accent)' }} />
                <div className="text-left">
                  <div className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>DevDock AI</div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Multi-provider LLM assistant</div>
                </div>
              </button>
              <button
                onClick={() => overwatchEnabled && handleModeSwitch('overwatch')}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition-all cursor-pointer"
                style={{
                  background: chatMode === 'overwatch' ? `${OVERWATCH_ACCENT}15` : 'transparent',
                  borderLeft: chatMode === 'overwatch' ? `3px solid ${OVERWATCH_ACCENT}` : '3px solid transparent',
                  opacity: overwatchEnabled ? 1 : 0.5,
                }}
              >
                <Shield size={16} style={{ color: OVERWATCH_ACCENT }} />
                <div className="text-left">
                  <div className="text-xs font-bold font-mono" style={{ color: overwatchEnabled ? 'var(--text-primary)' : 'var(--text-faint)' }}>Overwatch Ask AI</div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {overwatchEnabled ? 'ServiceNow · Dynatrace · Splunk' : 'Not configured — enable in Settings'}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {historyEnabled && (
            <button
              onClick={() => setHistoryVisible((v) => !v)}
              className="p-1.5 transition-colors hover:opacity-80"
              style={{ color: historyVisible ? 'var(--accent)' : 'var(--text-muted)' }}
              title="Chat history"
            >
              <History size={14} />
            </button>
          )}
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

      {/* Provider selector (DevDock mode) or Overwatch status bar */}
      {isOverwatch ? (
        <div
          className="flex items-center gap-3 px-3 py-2.5"
          style={{ borderBottom: `1px solid ${OVERWATCH_ACCENT}30`, background: `${OVERWATCH_ACCENT}08` }}
        >
          {overwatchEnabled ? (
            <>
              <Wifi size={12} style={{ color: OVERWATCH_ACCENT }} />
              <div className="flex gap-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: OVERWATCH_ACCENT, fontWeight: 700 }}>🏥 ServiceNow</span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span style={{ color: OVERWATCH_ACCENT, fontWeight: 700 }}>📊 Dynatrace</span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span style={{ color: OVERWATCH_ACCENT, fontWeight: 700 }}>📝 Splunk</span>
              </div>
            </>
          ) : (
            <>
              <WifiOff size={12} style={{ color: 'var(--text-faint)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>Overwatch not configured — enable in Settings</span>
            </>
          )}
        </div>
      ) : (
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
          {/* "Use my docs" RAG toggle — injects semantic-search hits as context
              on each send. Requires the server's vector runtime to be up. */}
          <button
            onClick={() => updateAIUseDocsAsContext(!useDocs)}
            className="rounded-lg transition-all ml-auto"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              background: useDocs ? 'var(--accent-bg)' : 'transparent',
              color: useDocs ? 'var(--accent)' : 'var(--text-muted)',
              border: `2px solid ${useDocs ? 'var(--accent)' : 'var(--border-color)'}`,
              cursor: 'pointer',
            }}
            title="Use your indexed docs as context. Requires semantic search to be configured on the server."
          >
            <Sparkles size={11} />
            Use my docs
          </button>
        </div>
      )}

      {/* Session history strip — shown when user clicks the History icon */}
      {historyEnabled && historyVisible && (
        <SessionHistoryStrip
          sessions={recentSessions}
          currentSessionId={neo4jSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
        />
      )}

      {/* Page context badge */}
      {pageContext && (
        <div
          className="px-3 py-1.5 text-[10px] font-mono truncate"
          style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)', borderBottom: '1px solid var(--border-color)' }}
          title={pageContext}
        >
          📍 {pageContext}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ background: 'var(--bg-surface)' }}>
        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const next = idx < messages.length - 1 ? messages[idx + 1] : null;

          const msgDate = new Date(msg.timestamp);
          const prevDate = prev ? new Date(prev.timestamp) : null;
          const showDate = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

          // A message starts a new group when the previous message was from a
          // different role, or on a different day. The sender label only renders
          // at the top of each AI group, matching the Sendbird layout.
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
                />
              </div>
            </div>
          );
        })}
        {isOverwatch && (overwatchToolCalls.length > 0 || overwatchThinking) && (
          <OverwatchToolCallProgress toolCalls={overwatchToolCalls} isThinking={overwatchThinking} />
        )}
        {isLoading && <TypingIndicator isOverwatch={isOverwatch} />}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — styled as outlined pills like Sendbird suggested replies */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap justify-end" style={{ background: 'var(--bg-surface)' }}>
          {(isOverwatch
            ? [
                'Show my open incidents',
                'What are the latest P1 problems?',
                'Check Dynatrace health for cart-service',
                'Search Splunk logs for errors in checkout',
              ]
            : [
                'How do I add a new MCP server?',
                'Explain the OTel traces panel',
                'Help me write a GitHub Actions workflow',
                'What repos need attention?',
              ]
          ).map((q) => {
            const accent = isOverwatch ? OVERWATCH_ACCENT : CHAT_ACCENT;
            return (
              <button
                key={q}
                onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                className="text-[12px] font-medium transition-all hover:opacity-80"
                style={{
                  padding: '7px 14px',
                  borderRadius: 22,
                  background: 'transparent',
                  border: `1.5px solid ${accent}`,
                  color: accent,
                }}
              >
                {q}
              </button>
            );
          })}
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
            placeholder={isOverwatch ? 'Ask Overwatch anything… (⏎ send, ⇧⏎ newline)' : 'Ask DevDock AI anything… (⏎ send, ⇧⏎ newline)'}
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
          {isOverwatch ? 'Overwatch Agent · Gemini' : `${currentProvider.label} · ${currentProvider.model}`}
        </div>
      </div>
    </div>
  );
};
