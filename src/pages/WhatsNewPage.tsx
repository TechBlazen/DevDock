import { Sparkles, GitCommit, Bug, Wrench, RefreshCw, FileText, Zap, TestTube } from 'lucide-react';
import releases from 'virtual:changelog';

const TYPE_CONFIG: Record<string, { icon: typeof Sparkles; color: string }> = {
  feat:     { icon: Sparkles,   color: 'var(--accent)' },
  fix:      { icon: Bug,        color: '#ef4444' },
  chore:    { icon: Wrench,     color: '#6b7280' },
  refactor: { icon: RefreshCw,  color: '#8b5cf6' },
  docs:     { icon: FileText,   color: '#3b82f6' },
  perf:     { icon: Zap,        color: '#f59e0b' },
  test:     { icon: TestTube,   color: '#10b981' },
  other:    { icon: GitCommit,  color: 'var(--text-muted)' },
};

function stripPrefix(message: string): string {
  return message.replace(/^(feat|fix|chore|refactor|docs|perf|test)(\([^)]*\))?:\s*/i, '').trim();
}

export const WhatsNewPage = () => {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={24} style={{ color: 'var(--accent)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>What's New</h1>
      </div>

      <div className="flex flex-col gap-6">
        {releases.map((release) => (
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

            {/* Commits list */}
            <div className="px-6 py-4 flex flex-col gap-3">
              {release.commits.map((commit) => {
                const cfg = TYPE_CONFIG[commit.type] ?? TYPE_CONFIG.other;
                const Icon = cfg.icon;
                return (
                  <div key={commit.sha} className="flex items-start gap-3">
                    <Icon size={14} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {stripPrefix(commit.message)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
