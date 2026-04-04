import { ExternalLink } from 'lucide-react';
import { MarkdownViewer } from '../docs/MarkdownViewer';
import type { WidgetSubmission } from '../../types';

export const UserWidgetContent = ({ submission }: { submission: WidgetSubmission }) => {
  const { content } = submission;

  if (content.type === 'markdown') {
    return (
      <div className="p-3 overflow-auto" style={{ maxHeight: 340 }}>
        <MarkdownViewer content={content.markdown ?? ''} />
      </div>
    );
  }

  if (content.type === 'iframe') {
    return (
      <iframe
        src={content.url}
        title={submission.title}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        style={{ height: content.iframeHeight ?? 300, minHeight: 200 }}
      />
    );
  }

  if (content.type === 'link') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          {submission.description}
        </p>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={14} />
          Open Link
        </a>
      </div>
    );
  }

  return null;
};
