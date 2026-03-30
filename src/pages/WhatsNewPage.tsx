import { Sparkles, Search, Palette, UserCircle, GripVertical, Moon } from 'lucide-react';

const RELEASES = [
  {
    version: '0.3.0',
    date: 'March 2026',
    title: 'Per-User Personalization & Dark Mode',
    features: [
      { icon: Palette, text: 'Full dark mode with light/dark/system theme toggle across the entire app' },
      { icon: UserCircle, text: 'Per-user dashboard personalization — every user gets their own widget layout and preferences' },
      { icon: Moon, text: 'Accent color picker with 6 preset color themes' },
      { icon: UserCircle, text: 'Time-based personalized greeting with role badge and last login display' },
      { icon: UserCircle, text: 'User preferences dropdown in topbar and dedicated /profile page' },
      { icon: UserCircle, text: 'Auto-provisioned accounts for OAuth and guest users' },
    ],
  },
  {
    version: '0.2.0',
    date: 'March 2026',
    title: 'Search & Dashboard Improvements',
    features: [
      { icon: Search, text: 'Cmd+K command palette with fuzzy search across repos, MCP servers, docs, plugins, and more' },
      { icon: Search, text: 'Pluggable search source architecture — easily add new data sources' },
      { icon: GripVertical, text: 'Fixed dashboard widget drag-and-drop with visual feedback' },
      { icon: Search, text: 'Category filter pills and keyboard navigation in search results' },
    ],
  },
  {
    version: '0.1.0',
    date: 'March 2026',
    title: 'Initial Release',
    features: [
      { icon: Sparkles, text: 'AI-powered developer portal with multi-provider chat (Claude, GPT-4o, Gemini, Ollama)' },
      { icon: Sparkles, text: 'GitHub and Azure DevOps repository browsing' },
      { icon: Sparkles, text: 'MCP server lifecycle management' },
      { icon: Sparkles, text: 'OpenTelemetry observability with live traces and metrics' },
      { icon: Sparkles, text: 'Scaffold agents for project generation' },
      { icon: Sparkles, text: 'Plugin system with widget and page contributions' },
      { icon: Sparkles, text: 'Role-based access control (admin, editor, viewer)' },
    ],
  },
];

export const WhatsNewPage = () => {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={24} style={{ color: 'var(--accent)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>What's New</h1>
      </div>

      <div className="flex flex-col gap-6">
        {RELEASES.map((release) => (
          <div
            key={release.version}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Release header */}
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: 'var(--accent-bg)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                v{release.version}
              </span>
              <div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {release.title}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {release.date}
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="px-6 py-4 flex flex-col gap-3">
              {release.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <feature.icon size={14} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
