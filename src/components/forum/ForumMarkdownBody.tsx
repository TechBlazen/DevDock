import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Allow common HTML tags but sanitize dangerous ones
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'details', 'summary', 'kbd', 'mark', 'abbr', 'sub', 'sup',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'br', 'hr', 'div', 'span', 'p',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'style'],
    code: [...(defaultSchema.attributes?.['code'] ?? []), 'className'],
  },
};

interface ForumMarkdownBodyProps {
  content: string;
}

export const ForumMarkdownBody = ({ content }: ForumMarkdownBodyProps) => (
  <div
    className="text-[13px] leading-relaxed forum-markdown"
    style={{ color: 'var(--text-secondary)' }}
  >
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      components={{
        code: ({ children, className, ...props }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre
                className="rounded-md p-3 my-2 overflow-x-auto text-[12px]"
                style={{
                  background: 'var(--code-bg)',
                  color: 'var(--code-text)',
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          }
          return (
            <code
              className="rounded px-1 py-0.5 text-[12px]"
              style={{
                background: 'var(--code-bg)',
                color: 'var(--code-text)',
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ children, href, ...props }) => (
          <a
            href={href}
            style={{ color: 'var(--accent)' }}
            className="underline hover:opacity-80"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-3 mb-1.5" style={{ color: 'var(--text-primary)' }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>{children}</h3>
        ),
        ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
        blockquote: ({ children }) => (
          <blockquote
            className="pl-3 my-2 italic"
            style={{
              borderLeft: '3px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}
          >
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
