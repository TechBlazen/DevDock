import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Allow common HTML tags and preserve className for code highlighting
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'details', 'summary', 'kbd', 'mark', 'abbr', 'sub', 'sup',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'br', 'hr', 'div', 'span', 'p', 'pre', 'code',
    'input', // for GFM task lists
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'style'],
    code: ['className'],
    pre: ['className'],
    input: ['type', 'checked', 'disabled'],
    td: [...(defaultSchema.attributes?.['td'] ?? []), 'align'],
    th: [...(defaultSchema.attributes?.['th'] ?? []), 'align'],
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
      remarkPlugins={[remarkGfm]}
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
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-md" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: 'var(--bg-inset)' }}>{children}</thead>
        ),
        th: ({ children, style: s }) => (
          <th className="px-3 py-1.5 text-left font-semibold" style={{ ...s, borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>{children}</th>
        ),
        td: ({ children, style: s }) => (
          <td className="px-3 py-1.5" style={{ ...s, borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{children}</td>
        ),
        hr: () => <hr className="my-3" style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />,
        img: ({ src, alt }) => (
          <img src={src} alt={alt} className="rounded-md my-2 max-w-full" style={{ maxHeight: 400 }} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
