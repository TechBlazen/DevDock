import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Split on code fences
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose-forge text-[13px] leading-relaxed space-y-3" style={{ color: 'rgba(0,0,0,0.75)' }}>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const langMatch = part.match(/^```(\w*)\n?/);
          const lang = langMatch?.[1] ?? '';
          const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '');

          // Render mermaid diagrams
          if (lang === 'mermaid') {
            return <MermaidDiagram key={i} chart={code} />;
          }

          return (
            <div key={i} className="relative group rounded-xl overflow-hidden">
              {lang && (
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider" style={{
                  background: 'rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.4)',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}>
                  {lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-[12px] font-mono leading-relaxed" style={{
                background: 'rgba(0,0,0,0.04)',
                color: 'rgba(0,0,0,0.7)',
              }}>
                {code}
              </pre>
              <button
                onClick={() => handleCopy(code, i)}
                className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  color: 'rgba(0,0,0,0.5)',
                }}
              >
                {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          );
        }

        // Parse markdown blocks
        const html = part
          // Headers
          .replace(/^#### (.+)$/gm, '<h4 class="text-[13px] font-bold mt-4 mb-1" style="color:rgba(0,0,0,0.85)">$1</h4>')
          .replace(/^### (.+)$/gm, '<h3 class="text-[14px] font-bold mt-4 mb-1" style="color:rgba(0,0,0,0.85)">$1</h3>')
          .replace(/^## (.+)$/gm, '<h2 class="text-[16px] font-bold mt-5 mb-2" style="color:rgba(0,0,0,0.9)">$1</h2>')
          .replace(/^# (.+)$/gm, '<h1 class="text-[20px] font-bold mt-2 mb-3" style="color:rgba(0,0,0,0.95)">$1</h1>')
          // Blockquotes
          .replace(/^> (.+)$/gm, '<div class="pl-3 py-1" style="border-left:3px solid rgba(42,111,255,0.3);color:rgba(0,0,0,0.6)">$1</div>')
          // Tables (basic)
          .replace(/^\|(.+)\|$/gm, (match) => {
            const cells = match.split('|').filter(Boolean).map((c) => c.trim());
            if (cells.every((c) => /^[-:]+$/.test(c))) return ''; // separator row
            const cellHtml = cells.map((c) => `<td class="px-3 py-1.5 text-[12px]" style="border:1px solid rgba(0,0,0,0.08)">${c}</td>`).join('');
            return `<tr>${cellHtml}</tr>`;
          })
          // Bold, italic, inline code
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:rgba(0,0,0,0.9);font-weight:700">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded text-[11px] font-mono" style="background:rgba(0,0,0,0.05);color:rgba(42,111,255,0.8)">$1</code>')
          // Lists
          .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 ml-2"><span class="text-[rgba(42,111,255,0.6)] font-mono text-[12px] flex-shrink-0">$1.</span><span>$2</span></div>')
          .replace(/^- (.+)$/gm, '<div class="flex gap-2 ml-2"><span style="color:rgba(42,111,255,0.6)" class="flex-shrink-0">›</span><span>$2</span></div>')
          .replace(/^- (.+)$/gm, '<div class="flex gap-2 ml-2"><span style="color:rgba(42,111,255,0.6)" class="flex-shrink-0">›</span><span>$1</span></div>')
          // Horizontal rule
          .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(0,0,0,0.08);margin:12px 0" />')
          // Paragraphs
          .replace(/\n\n/g, '<br/><br/>')
          .replace(/\n/g, '<br/>');

        // Wrap tables
        const tableWrapped = html.includes('<tr>')
          ? html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table class="w-full rounded-lg overflow-hidden my-2" style="border-collapse:collapse">$1</table>')
          : html;

        return <div key={i} dangerouslySetInnerHTML={{ __html: tableWrapped }} />;
      })}
    </div>
  );
};
