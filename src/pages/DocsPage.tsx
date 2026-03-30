import { useState } from 'react';
import { Eye, Pencil, Download, Upload } from 'lucide-react';
import { useDocsStore } from '../store';
import { DocList, DocEditor, MarkdownViewer } from '../components/docs';
import { ImportModal, ExportModal } from '../components/docs/DocImportExport';
import { EmptyState, Button } from '../components/ui';

export const DocsPage = () => {
  const { docs, activeDocId } = useDocsStore();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const activeDoc = docs.find((d) => d.id === activeDocId);

  return (
    <div className="flex h-full">
      {/* Sidebar doc list */}
      <div className="w-[240px] flex-shrink-0 h-full" style={{
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <DocList onImport={() => setShowImport(true)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeDoc ? (
          <>
            {/* Doc header */}
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {activeDoc.title}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {activeDoc.sourceUrl && (
                    <a
                      href={activeDoc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate max-w-[300px]"
                      style={{ color: 'rgba(42,111,255,0.7)' }}
                    >
                      {activeDoc.sourceUrl}
                    </a>
                  )}
                  {activeDoc.tags?.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded" style={{
                      background: 'var(--code-bg)',
                      color: 'var(--accent-text)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Export button */}
                <button
                  onClick={() => setShowExport(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#00e5a0'; e.currentTarget.style.borderColor = 'rgba(0,229,160,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <Upload size={11} /> Export
                </button>

                {/* View/Edit toggle */}
                <div className="flex gap-1 rounded-lg p-0.5" style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <button
                    onClick={() => setMode('view')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                    style={mode === 'view' ? {
                      background: 'var(--bg-surface)',
                      color: '#2a6fff',
                      boxShadow: 'var(--shadow-sm)',
                    } : {
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                    style={mode === 'edit' ? {
                      background: 'var(--bg-surface)',
                      color: '#2a6fff',
                      boxShadow: 'var(--shadow-sm)',
                    } : {
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {mode === 'view' ? (
                <div className="h-full overflow-y-auto px-6 py-5">
                  <MarkdownViewer content={activeDoc.content} />
                </div>
              ) : (
                <DocEditor docId={activeDoc.id} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <EmptyState
                title="No document selected"
                body="Select a document from the sidebar, import from a repo, or create a new one."
              />
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    const id = useDocsStore.getState().addDoc({
                      title: 'Untitled Document',
                      content: '# Untitled Document\n\nStart writing here...\n',
                    });
                    useDocsStore.getState().setActiveDoc(id);
                    setMode('edit');
                  }}
                >
                  Create New
                </Button>
                <Button variant="outline" size="md" onClick={() => setShowImport(true)}>
                  <Download size={13} /> Import from Repo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showExport && activeDoc && <ExportModal doc={activeDoc} onClose={() => setShowExport(false)} />}
    </div>
  );
};
