import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
  const [copiedBlocks, setCopiedBlocks] = useState<Set<string>>(new Set());

  const handleCopy = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBlocks(new Set([...copiedBlocks, blockId]));
    setTimeout(() => {
      setCopiedBlocks((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    }, 2000);
  };

  // Custom components for react-markdown with Backstage-inspired styling
  const components: Components = {
    // Headings with proper hierarchy
    h1: ({ children, ...props }) => (
      <h1
        className="text-[24px] font-bold mt-6 mb-4 pb-2"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '2px solid var(--border-subtle)',
        }}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-[20px] font-bold mt-5 mb-3"
        style={{ color: 'var(--text-primary)' }}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className="text-[16px] font-bold mt-4 mb-2"
        style={{ color: 'var(--text-primary)' }}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        className="text-[14px] font-bold mt-3 mb-1"
        style={{ color: 'var(--text-primary)' }}
        {...props}
      >
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5
        className="text-[13px] font-bold mt-3 mb-1"
        style={{ color: 'var(--text-primary)' }}
        {...props}
      >
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6
        className="text-[12px] font-bold mt-2 mb-1"
        style={{ color: 'var(--text-secondary)' }}
        {...props}
      >
        {children}
      </h6>
    ),
    // Paragraphs
    p: ({ children, ...props }) => (
      <p
        className="text-[13px] leading-relaxed my-3"
        style={{ color: 'var(--text-secondary)' }}
        {...props}
      >
        {children}
      </p>
    ),
    // Links with hover effects
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline transition-colors"
        style={{ color: 'var(--accent)' }}
        {...props}
      >
        {children}
      </a>
    ),
    // Code blocks with copy button
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      const blockId = `code-${codeString.slice(0, 20)}`;
      const isInline = !className && typeof children === 'string' && !children.includes('\n');

      // Handle mermaid diagrams
      if (!isInline && lang === 'mermaid') {
        return <MermaidDiagram chart={codeString} />;
      }

      // Inline code
      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded text-[11px] font-mono"
            style={{
              background: 'var(--code-bg)',
              color: 'var(--code-text)',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      // Block code with copy button
      return (
        <div className="relative group my-4 rounded-xl overflow-hidden">
          {lang && (
            <div
              className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider font-semibold"
              style={{
                background: 'var(--bg-inset)',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {lang}
            </div>
          )}
          <div className="relative">
            <pre
              className="p-4 overflow-x-auto text-[12px] font-mono leading-relaxed"
              style={{
                background: 'var(--bg-inset)',
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
            <button
              onClick={() => handleCopy(codeString, blockId)}
              className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="Copy code"
            >
              {copiedBlocks.has(blockId) ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      );
    },
    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="pl-4 py-2 my-3 rounded-r-lg"
        style={{
          borderLeft: '4px solid var(--accent)',
          background: 'var(--accent-bg)',
          color: 'var(--text-secondary)',
        }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    // Lists
    ul: ({ children, ...props }) => (
      <ul
        className="my-3 space-y-1 pl-6"
        style={{ listStyleType: 'none' }}
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        className="my-3 space-y-1 pl-6"
        style={{ listStyleType: 'none', counterReset: 'item' }}
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, node, ...props }) => {
      const isOrdered = node?.position ? false : (props as Record<string, unknown>).ordered !== undefined;
      const parentTag = (node as unknown as { parentNode?: { tagName?: string } })?.parentNode?.tagName;
      const ordered = parentTag === 'ol' || isOrdered;
      return (
      <li
        className="text-[13px] leading-relaxed flex gap-2"
        style={{
          color: 'var(--text-secondary)',
          counterIncrement: ordered ? 'item' : undefined,
        }}
        {...props}
      >
        <span
          className="flex-shrink-0 font-mono text-[12px]"
          style={{ color: 'var(--accent-text)' }}
        >
          {ordered ? (
            <span style={{ display: 'inline-block', minWidth: '20px' }}>
              {/* Counter handled by CSS */}
            </span>
          ) : (
            '›'
          )}
        </span>
        <span className="flex-1">{children}</span>
      </li>
      );
    },
    // Tables
    table: ({ children, ...props }) => (
      <div className="my-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
        <table
          className="w-full text-[12px]"
          style={{ borderCollapse: 'collapse' }}
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead
        style={{
          background: 'var(--bg-inset)',
          fontWeight: 600,
        }}
        {...props}
      >
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th
        className="px-4 py-2 text-left"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '2px solid var(--border-subtle)',
        }}
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        className="px-4 py-2"
        style={{
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
        {...props}
      >
        {children}
      </td>
    ),
    // Horizontal rule
    hr: (props) => (
      <hr
        className="my-6"
        style={{
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
        }}
        {...props}
      />
    ),
    // Strong and emphasis
    strong: ({ children, ...props }) => (
      <strong
        style={{ color: 'var(--text-primary)', fontWeight: 700 }}
        {...props}
      >
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em style={{ fontStyle: 'italic' }} {...props}>
        {children}
      </em>
    ),
  };

  return (
    <div className="techdocs-content max-w-4xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
