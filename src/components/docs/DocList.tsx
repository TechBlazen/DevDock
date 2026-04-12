import { useState } from 'react';
import {
  Plus, FileText, Trash2, X, Download, FolderOpen, FolderPlus,
  ChevronDown, ChevronRight, Folder,
} from 'lucide-react';
import { useDocsStore } from '../../store';
import { Button } from '../ui';
import { formatDistanceToNow } from 'date-fns';

interface DocListProps {
  onImport?: () => void;
}

interface TreeNode {
  type: 'folder' | 'doc';
  name: string;
  path: string;            // full folder path for folders, doc id for docs
  children?: TreeNode[];
  docId?: string;
  updatedAt?: string;
}

export const DocList = ({ onImport }: DocListProps) => {
  const { docs, folders, activeDocId, setActiveDoc, addDoc, removeDoc, addFolder, removeFolder, moveDocToFolder } = useDocsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState<string | null>(null); // parent path or '' for root
  const [newTitle, setNewTitle] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newDocFolder, setNewDocFolder] = useState('');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  // Build folder tree
  const buildTree = (): TreeNode[] => {
    const tree: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // Create folder nodes
    for (const f of folders) {
      const fullPath = f.parentPath ? `${f.parentPath}/${f.name}` : f.name;
      const node: TreeNode = { type: 'folder', name: f.name, path: fullPath, children: [] };
      folderMap.set(fullPath, node);
    }

    // Wire parent-child relationships
    for (const f of folders) {
      const fullPath = f.parentPath ? `${f.parentPath}/${f.name}` : f.name;
      const node = folderMap.get(fullPath)!;
      if (f.parentPath && folderMap.has(f.parentPath)) {
        folderMap.get(f.parentPath)!.children!.push(node);
      } else {
        tree.push(node);
      }
    }

    // Place docs into folders or root
    for (const doc of docs) {
      const docNode: TreeNode = {
        type: 'doc',
        name: doc.title,
        path: doc.id,
        docId: doc.id,
        updatedAt: doc.updatedAt,
      };
      if (doc.folder && folderMap.has(doc.folder)) {
        folderMap.get(doc.folder)!.children!.push(docNode);
      } else {
        tree.push(docNode);
      }
    }

    // Sort: folders first alphabetically, then docs by updatedAt desc
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        if (a.type === 'folder') return a.name.localeCompare(b.name);
        return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
      });
      for (const n of nodes) if (n.children) sortNodes(n.children);
    };
    sortNodes(tree);
    return tree;
  };

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCreateDoc = () => {
    if (!newTitle.trim()) return;
    addDoc({
      title: newTitle.trim(),
      content: `# ${newTitle.trim()}\n\nStart writing here...\n`,
      folder: newDocFolder || undefined,
    });
    setNewTitle('');
    setNewDocFolder('');
    setShowAdd(false);
  };

  const handleCreateFolder = (parentPath: string) => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim(), parentPath || undefined);
    setNewFolderName('');
    setShowAddFolder(null);
  };

  const handleDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData('text/plain', docId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, folderPath: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    const docId = e.dataTransfer.getData('text/plain');
    if (docId) moveDocToFolder(docId, folderPath);
    setDragOverPath(null);
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(path);
  };

  // Get all folder paths for the "folder" dropdown
  const allFolderPaths: string[] = folders.map((f) =>
    f.parentPath ? `${f.parentPath}/${f.name}` : f.name
  );

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.type === 'folder') {
      const isCollapsed = collapsedPaths.has(node.path);
      const isDragOver = dragOverPath === node.path;
      const docCount = node.children?.filter((c) => c.type === 'doc').length ?? 0;

      return (
        <div key={`folder-${node.path}`}>
          <div
            className="flex items-center gap-1.5 py-1.5 cursor-pointer transition-all rounded-md mx-1"
            style={{
              paddingLeft: depth * 16 + 8,
              paddingRight: 4,
              background: isDragOver ? 'var(--accent-bg)' : 'transparent',
              border: isDragOver ? '1px dashed var(--accent)' : '1px solid transparent',
            }}
            onClick={() => toggleCollapse(node.path)}
            onDragOver={(e) => handleDragOver(e, node.path)}
            onDragLeave={() => setDragOverPath(null)}
            onDrop={(e) => handleDrop(e, node.path)}
            onMouseEnter={(e) => { if (!isDragOver) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!isDragOver) e.currentTarget.style.background = isDragOver ? 'var(--accent-bg)' : 'transparent'; }}
          >
            {isCollapsed
              ? <ChevronRight size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
              : <ChevronDown size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            }
            {isCollapsed
              ? <Folder size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              : <FolderOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            }
            <span className="text-[12px] font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
              {node.name}
            </span>
            {docCount > 0 && (
              <span className="text-[9px] px-1 rounded" style={{ color: 'var(--text-faint)' }}>
                {docCount}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddFolder(node.path); setNewFolderName(''); }}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'var(--text-faint)'; }}
              title="Add subfolder"
            >
              <FolderPlus size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeFolder(node.path); }}
              className="p-0.5 opacity-0 hover:!opacity-100 transition-opacity"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#C00000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'var(--text-faint)'; }}
              title="Delete folder"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Subfolder create input */}
          {showAddFolder === node.path && (
            <div className="mx-2 my-1 animate-[fadeIn_0.15s_ease]" style={{ paddingLeft: (depth + 1) * 16 + 4 }}>
              <div className="flex gap-1">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(node.path); if (e.key === 'Escape') setShowAddFolder(null); }}
                  placeholder="Folder name"
                  autoFocus
                  className="flex-1 rounded px-2 py-1 text-[11px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                />
                <button onClick={() => setShowAddFolder(null)} className="p-1" style={{ color: 'var(--text-faint)' }}>
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {!isCollapsed && node.children?.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    // Doc node
    const isActive = node.docId === activeDocId;
    return (
      <div
        key={`doc-${node.docId}`}
        draggable
        onDragStart={(e) => handleDragStart(e, node.docId!)}
        onClick={() => setActiveDoc(node.docId!)}
        className="flex items-center gap-2 py-1.5 cursor-pointer transition-all rounded-md mx-1"
        style={{
          paddingLeft: depth * 16 + 8,
          paddingRight: 4,
          background: isActive ? 'var(--accent-bg)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--accent-bg)' : 'transparent'; }}
      >
        <FileText size={14} className="flex-shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
            {node.name}
          </div>
          {node.updatedAt && (
            <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {formatDistanceToNow(new Date(node.updatedAt), { addSuffix: true })}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); removeDoc(node.docId!); }}
          className="p-0.5 opacity-0 hover:!opacity-100 transition-opacity flex-shrink-0"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#C00000'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = 'var(--text-faint)'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    );
  };

  const tree = buildTree();

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
            onClick={() => { setShowAddFolder(showAddFolder === '' ? null : ''); setNewFolderName(''); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="New folder"
          >
            <FolderPlus size={13} />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="New document"
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Root folder create */}
      {showAddFolder === '' && (
        <div className="p-2.5 animate-[fadeIn_0.15s_ease]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-1">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(''); if (e.key === 'Escape') setShowAddFolder(null); }}
              placeholder="Folder name"
              autoFocus
              className="flex-1 rounded px-2 py-1.5 text-[11px] outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            />
            <button onClick={() => setShowAddFolder(null)} className="p-1" style={{ color: 'var(--text-faint)' }}>
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Add doc form */}
      {showAdd && (
        <div className="p-2.5 space-y-2 animate-[fadeIn_0.15s_ease]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDoc(); if (e.key === 'Escape') setShowAdd(false); }}
            placeholder="Document title"
            autoFocus
            className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
          />
          {allFolderPaths.length > 0 && (
            <select
              value={newDocFolder}
              onChange={(e) => setNewDocFolder(e.target.value)}
              className="w-full rounded px-2.5 py-1.5 text-[11px] outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            >
              <option value="">Root (no folder)</option>
              {allFolderPaths.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          <Button variant="primary" size="sm" onClick={handleCreateDoc} disabled={!newTitle.trim()}>
            Create Document
          </Button>
        </div>
      )}

      {/* Tree view */}
      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={(e) => { e.preventDefault(); setDragOverPath('__root__'); }}
        onDragLeave={() => setDragOverPath(null)}
        onDrop={(e) => handleDrop(e, undefined)}
      >
        {tree.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
};
