import { useState } from 'react';
import { Send, Check, Eye, Settings2, Layout, FileText, Globe, Link2, BarChart3, ListChecks, MessageSquare, Sparkles } from 'lucide-react';
import { Input, Button, Card } from '../ui';
import { MarkdownViewer } from '../docs/MarkdownViewer';
import { useWidgetSubmissionStore, useAuthStore } from '../../store';
import type { WidgetContentType } from '../../types';

// ─── Widget Templates (like SPFx web part templates) ────────────────────────
interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  contentType: WidgetContentType;
  defaultSize: 'sm' | 'md' | 'lg';
  defaults: { title: string; description: string; markdown?: string; url?: string };
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'blank', name: 'Blank Widget', description: 'Start from scratch with an empty widget',
    icon: '📄', contentType: 'markdown', defaultSize: 'md',
    defaults: { title: '', description: '', markdown: '' },
  },
  {
    id: 'status', name: 'Status Board', description: 'Team status updates and announcements',
    icon: '📋', contentType: 'markdown', defaultSize: 'md',
    defaults: {
      title: 'Team Status', description: 'Current team status and updates',
      markdown: '## Team Status\n\n| Member | Status | Task |\n|--------|--------|------|\n| Alice | 🟢 Online | Feature work |\n| Bob | 🟡 Away | Code review |\n| Carol | 🔴 Offline | — |\n\n### Announcements\n- Sprint review Friday at 3pm\n- Deploy freeze starts Monday',
    },
  },
  {
    id: 'runbook', name: 'Runbook', description: 'Operational runbook with step-by-step instructions',
    icon: '📖', contentType: 'markdown', defaultSize: 'lg',
    defaults: {
      title: 'Incident Runbook', description: 'Step-by-step incident response guide',
      markdown: '## Incident Response Runbook\n\n### 1. Triage\n- [ ] Identify affected services\n- [ ] Check monitoring dashboards\n- [ ] Assess severity (P1-P4)\n\n### 2. Communicate\n- [ ] Post in #incidents channel\n- [ ] Page on-call if P1/P2\n\n### 3. Investigate\n- [ ] Check recent deployments\n- [ ] Review error logs\n- [ ] Check infrastructure metrics\n\n### 4. Resolve\n- [ ] Apply fix or rollback\n- [ ] Verify recovery\n- [ ] Update status page',
    },
  },
  {
    id: 'dashboard-embed', name: 'Dashboard Embed', description: 'Embed a Grafana, Datadog, or other dashboard',
    icon: '📊', contentType: 'iframe', defaultSize: 'lg',
    defaults: { title: 'Monitoring Dashboard', description: 'Live monitoring dashboard', url: '' },
  },
  {
    id: 'quick-link', name: 'Quick Link', description: 'Link to an external tool or resource',
    icon: '🔗', contentType: 'link', defaultSize: 'sm',
    defaults: { title: 'External Tool', description: 'Quick access to an external resource', url: '' },
  },
  {
    id: 'notes', name: 'Team Notes', description: 'Shared team notes and documentation',
    icon: '📝', contentType: 'markdown', defaultSize: 'md',
    defaults: {
      title: 'Team Notes', description: 'Shared notes and documentation',
      markdown: '## Notes\n\nAdd your team notes here...\n\n### Links\n- [Wiki](https://wiki.example.com)\n- [Confluence](https://confluence.example.com)',
    },
  },
];

const SIZE_OPTIONS: { value: 'sm' | 'md' | 'lg'; label: string; desc: string }[] = [
  { value: 'sm', label: 'Small', desc: '1 column' },
  { value: 'md', label: 'Medium', desc: '2 columns' },
  { value: 'lg', label: 'Large', desc: 'Full width' },
];

// ─── Property Pane Field Types (SPFx-style) ────────────────────────────────
type PropertyPaneStep = 'template' | 'configure';

export const WidgetSubmissionForm = () => {
  const user = useAuthStore((s) => s.user);
  const submitWidget = useWidgetSubmissionStore((s) => s.submitWidget);

  const [step, setStep] = useState<PropertyPaneStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Widget properties (SPFx-style property bag)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [contentType, setContentType] = useState<WidgetContentType>('markdown');
  const [markdown, setMarkdown] = useState('');
  const [url, setUrl] = useState('');
  const [iframeHeight, setIframeHeight] = useState(300);
  const [submitted, setSubmitted] = useState(false);

  const selectTemplate = (tpl: WidgetTemplate) => {
    setSelectedTemplate(tpl.id);
    setTitle(tpl.defaults.title);
    setDescription(tpl.defaults.description);
    setIcon(tpl.icon);
    setSize(tpl.defaultSize);
    setContentType(tpl.contentType);
    setMarkdown(tpl.defaults.markdown ?? '');
    setUrl(tpl.defaults.url ?? '');
    setIframeHeight(300);
    setStep('configure');
  };

  const canSubmit = title.trim() && description.trim() && icon.trim() && (
    (contentType === 'markdown' && markdown.trim()) ||
    (contentType === 'iframe' && url.trim()) ||
    (contentType === 'link' && url.trim())
  );

  const handleSubmit = () => {
    if (!canSubmit || !user) return;
    submitWidget({
      title: title.trim(),
      icon: icon.trim(),
      description: description.trim(),
      defaultSize: size,
      content: {
        type: contentType,
        ...(contentType === 'markdown' ? { markdown } : {}),
        ...(contentType !== 'markdown' ? { url } : {}),
        ...(contentType === 'iframe' ? { iframeHeight } : {}),
      },
      submittedBy: user.id,
      submittedByName: user.displayName,
    });
    setTitle(''); setDescription(''); setIcon(''); setMarkdown(''); setUrl('');
    setSize('md'); setContentType('markdown'); setIframeHeight(300);
    setStep('template'); setSelectedTemplate(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  // ─── Step 1: Template Picker (SPFx Toolbox) ─────────────────────────────
  if (step === 'template') {
    return (
      <div style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
        {submitted && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981',
          }}>
            <Check size={16} />
            <span className="text-xs font-medium">Widget submitted for review. An admin will approve it shortly.</span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Create a Widget</span>
        </div>

        {/* Instructions */}
        <Card>
          <div className="space-y-3" style={{ borderLeft: '3px solid var(--accent)', padding: '16px 16px 16px 28px' }}>
            <div className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>How to create a widget</div>
            <ol className="text-[12px] space-y-2 pl-4" style={{ color: 'var(--text-secondary)', listStyleType: 'decimal' }}>
              <li><strong>Pick a template</strong> — Choose a starting point from the templates below, or start from scratch with the Blank Widget.</li>
              <li><strong>Configure properties</strong> — Use the Property Pane on the right to set a title, icon, description, size, and content. Changes appear instantly in the Live Preview on the left.</li>
              <li><strong>Choose a content type</strong> — Widgets support three content types:
                <ul className="mt-1 ml-4 space-y-0.5" style={{ listStyleType: 'disc', color: 'var(--text-muted)' }}>
                  <li><strong>Markdown</strong> — Write rich text with headings, tables, lists, and code blocks.</li>
                  <li><strong>Embed</strong> — Embed an external dashboard or page via iframe (Grafana, Datadog, etc.).</li>
                  <li><strong>Link</strong> — Create a quick-access link to an external tool or resource.</li>
                </ul>
              </li>
              <li><strong>Submit for review</strong> — Once you're happy with the preview, click Submit. An administrator will review and approve your widget before it becomes available in the catalog.</li>
            </ol>
          </div>
        </Card>

        <div className="text-[12px] font-bold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>Choose a Template</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WIDGET_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => selectTemplate(tpl)}
              className="text-left p-4 rounded-xl transition-all duration-200"
              style={{
                background: 'var(--bg-surface)',
                border: '2px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              <div className="text-2xl mb-2">{tpl.icon}</div>
              <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{tpl.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{tpl.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)' }}>
                  {tpl.contentType}
                </span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)' }}>
                  {tpl.defaultSize}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Step 2: SPFx-style Property Pane + Live Preview ─────────────────────
  return (
    <div style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setStep('template'); setSelectedTemplate(null); }}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
          >
            ← Templates
          </button>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Widget Builder</span>
        </div>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          <Send size={12} /> Submit for Review
        </Button>
      </div>

      {/* Split pane: Preview (left) + Property Pane (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* ── Live Preview Panel ──────────────────────────────────────────── */}
        <Card>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <Eye size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Live Preview</span>
          </div>
          <div style={{ minHeight: 280 }}>
            {/* Widget chrome preview */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-lg">{icon || '📦'}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title || 'Widget Title'}</span>
              <span className="ml-auto text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-inset)', color: 'var(--text-faint)' }}>
                {size}
              </span>
            </div>
            {/* Content preview */}
            <div className="p-4">
              {contentType === 'markdown' && (
                markdown.trim() ? (
                  <div className="overflow-auto" style={{ maxHeight: 300 }}>
                    <MarkdownViewer content={markdown} />
                  </div>
                ) : (
                  <div className="text-xs text-center py-8" style={{ color: 'var(--text-faint)' }}>
                    Start typing markdown in the Property Pane to see a live preview
                  </div>
                )
              )}
              {contentType === 'iframe' && (
                url.trim() ? (
                  <iframe src={url} title="Preview" sandbox="allow-scripts allow-same-origin" className="w-full border-0 rounded" style={{ height: iframeHeight }} />
                ) : (
                  <div className="text-xs text-center py-8" style={{ color: 'var(--text-faint)' }}>
                    Enter an embed URL in the Property Pane to preview
                  </div>
                )
              )}
              {contentType === 'link' && (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <Link2 size={24} style={{ color: 'var(--accent)', opacity: 0.5 }} />
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    {description || 'Widget description'}
                  </p>
                  {url.trim() ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs px-4 py-2 rounded-lg"
                      style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)', textDecoration: 'none' }}>
                      Open Link →
                    </a>
                  ) : (
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Enter a URL to preview</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Property Pane (SPFx-style) ─────────────────────────────────── */}
        <Card>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <Settings2 size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Property Pane</span>
          </div>
          <div className="p-4 space-y-5 overflow-y-auto" style={{ maxHeight: 520 }}>

            {/* ── Group: General Properties ─────────────────────────────── */}
            <PropertyPaneGroup title="General Properties" icon={<Layout size={12} />}>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_64px] gap-2">
                  <PropertyPaneTextField label="Title" value={title} onChange={setTitle} placeholder="Widget title" maxLength={60} />
                  <PropertyPaneTextField label="Icon" value={icon} onChange={setIcon} placeholder="🔧" />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                    placeholder="What does this widget display?"
                    rows={2}
                    className="w-full rounded-md px-2.5 py-1.5 text-[12px] outline-none resize-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </PropertyPaneGroup>

            {/* ── Group: Layout ─────────────────────────────────────────── */}
            <PropertyPaneGroup title="Layout" icon={<Layout size={12} />}>
              <div>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Widget Size</label>
                <div className="flex gap-1.5">
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSize(opt.value)}
                      className="flex-1 px-2 py-2 rounded-lg text-center transition-all"
                      style={{
                        background: size === opt.value ? 'var(--accent-bg)' : 'transparent',
                        color: size === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                        border: size === opt.value ? '1px solid var(--accent)' : '1px solid var(--border-input)',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="text-[11px] font-semibold">{opt.label}</div>
                      <div className="text-[9px]" style={{ color: size === opt.value ? 'var(--accent)' : 'var(--text-faint)' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </PropertyPaneGroup>

            {/* ── Group: Content Configuration ──────────────────────────── */}
            <PropertyPaneGroup title="Content Configuration" icon={<FileText size={12} />}>
              <div className="space-y-3">
                {/* Content type dropdown (SPFx PropertyPaneDropdown equivalent) */}
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Content Type</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as WidgetContentType)}
                    className="w-full rounded-md px-2.5 py-2 text-[12px] outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    <option value="markdown">📝 Markdown — Rich text content</option>
                    <option value="iframe">📊 Embed — External page via iframe</option>
                    <option value="link">🔗 Link — External link with description</option>
                  </select>
                </div>

                {/* Conditional content fields */}
                {contentType === 'markdown' && (
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Markdown Content</label>
                    <textarea
                      value={markdown}
                      onChange={(e) => setMarkdown(e.target.value)}
                      placeholder="# Heading&#10;&#10;Write markdown here..."
                      rows={8}
                      className="w-full rounded-md px-2.5 py-1.5 text-[11px] outline-none resize-y"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)', fontFamily: "'Source Code Pro', monospace" }}
                    />
                  </div>
                )}

                {contentType === 'iframe' && (
                  <>
                    <PropertyPaneTextField label="Embed URL" value={url} onChange={setUrl} placeholder="https://example.com/embed" />
                    <div>
                      <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Height (px)</label>
                      <input
                        type="range"
                        min={150}
                        max={600}
                        step={10}
                        value={iframeHeight}
                        onChange={(e) => setIframeHeight(Number(e.target.value))}
                        className="w-full"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <div className="text-[10px] text-right" style={{ color: 'var(--text-faint)' }}>{iframeHeight}px</div>
                    </div>
                  </>
                )}

                {contentType === 'link' && (
                  <PropertyPaneTextField label="Link URL" value={url} onChange={setUrl} placeholder="https://example.com" />
                )}
              </div>
            </PropertyPaneGroup>
          </div>

          {/* Submit footer */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={!canSubmit} className="w-full">
              <Send size={13} /> Submit for Review
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Property Pane Primitives (SPFx-style reusable components) ──────────────

const PropertyPaneGroup = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2.5 pb-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</span>
    </div>
    {children}
  </div>
);

const PropertyPaneTextField = ({ label, value, onChange, placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) => (
  <div>
    <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md px-2.5 py-1.5 text-[12px] outline-none"
      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
    />
  </div>
);
