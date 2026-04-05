import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, X } from 'lucide-react';
import { RepoList } from '../components/repos/RepoList';
import { MCPRegistry } from '../components/mcp/MCPRegistry';
import { TelemetryPage } from '../components/telemetry';
import { SectionTitle } from '../components/ui';
import mcpGuideContent from '../content/mcp-onboarding.md?raw';

// ─── MCP Guide Modal ────────────────────────────────────────────────────────
const MCPGuideModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={onClose}
    style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl w-full max-w-3xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>MCP Server Onboarding Guide</h2>
        </div>
        <button onClick={onClose} className="p-1 rounded transition-colors hover:opacity-80 cursor-pointer" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}>
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto px-6 py-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mt-4 mb-1.5" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
            p: ({ children }) => <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{children}</ol>,
            strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
            hr: () => <hr className="my-5" style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />,
            code: ({ children, className }) => {
              if (className?.includes('language-')) {
                return <pre className="rounded-md p-3 my-3 overflow-x-auto text-[12px]" style={{ background: 'var(--code-bg)', color: 'var(--code-text)' }}><code className={className}>{children}</code></pre>;
              }
              return <code className="rounded px-1 py-0.5 text-[12px]" style={{ background: 'var(--code-bg)', color: 'var(--code-text)' }}>{children}</code>;
            },
            pre: ({ children }) => <>{children}</>,
            table: ({ children }) => <div className="my-3 overflow-x-auto rounded-md" style={{ border: '1px solid var(--border-subtle)' }}><table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>{children}</table></div>,
            thead: ({ children }) => <thead style={{ background: 'var(--bg-inset)' }}>{children}</thead>,
            th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>{children}</th>,
            td: ({ children }) => <td className="px-3 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{children}</td>,
          }}
        >
          {mcpGuideContent}
        </ReactMarkdown>
      </div>
    </div>
  </div>
);

export const GitHubPage = () => (
  <div className="p-6">
    <SectionTitle sub="Browse, open, or clone your GitHub repositories">
      GitHub Repositories
    </SectionTitle>
    <RepoList source="github" />
  </div>
);

export const ADOPage = () => (
  <div className="p-6">
    <SectionTitle sub="Browse and manage Azure DevOps repositories">
      Azure DevOps Repositories
    </SectionTitle>
    <RepoList source="ado" />
  </div>
);

export const MCPPage = () => {
  const [showGuide, setShowGuide] = React.useState(false);
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <SectionTitle sub="Manage Model Context Protocol servers used by DevDock AI">
          MCP Server Registry
        </SectionTitle>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex-shrink-0"
          style={{ color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}
        >
          <BookOpen size={13} /> Onboarding Guide
        </button>
      </div>
      <MCPRegistry />
      {showGuide && <MCPGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export const TelemetryPageRoute = () => <TelemetryPage />;
