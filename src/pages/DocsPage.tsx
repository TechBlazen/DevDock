import { useState, useCallback } from 'react';
import { Eye, Pencil, Download, Upload, ArrowLeft, FileUp } from 'lucide-react';
import { useDocsStore } from '../store';
import { DocList, DocEditor, MarkdownViewer } from '../components/docs';
import { ImportModal, ExportModal } from '../components/docs/DocImportExport';
import { EmptyState, Button } from '../components/ui';
import { fileToMarkdown, ACCEPTED_EXTENSIONS } from '../lib/doc-convert';

export const DocsPage = () => {
  const { docs, activeDocId, addDoc, setActiveDoc } = useDocsStore();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const activeDoc = docs.find((d) => d.id === activeDocId);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    let imported = 0;
    let lastId = '';
    for (const file of fileArr) {
      try {
        setUploadStatus(`Converting ${file.name}...`);
        const { title, content } = await fileToMarkdown(file);
        lastId = addDoc({ title, content, tags: ['uploaded'] });
        imported++;
      } catch (err) {
        console.error(`Failed to convert ${file.name}:`, err);
      }
    }
    if (imported > 0) {
      setActiveDoc(lastId);
      setMode('view');
      setUploadStatus(`Imported ${imported} file${imported > 1 ? 's' : ''}`);
    } else {
      setUploadStatus('No files could be imported');
    }
    setTimeout(() => setUploadStatus(null), 3000);
  }, [addDoc, setActiveDoc]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  return (
    <div
      className="flex h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen drag overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'var(--overlay)' }}
        >
          <div
            className="flex flex-col items-center gap-4 p-10 rounded-xl"
            style={{
              background: 'var(--bg-surface)',
              border: '3px dashed var(--accent)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <FileUp size={48} style={{ color: 'var(--accent)' }} />
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Drop files to import
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Supports {ACCEPTED_EXTENSIONS.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Upload status toast */}
      {uploadStatus && (
        <div
          className="absolute top-4 right-4 z-40 px-4 py-2 rounded-lg text-[13px] font-medium animate-[fadeIn_0.2s_ease]"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {uploadStatus}
        </div>
      )}

      {/* Sidebar doc list */}
      <div className="w-[260px] flex-shrink-0 h-full" style={{
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        paddingLeft: 12,
        paddingTop: 12,
      }}>
        <DocList onImport={() => setShowImport(true)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeDoc ? (
          <>
            {/* Doc header */}
            <div className="flex items-center justify-between py-3 flex-shrink-0" style={{
              borderBottom: '1px solid var(--border-subtle)',
              paddingLeft: 24,
              paddingRight: 24,
            }}>
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button */}
                <button
                  onClick={() => setActiveDoc(null)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium transition-all flex-shrink-0"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <ArrowLeft size={13} /> Docs
                </button>

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
                        style={{ color: 'var(--accent)' }}
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
              </div>

              <div className="flex items-center gap-2">
                {/* Export button */}
                <button
                  onClick={() => setShowExport(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
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
                      color: 'var(--accent)',
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
                      color: 'var(--accent)',
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
                <div className="h-full overflow-y-auto py-5" style={{ paddingLeft: 40, paddingRight: 24 }}>
                  <MarkdownViewer content={activeDoc.content} />
                </div>
              ) : (
                <DocEditor docId={activeDoc.id} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <EmptyState
                title="No document selected"
                body="Select a document from the sidebar, drag files here, or create a new one."
              />
              <div className="flex gap-2 justify-center mt-4 flex-wrap">
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
                <label className="cursor-pointer">
                  <span
                    className="inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-[0.97]"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      borderRadius: 'var(--btn-radius, 9999px)',
                      padding: '4px 10px',
                      fontSize: 13,
                    }}
                  >
                    <FileUp size={13} /> Upload Files
                  </span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_EXTENSIONS.join(',')}
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="mt-6 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                Drag & drop .md, .txt, .docx, or .pdf files anywhere on this page
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
