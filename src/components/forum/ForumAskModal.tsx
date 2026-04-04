import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import { ForumMarkdownEditor } from './ForumMarkdownEditor';
import { useForumStore } from '../../store';
import { useAuthStore } from '../../store';
import { FORUM_CATEGORIES, DEPARTMENTS, TECHNOLOGIES } from '../../lib/forum-constants';
import type { ForumCategory } from '../../types';

interface ForumAskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForumAskModal = ({ isOpen, onClose }: ForumAskModalProps) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ForumCategory>('question');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const addThread = useForumStore((s) => s.addThread);
  const user = useAuthStore((s) => s.user);

  const allTags = [...DEPARTMENTS, ...TECHNOLOGIES];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !user) return;

    addThread({
      title: title.trim(),
      body: body.trim(),
      category,
      tags: selectedTags,
      authorId: user.id,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
    });

    setTitle('');
    setBody('');
    setCategory('question');
    setSelectedTags([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask a question"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--overlay)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          background: 'var(--bg-elevated)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 100px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Ask a Question
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is your question?"
              className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-all duration-200"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid var(--border-input)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Details
            </label>
            <ForumMarkdownEditor
              value={body}
              onChange={setBody}
              placeholder="Provide details, code snippets, or context... Supports Markdown and HTML."
              minHeight={160}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ForumCategory)}
              className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-all duration-200 cursor-pointer"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                color: 'var(--text-primary)',
              }}
            >
              {FORUM_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <label
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-all duration-200"
                    style={{
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-faint)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-input)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTag(tag)}
                      className="sr-only"
                    />
                    {tag}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || !body.trim()}>
              Post Question
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
