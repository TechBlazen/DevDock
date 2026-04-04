import { useRef, useCallback } from 'react';
import { Bold, Italic, Code, List, ListOrdered, Link, Heading2, Quote, FileCode2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { ForumMarkdownBody } from './ForumMarkdownBody';

interface ForumMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolbarAction {
  icon: typeof Bold;
  label: string;
  action: (textarea: HTMLTextAreaElement, value: string, onChange: (v: string) => void) => void;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  before: string,
  after: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const replacement = `${before}${selected || 'text'}${after}`;
  const next = value.slice(0, start) + replacement + value.slice(end);
  onChange(next);
  // Restore cursor position after React re-render
  requestAnimationFrame(() => {
    textarea.focus();
    const cursorPos = selected ? start + replacement.length : start + before.length;
    const selEnd = selected ? cursorPos : cursorPos + 4; // select "text" placeholder
    textarea.setSelectionRange(selected ? cursorPos : start + before.length, selEnd);
  });
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  text: string,
) {
  const start = textarea.selectionStart;
  const next = value.slice(0, start) + text + value.slice(start);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + text.length, start + text.length);
  });
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: Bold,
    label: 'Bold',
    action: (ta, val, onChange) => wrapSelection(ta, val, onChange, '**', '**'),
  },
  {
    icon: Italic,
    label: 'Italic',
    action: (ta, val, onChange) => wrapSelection(ta, val, onChange, '_', '_'),
  },
  {
    icon: Code,
    label: 'Inline code',
    action: (ta, val, onChange) => wrapSelection(ta, val, onChange, '`', '`'),
  },
  {
    icon: FileCode2,
    label: 'Code block',
    action: (ta, val, onChange) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = val.slice(start, end);
      const block = `\n\`\`\`\n${selected || '// your code here'}\n\`\`\`\n`;
      const next = val.slice(0, start) + block + val.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        if (!selected) {
          const codeStart = start + 5; // after ```\n
          ta.setSelectionRange(codeStart, codeStart + 20);
        }
      });
    },
  },
  {
    icon: Heading2,
    label: 'Heading',
    action: (ta, val, onChange) => {
      const start = ta.selectionStart;
      // Find line start
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const next = val.slice(0, lineStart) + '## ' + val.slice(lineStart);
      onChange(next);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart + 3, lineStart + 3); });
    },
  },
  {
    icon: List,
    label: 'Bullet list',
    action: (ta, val, onChange) => insertAtCursor(ta, val, onChange, '\n- '),
  },
  {
    icon: ListOrdered,
    label: 'Numbered list',
    action: (ta, val, onChange) => insertAtCursor(ta, val, onChange, '\n1. '),
  },
  {
    icon: Quote,
    label: 'Blockquote',
    action: (ta, val, onChange) => {
      const start = ta.selectionStart;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const next = val.slice(0, lineStart) + '> ' + val.slice(lineStart);
      onChange(next);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart + 2, lineStart + 2); });
    },
  },
  {
    icon: Link,
    label: 'Link',
    action: (ta, val, onChange) => wrapSelection(ta, val, onChange, '[', '](url)'),
  },
];

export const ForumMarkdownEditor = ({ value, onChange, placeholder, minHeight = 160 }: ForumMarkdownEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+B for bold
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      if (textareaRef.current) wrapSelection(textareaRef.current, value, onChange, '**', '**');
    }
    // Ctrl/Cmd+I for italic
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      if (textareaRef.current) wrapSelection(textareaRef.current, value, onChange, '_', '_');
    }
    // Ctrl/Cmd+` for inline code
    if ((e.metaKey || e.ctrlKey) && e.key === '`') {
      e.preventDefault();
      if (textareaRef.current) wrapSelection(textareaRef.current, value, onChange, '`', '`');
    }
    // Tab inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      if (textareaRef.current) insertAtCursor(textareaRef.current, value, onChange, '  ');
    }
  }, [value, onChange]);

  return (
    <div className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-input)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap"
        style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        {TOOLBAR_ACTIONS.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            onClick={() => { if (textareaRef.current) action(textareaRef.current, value, onChange); }}
            className="p-1.5 rounded transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title={label}
          >
            <Icon size={14} />
          </button>
        ))}

        {/* Separator */}
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer"
          style={{
            color: preview ? 'var(--accent)' : 'var(--text-muted)',
            background: preview ? 'var(--accent-bg)' : 'transparent',
            border: preview ? '1px solid var(--accent)' : '1px solid transparent',
          }}
          title={preview ? 'Edit' : 'Preview'}
        >
          {preview ? <EyeOff size={12} /> : <Eye size={12} />}
          {preview ? 'Edit' : 'Preview'}
        </button>

        {/* Hint */}
        <span className="ml-auto text-[9px]" style={{ color: 'var(--text-faint)' }}>
          Markdown + HTML supported
        </span>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div
          className="px-3 py-2 overflow-y-auto"
          style={{ minHeight, background: 'var(--bg-input)' }}
        >
          {value.trim() ? (
            <ForumMarkdownBody content={value} />
          ) : (
            <span className="text-[13px] italic" style={{ color: 'var(--text-faint)' }}>Nothing to preview</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Write using Markdown... **bold**, _italic_, `code`, ```code blocks```'}
          className="w-full px-3 py-2 text-[13px] outline-none resize-y font-mono"
          style={{
            minHeight,
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: 'none',
          }}
        />
      )}
    </div>
  );
};
