import { useState, useEffect, useRef, useCallback } from 'react';
import { Wand2, FileText, AlignLeft, Minimize2, Wrench, Table, ListChecks, Sparkles } from 'lucide-react';
import { useDocsStore, useSettingsStore } from '../../store';
import { sendChatMessage } from '../../lib/ai';
import { Spinner } from '../ui';
import type { ChatMessage } from '../../types';
import { nanoid } from 'nanoid';

const AI_DOC_ACTIONS = [
  { id: 'improve', label: 'Improve Writing', icon: Wand2, prompt: 'Improve the writing quality, clarity, and grammar of the following markdown document. Keep the structure intact. Return only the improved markdown:' },
  { id: 'summarize', label: 'Summarize', icon: AlignLeft, prompt: 'Summarize the following markdown document concisely. Return the summary as markdown:' },
  { id: 'expand', label: 'Expand Content', icon: FileText, prompt: 'Expand the following markdown document with more detail, examples, and depth. Keep the existing structure. Return only the expanded markdown:' },
  { id: 'fix', label: 'Fix Formatting', icon: Wrench, prompt: 'Fix the markdown formatting of the following document. Ensure proper headers, lists, code blocks, links, and spacing. Return only the corrected markdown:' },
  { id: 'simplify', label: 'Simplify', icon: Minimize2, prompt: 'Simplify the following markdown document to be more concise and easier to understand. Return only the simplified markdown:' },
  { id: 'toc', label: 'Add Table of Contents', icon: ListChecks, prompt: 'Add a table of contents at the top of the following markdown document based on its headers. Return the full document with the TOC added:' },
  { id: 'table', label: 'Convert Lists to Tables', icon: Table, prompt: 'Convert any suitable lists in the following markdown document into well-formatted markdown tables where appropriate. Return the full document:' },
  { id: 'proofread', label: 'Proofread & Correct', icon: Sparkles, prompt: 'Proofread the following markdown document. Fix any spelling, grammar, and punctuation errors. Return only the corrected markdown:' },
];

interface DocContextMenuProps {
  docId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export const DocContextMenu = ({ docId, x, y, onClose }: DocContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { docs, updateDoc } = useDocsStore();
  const [loading, setLoading] = useState<string | null>(null);
  const doc = docs.find((d) => d.id === docId);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const newX = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 8 : x;
    const newY = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y;
    setPos({ x: newX, y: newY });
  }, [x, y]);

  const runAction = useCallback((action: typeof AI_DOC_ACTIONS[0]) => {
    if (!doc || loading) return;
    setLoading(action.id);

    const settings = useSettingsStore.getState().settings;
    const messages: ChatMessage[] = [
      {
        id: nanoid(),
        role: 'user',
        content: `${action.prompt}\n\n${doc.content}`,
        timestamp: new Date(),
      },
    ];

    sendChatMessage(
      messages,
      settings.ai,
      {
        onToken: () => {},
        onDone: (fullText) => {
          const cleaned = fullText.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '').trim();
          updateDoc(docId, { content: cleaned });
          setLoading(null);
          onClose();
        },
        onError: (error) => {
          console.error('AI action failed:', error);
          setLoading(null);
        },
      },
      'You are a markdown editing assistant. Return ONLY the transformed markdown. No explanations, no code fences wrapping the output, just the raw markdown.'
    );
  }, [doc, docId, loading, updateDoc, onClose]);

  if (!doc) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] animate-[fadeIn_0.1s_ease]"
      style={{
        left: pos.x,
        top: pos.y,
        minWidth: 220,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          AI Actions
        </div>
        <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-faint)' }}>
          {doc.title}
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        {AI_DOC_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isLoading = loading === action.id;
          return (
            <button
              key={action.id}
              onClick={() => runAction(action)}
              disabled={!!loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-all disabled:opacity-40"
              style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: loading ? 'wait' : 'pointer' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {isLoading ? <Spinner size={14} /> : <Icon size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              <span className="flex-1">{action.label}</span>
              {isLoading && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Working...</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
