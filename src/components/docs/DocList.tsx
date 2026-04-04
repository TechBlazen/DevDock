import { useState } from 'react';
import { Plus, FileText, Trash2, Link, X, Download, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Group docs: auto-imported docs grouped by repo name, others under "Local"
  const grouped = new Map<string, typeof docs>();
  for (const doc of docs) {
    const repoTag = doc.tags?.find((t) => t !== 'github' && t !== 'ado' && t !== 'auto-imported');
    const isAutoImported = doc.tags?.includes('auto-imported');
    const groupKey = isAutoImported && repoTag ? repoTag : '__local__';

    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)!.push(doc);
  }

  // Sort: local docs first, then repo groups alphabetically
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    if (a[0] === '__local__') return -1;
    if (b[0] === '__local__') return 1;
    return a[0].localeCompare(b[0]);
  });

  const renderDoc = (doc: typeof docs[0]) => {
    const isActive = doc.id === activeDocId;
    return (
      <div
        key={doc.id}
        onClick={() => setActiveDoc(doc.id)}
        className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-all mx-1 rounded-lg"
        style={{
          background: isActive ? 'var(--accent-bg)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <FileText size={14} className="flex-shrink-0 mt-0.5" style={{
          color: isActive ? 'var(--accent)' : 'var(--text-faint)',
        }} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold truncate" style={{
            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          }}>
            {doc.title}
          </div>
          {(() => {
            const desc = doc.content
              .split('\n')
              .map((l) => l.trim())
              .find((l) => l && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('---') && !l.startsWith('<'));
            return desc ? (
              <div className="text-[10px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {desc.length > 80 ? desc.slice(0, 80) + '...' : desc}
              </div>
            ) : null;
          })()}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
            </span>
            {doc.sourceUrl && (
              <Link size={9} style={{ color: 'var(--text-faint)' }} />
            )}
          </div>
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {doc.tags.map((t) => (
                <span key={t} className="text-[9px] px-1 py-0.5 rounded" style={{
                  background: 'var(--code-bg)',
                  color: 'var(--accent-text)',
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); removeDoc(doc.id); }}
          className="p-0.5 opacity-0 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff4757'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'var(--text-faint)'; }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3" style={{ borderBottom: '1px solid var(--border-subtle)', paddingTop: 4, paddingBottom: 14 }}>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Documents ({docs.length})
        </span>
        <div className="flex items-center gap-1">
          {onImport && (
            <button
              onClick={onImport}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Import from repository"
            >
              <Download size={13} />
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Add doc form */}
      {showAdd && (
        <div className="p-2.5 space-y-2 animate-[fadeIn_0.15s_ease]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Document title"
            autoFocus
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Source URL (optional)"
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-primary)',
            }}
          />
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
            Create Document
          </Button>
        </div>
      )}

      {/* Doc list grouped by repo */}
      <div className="flex-1 overflow-y-auto py-1">
        {sortedGroups.map(([group, groupDocs]) => {
          if (group === '__local__') {
            // Render local docs without a group header
            return groupDocs.map(renderDoc);
          }

          const isCollapsed = collapsedGroups.has(group);
          const source = groupDocs[0]?.tags?.includes('github') ? 'github' : groupDocs[0]?.tags?.includes('ado') ? 'ado' : '';

          return (
            <div key={group} className="mt-1">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {isCollapsed ? <ChevronRight size={11} style={{ color: 'var(--text-faint)' }} /> : <ChevronDown size={11} style={{ color: 'var(--text-faint)' }} />}
                <FolderOpen size={12} style={{ color: source === 'github' ? '#8090b0' : '#0078d4' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider flex-1" style={{ color: 'var(--text-muted)' }}>
                  {group}
                </span>
                <span className="text-[9px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                  {groupDocs.length}
                </span>
              </button>
              {!isCollapsed && (
                <div className="animate-[fadeIn_0.1s_ease]">
                  {groupDocs.map(renderDoc)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
