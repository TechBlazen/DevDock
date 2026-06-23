import { useState } from 'react';
import { Send, Wand2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui';
import { useRegistryStore } from '../../store';
import { validateSkillMd, slugifySkillName } from '../../lib/skill-format';
import type { GalleryKind } from '../../types';

// Submit form for publishing an agent or skill to the registry. Builds a
// SKILL.md (the packaging unit), validates it client-side, then creates a draft
// and submits it for admin review in one step.

function buildTemplate(name: string, description: string, kind: GalleryKind): string {
  const slug = slugifySkillName(name) || `my-${kind}`;
  return `---
name: ${slug}
description: ${description || 'What it does, and when to use it.'}
license: MIT
---

# ${name || slug}

Describe the workflow this ${kind} follows:

1. Step one
2. Step two
3. Step three`;
}

interface GallerySubmitFormProps {
  onDone?: () => void;
}

export const GallerySubmitForm = ({ onDone }: GallerySubmitFormProps) => {
  const { createItem, submitItem } = useRegistryStore();

  const [kind, setKind] = useState<GalleryKind>('skill');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [content, setContent] = useState('');
  const [touchedContent, setTouchedContent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const effectiveContent = touchedContent && content ? content : buildTemplate(name, description, kind);

  const handleSubmit = async () => {
    const { ok, errors: errs } = validateSkillMd(effectiveContent);
    if (!ok) { setErrors(errs); return; }
    setErrors([]);
    setBusy(true);

    const created = await createItem({
      kind,
      name: name.trim(),
      description: description.trim(),
      content: effectiveContent,
      category: category.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      capabilities: capabilities.split(',').map((c) => c.trim()).filter(Boolean),
    });

    if (created) {
      await submitItem(created.id);
      setDone(true);
      setBusy(false);
      onDone?.();
    } else {
      setErrors(['Failed to create — the name may already be taken.']);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CheckCircle2 size={32} style={{ color: '#10b981' }} />
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Submitted for review</div>
        <div className="text-[13px] max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Your {kind} is pending admin approval. You can track it under the “Mine” filter.
        </div>
        <Button variant="primary" size="sm" onClick={() => { setDone(false); setName(''); setDescription(''); setTags(''); setCapabilities(''); setCategory(''); setContent(''); setTouchedContent(false); }}>
          Submit another
        </Button>
      </div>
    );
  }

  const labelCls = 'text-[11px] font-semibold uppercase tracking-wider';
  const inputStyle = { background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' } as const;

  return (
    <div className="max-w-2xl space-y-4">
      {/* Kind toggle */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        {(['skill', 'agent'] as GalleryKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className="text-[12px] font-semibold px-4 py-1.5 rounded-md capitalize transition-colors"
            style={{ background: kind === k ? 'var(--bg-surface)' : 'transparent', color: kind === k ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls} style={{ color: 'var(--text-muted)' }}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-skill" className="text-[13px] px-3 py-2 rounded-lg outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls} style={{ color: 'var(--text-muted)' }}>Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Code Quality" className="text-[13px] px-3 py-2 rounded-lg outline-none" style={inputStyle} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelCls} style={{ color: 'var(--text-muted)' }}>Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it does, and when to use it." className="text-[13px] px-3 py-2 rounded-lg outline-none" style={inputStyle} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls} style={{ color: 'var(--text-muted)' }}>Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="review, git" className="text-[13px] px-3 py-2 rounded-lg outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls} style={{ color: 'var(--text-muted)' }}>Capabilities (comma-separated)</span>
          <input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="read-diff, comment" className="text-[13px] px-3 py-2 rounded-lg outline-none" style={inputStyle} />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className={labelCls} style={{ color: 'var(--text-muted)' }}>SKILL.md</span>
          <button
            onClick={() => { setContent(buildTemplate(name, description, kind)); setTouchedContent(true); }}
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: 'var(--accent)' }}
          >
            <Wand2 size={11} /> Generate from fields
          </button>
        </div>
        <textarea
          value={effectiveContent}
          onChange={(e) => { setContent(e.target.value); setTouchedContent(true); }}
          rows={12}
          spellCheck={false}
          className="text-[12px] px-3 py-2 rounded-lg outline-none"
          style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
        />
      </label>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]" style={{ background: 'rgba(211,47,47,0.08)', color: '#d32f2f' }}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          Submissions are reviewed by an admin before appearing in the gallery.
        </span>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={busy}>
          <Send size={12} /> {busy ? 'Submitting…' : 'Submit for review'}
        </Button>
      </div>
    </div>
  );
};
