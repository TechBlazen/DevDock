import { useState } from 'react';
import { Plus, FileText, Trash2, Link, X, Download } from 'lucide-react';
import { useDocsStore } from '../../store';
import { Button } from '../ui';
import { formatDistanceToNow } from 'date-fns';

interface DocListProps {
  onImport?: () => void;
}

export const DocList = ({ onImport }: DocListProps) => {
  const { docs, activeDocId, setActiveDoc, addDoc, removeDoc } = useDocsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    addDoc({
      title: newTitle.trim(),
      content: `# ${newTitle.trim()}\n\nStart writing here...\n`,
      sourceUrl: newUrl.trim() || undefined,
      tags: [],
    });
    setNewTitle('');
    setNewUrl('');
    setShowAdd(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.5)' }}>
          Documents ({docs.length})
        </span>
        <div className="flex items-center gap-1">
          {onImport && (
            <button
              onClick={onImport}
              className="p-1 rounded transition-colors"
              style={{ color: 'rgba(0,0,0,0.4)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#2a6fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0,0,0,0.4)'}
              title="Import from repository"
            >
              <Download size={13} />
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgba(0,0,0,0.4)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#2a6fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0,0,0,0.4)'}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Add doc form */}
      {showAdd && (
        <div className="p-2.5 space-y-2 animate-[fadeIn_0.15s_ease]" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Document title"
            autoFocus
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
            style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.9)',
            }}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Source URL (optional)"
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
            style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.9)',
            }}
          />
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
            Create Document
          </Button>
        </div>
      )}

      {/* Doc list */}
      <div className="flex-1 overflow-y-auto py-1">
        {docs.map((doc) => {
          const isActive = doc.id === activeDocId;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDoc(doc.id)}
              className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-all mx-1 rounded-lg"
              style={{
                background: isActive ? 'rgba(42,111,255,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid #2a6fff' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <FileText size={14} className="flex-shrink-0 mt-0.5" style={{
                color: isActive ? '#2a6fff' : 'rgba(0,0,0,0.3)',
              }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate" style={{
                  color: isActive ? '#2a6fff' : 'rgba(0,0,0,0.8)',
                }}>
                  {doc.title}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px]" style={{ color: 'rgba(0,0,0,0.35)' }}>
                    {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                  </span>
                  {doc.sourceUrl && (
                    <Link size={9} style={{ color: 'rgba(0,0,0,0.25)' }} />
                  )}
                </div>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {doc.tags.map((t) => (
                      <span key={t} className="text-[9px] px-1 py-0.5 rounded" style={{
                        background: 'rgba(42,111,255,0.08)',
                        color: 'rgba(42,111,255,0.6)',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeDoc(doc.id); }}
                className="p-0.5 opacity-0 hover:opacity-100 transition-opacity text-transparent hover:text-[#ff4757]"
                style={{ color: 'rgba(0,0,0,0.2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff4757'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'rgba(0,0,0,0.2)'; }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
