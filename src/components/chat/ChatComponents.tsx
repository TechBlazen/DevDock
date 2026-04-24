/* eslint-disable react-refresh/only-export-components */
import { useState, type ReactNode } from 'react';
import { Bot, Copy, Check, Shield, Loader2, Sparkles, FileText, ExternalLink } from 'lucide-react';
import type { AIProvider, ChatMessage, OverwatchToolCall } from '../../types';

// ─── Provider config ──────────────────────────────────────────────────────────────────
export const OVERWATCH_ACCENT = '#1a73e8';
export const CHAT_ACCENT = '#6200EA'; // Sendbird-style purple for DevDock chat bubbles

export const providers: { id: AIProvider; label: string; color: string; model: string }[] = [
  { id: 'anthropic', label: 'Claude',        color: '#cc785c', model: 'claude-sonnet-4-20250514' },
  { id: 'openai',    label: 'GPT-4o',        color: '#10a37f', model: 'gpt-4o' },
  { id: 'gemini',    label: 'Gemini',         color: '#4285f4', model: 'gemini-2.0-flash' },
  { id: 'local',     label: 'Ollama',         color: '#b388ff', model: 'llama3.2' },
];

// ─── Friendly tool call name mapping ──────────────────────────────────────────────────
const TOOL_DISPLAY_NAMES: Record<string, { label: string; emoji: string }> = {
  servicenow_itsm_agent: { label: 'ServiceNow', emoji: '🏥' },
  dynatrace_metrics_agent: { label: 'Dynatrace', emoji: '📊' },
  splunk_logging_agent: { label: 'Splunk', emoji: '📝' },
  get_current_time: { label: 'System Clock', emoji: '⏰' },
  execute_dql: { label: 'Dynatrace DQL', emoji: '📊' },
  find_entity_by_name: { label: 'Dynatrace Entity Lookup', emoji: '🔍' },
  list_problems: { label: 'Dynatrace Problems', emoji: '⚠️' },
  list_vulnerabilities: { label: 'Dynatrace Vulnerabilities', emoji: '🛡️' },
  verify_dql: { label: 'Dynatrace DQL Verify', emoji: '✅' },
  get_environment_info: { label: 'Dynatrace Environment', emoji: '🌐' },
};

// ─── Date separator ─────────────────────────────────────────────────────────────────
export const DateSeparator = ({ date }: { date: Date }) => {
  const label = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
    </div>
  );
};

// ─── Simple markdown renderer ─────────────────────────────────────────────────
export const MarkdownText = ({ text, invert = false }: { text: string; invert?: boolean }) => {
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const textColor = invert ? '#fff' : 'var(--text-primary)';
  const strongColor = invert ? '#fff' : 'var(--text-primary)';

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-[13.5px] leading-relaxed space-y-2" style={{ color: textColor }}>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <div key={i} className="relative group">
              <pre
                className="rounded-lg p-3 overflow-x-auto text-[11px] font-mono leading-relaxed"
                style={{
                  background: invert ? 'rgba(0,0,0,0.25)' : 'var(--code-bg)',
                  border: invert ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-color)',
                  color: invert ? '#fff' : 'var(--code-text)',
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

        const codeBg = invert ? 'rgba(255,255,255,0.18)' : 'var(--code-bg)';
        const codeText = invert ? '#fff' : 'var(--code-text)';

        const html = part
          .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${strongColor};font-weight:600">$1</strong>`)
          .replace(/`(.+?)`/g, `<code style="background:${codeBg};color:${codeText};padding:1px 4px;border-radius:4px;font-size:11px;font-family:monospace">$1</code>`)
          .replace(/^### (.+)$/gm, `<div style="color:${strongColor};font-weight:700;font-size:14px;margin-top:4px">$1</div>`)
          .replace(/^## (.+)$/gm, `<div style="color:${strongColor};font-weight:900;font-size:14px;margin-top:8px">$1</div>`)
          .replace(/^- (.+)$/gm, `<div class="flex gap-1.5 items-start"><span style="color:${invert ? 'rgba(255,255,255,0.8)' : 'var(--accent)'};margin-top:2px;flex-shrink:0">›</span><span>$1</span></div>`)
          .replace(/\n\n/g, '<br/><br/>')
          .replace(/\n/g, '<br/>');

        return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
};

// ─── Message bubble ─────────────────────────────────────────────────────────────────
export const MessageBubble = ({
  msg,
  showAvatar = true,
  showSenderName = true,
  senderName: senderNameOverride,
  accentColor: accentOverride,
  avatarIcon,
}: {
  msg: ChatMessage;
  /** When false, reserves avatar gutter space but hides the icon — used to group consecutive messages. */
  showAvatar?: boolean;
  /** When false, suppresses the "Finch from Sendbird"-style sender label above the bubble. */
  showSenderName?: boolean;
  /** Override the default sender label ("DevDock AI" / "Overwatch Ask AI"). */
  senderName?: string;
  /** Override the default accent (CHAT_ACCENT / OVERWATCH_ACCENT) — used by ScaffoldChat for per-agent colors. */
  accentColor?: string;
  /** Override the default avatar icon (Bot / Shield). */
  avatarIcon?: ReactNode;
}) => {
  const isUser = msg.role === 'user';
  const isOverwatch = msg.chatMode === 'overwatch';
  const defaultAccent = isOverwatch ? OVERWATCH_ACCENT : CHAT_ACCENT;
  const accent = accentOverride ?? defaultAccent;
  const senderName = senderNameOverride ?? (isOverwatch ? 'Overwatch Ask AI' : 'DevDock AI');
  const defaultAvatar = isOverwatch ? <Shield size={16} /> : <Bot size={16} />;
  const avatar = avatarIcon ?? defaultAvatar;
  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[78%] px-4 py-2.5"
          style={{
            background: accent,
            color: '#fff',
            borderRadius: 22,
            fontSize: 13.5,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {showSenderName && (
        <div className="ml-[44px] mb-1 text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {senderName}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="w-9 flex-shrink-0 self-end">
          {showAvatar && (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${accent}18`, color: accent }}
            >
              {avatar}
            </div>
          )}
        </div>
        <div className="flex items-end gap-2 max-w-[85%]">
          <div
            className="px-4 py-2.5"
            style={{
              background: 'var(--bg-inset)',
              borderRadius: 22,
              borderTopLeftRadius: showSenderName ? 6 : 22,
            }}
          >
            <MarkdownText text={msg.content} />

            {msg.ragCitations && msg.ragCitations.length > 0 && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--border-subtle)' }}>
                <div className="flex items-center gap-1 text-[10px] font-semibold mb-1" style={{ color: accent }}>
                  <Sparkles size={10} />
                  Used {msg.ragCitations.length} doc{msg.ragCitations.length === 1 ? '' : 's'} as context
                </div>
                <ul className="space-y-0.5">
                  {msg.ragCitations.map((c) => (
                    <li key={c.parentId} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <FileText size={10} style={{ flexShrink: 0 }} />
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:underline"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {c.title || c.parentId}
                          <ExternalLink size={9} className="inline ml-0.5 mb-0.5" />
                        </a>
                      ) : (
                        <span className="truncate">{c.title || c.parentId}</span>
                      )}
                      <span className="text-[9px] opacity-60">{c.kind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(msg.provider || msg.traceId) && (
              <div className="flex items-center gap-2 mt-1.5">
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
            )}
          </div>
          <span className="text-[11px] flex-shrink-0 pb-1" style={{ color: 'var(--text-faint)' }}>
            {timeStr}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Typing indicator ───────────────────────────────────────────────────────────────
export const TypingIndicator = ({
  isOverwatch = false,
  accentColor: accentOverride,
  avatarIcon,
}: {
  isOverwatch?: boolean;
  accentColor?: string;
  avatarIcon?: ReactNode;
}) => {
  const defaultAccent = isOverwatch ? OVERWATCH_ACCENT : CHAT_ACCENT;
  const accent = accentOverride ?? defaultAccent;
  const defaultAvatar = isOverwatch ? <Shield size={16} /> : <Bot size={16} />;
  const avatar = avatarIcon ?? defaultAvatar;
  return (
    <div className="flex items-end gap-2">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        {avatar}
      </div>
      <div
        className="px-4 py-3 flex gap-1.5 items-center"
        style={{ background: 'var(--bg-inset)', borderRadius: 22 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accent, animation: `forge-pulse 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Overwatch tool call progress ────────────────────────────────────────────────────
export const OverwatchToolCallProgress = ({ toolCalls, isThinking }: { toolCalls: OverwatchToolCall[]; isThinking: boolean }) => {
  if (!isThinking && toolCalls.length === 0) return null;

  return (
    <div className="flex items-end gap-2">
      <div
        className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
        style={{ background: `${OVERWATCH_ACCENT}18`, color: OVERWATCH_ACCENT }}
      >
        <Shield size={16} />
      </div>
      <div
        className="px-4 py-2.5 space-y-1.5"
        style={{ background: 'var(--bg-inset)', borderRadius: 22 }}
      >
        {isThinking && (
          <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: OVERWATCH_ACCENT }}>
            <Loader2 size={12} className="animate-spin" />
            Reasoning...
          </div>
        )}
        {toolCalls.map((tc) => {
          const display = TOOL_DISPLAY_NAMES[tc.toolCallName] ?? { label: tc.toolCallName, emoji: '🔧' };
          const statusColor = tc.status === 'complete' ? '#2e7d32' : OVERWATCH_ACCENT;
          const statusIcon = tc.status === 'complete' ? '✓' : tc.status === 'loading' ? '' : '•';

          return (
            <div key={tc.toolCallId} className="flex items-center gap-2 text-[11px] font-mono" style={{ color: statusColor }}>
              {tc.status === 'loading' ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <span style={{ fontSize: 10, width: 12, textAlign: 'center' }}>{statusIcon}</span>
              )}
              <span>{display.emoji}</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {tc.status === 'complete' ? `${display.label} complete` : `Querying ${display.label}...`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
