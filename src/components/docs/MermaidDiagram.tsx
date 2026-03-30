import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { nanoid } from 'nanoid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  fontFamily: "'Source Code Pro', monospace",
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#e8f0fe',
    primaryBorderColor: '#2a6fff',
    primaryTextColor: '#1a1a2e',
    lineColor: '#2a6fff',
    secondaryColor: '#f0faf5',
    tertiaryColor: '#fff8f0',
    noteBkgColor: '#fef9e7',
    noteTextColor: '#1a1a2e',
  },
});

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const idRef = useRef(`mermaid-${nanoid(8)}`);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      setError('');

      try {
        const { svg } = await mermaid.render(idRef.current, chart.trim());
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        setError(String(e));
        // mermaid leaves error elements in the DOM — clean up
        const errEl = document.getElementById('d' + idRef.current);
        if (errEl) errEl.remove();
      }
    };

    render();
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="rounded-xl p-3 text-[11px] font-mono" style={{
        background: 'rgba(255,71,87,0.06)',
        border: '1px solid rgba(255,71,87,0.15)',
        color: '#ff4757',
      }}>
        <div className="font-bold mb-1">Mermaid render error</div>
        <pre className="whitespace-pre-wrap text-[10px]">{error}</pre>
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Source</summary>
          <pre className="mt-1 p-2 rounded" style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.6)' }}>{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden group" style={{
      border: '1px solid rgba(0,0,0,0.08)',
      background: 'rgba(255,255,255,0.8)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1" style={{
        background: 'rgba(0,0,0,0.03)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.4)' }}>
          mermaid
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>
            <ZoomOut size={12} />
          </button>
          <span className="text-[9px] font-mono" style={{ color: 'rgba(0,0,0,0.3)' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.25))} className="p-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>
            <ZoomIn size={12} />
          </button>
          <button onClick={handleCopy} className="p-0.5 ml-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div className="p-4 overflow-auto flex justify-center" style={{ minHeight: 80 }}>
        <div
          ref={containerRef}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
        />
      </div>
    </div>
  );
};
