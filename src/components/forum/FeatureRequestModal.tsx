import { useState, useRef } from 'react';
import { X, Paperclip, FileImage, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Button } from '../ui';
import { ForumMarkdownEditor } from './ForumMarkdownEditor';
import { useForumStore } from '../../store';
import { useAuthStore } from '../../store';
import { DEPARTMENTS, TECHNOLOGIES } from '../../lib/forum-constants';
import type { FeatureRequestAttachment } from '../../types';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

export const FeatureRequestModal = ({ isOpen, onClose }: FeatureRequestModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FeatureRequestAttachment[]>([]);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFeatureRequest = useForumStore((s) => s.addFeatureRequest);
  const user = useAuthStore((s) => s.user);

  const allTags = [...DEPARTMENTS, ...TECHNOLOGIES];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError(`Unsupported file type: ${file.name}. Use PNG, JPG, GIF, WebP, or PDF.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File too large: ${file.name}. Max 5 MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: nanoid(),
            name: file.name,
            url: reader.result as string,
            type: file.type,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !user) return;

    addFeatureRequest({
      title: title.trim(),
      description: description.trim(),
      authorId: user.id,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      attachments,
      tags: selectedTags,
    });

    setTitle('');
    setDescription('');
    setSelectedTags([]);
    setAttachments([]);
    setFileError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Submit feature request"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(2px)' }} />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 640,
          background: 'var(--bg-elevated)', borderRadius: 12,
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 100px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Submit Feature Request
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
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What feature would you like to see?"
              className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-all duration-200"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid var(--border-input)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <ForumMarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe the feature, the problem it solves, and any implementation ideas... Supports Markdown and HTML."
              minHeight={140}
            />
          </div>

          {/* Attachments */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Attachments
              <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>(screenshots, mockups, PDFs — max 5 MB each)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              multiple
              onChange={handleFileSelect}
              className="sr-only"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium transition-all cursor-pointer"
              style={{
                background: 'var(--bg-inset)',
                border: '1px dashed var(--border-input)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Paperclip size={14} />
              Add files...
            </button>

            {fileError && (
              <span className="text-[11px]" style={{ color: '#ef4444' }}>{fileError}</span>
            )}

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
                  >
                    {att.type.startsWith('image/') ? (
                      <img src={att.url} alt={att.name} className="rounded" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                    ) : (
                      <FileImage size={16} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium truncate block" style={{ color: 'var(--text-primary)' }}>{att.name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{formatSize(att.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="p-0.5 rounded transition-colors cursor-pointer"
                      style={{ color: 'var(--text-faint)', background: 'transparent', border: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Tags</label>
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
                    <input type="checkbox" checked={active} onChange={() => toggleTag(tag)} className="sr-only" />
                    {tag}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || !description.trim()}>
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
