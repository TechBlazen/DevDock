import { useState, useCallback, useEffect, useRef, createElement } from 'react';
import {
  HardDrive, FolderOpen, FileText, Image, Film, FileSpreadsheet,
  Upload, Search, FolderPlus, Trash2, ExternalLink, ChevronRight,
  RefreshCw, AlertTriangle, File, Presentation, Music,
} from 'lucide-react';
import { useSettingsStore } from '../store';
import { SectionTitle, Button, Card, CardHeader, Spinner, EmptyState, Input } from '../components/ui';
import {
  listFiles, searchFiles, buildBreadcrumbs, uploadFile,
  createFolder, deleteFile, formatFileSize, isFolder,
} from '../lib/google-drive';
import type { DriveFile, DriveBreadcrumb } from '../types';

// ─── MIME type → icon mapping ────────────────────────────────────────────────
const getMimeIcon = (mimeType: string) => {
  if (mimeType === 'application/vnd.google-apps.folder') return FolderOpen;
  if (mimeType.startsWith('image/') || mimeType === 'application/vnd.google-apps.photo') return Image;
  if (mimeType.startsWith('video/') || mimeType === 'application/vnd.google-apps.video') return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType === 'text/plain' || mimeType.includes('pdf')) return FileText;
  return File;
};

const mimeColor = (mimeType: string) => {
  if (mimeType === 'application/vnd.google-apps.folder') return '#f5a623';
  if (mimeType.startsWith('image/')) return '#e91e63';
  if (mimeType.startsWith('video/')) return '#9c27b0';
  if (mimeType.includes('spreadsheet')) return '#2e7d32';
  if (mimeType.includes('presentation')) return '#ff6f00';
  if (mimeType.includes('document') || mimeType.includes('word')) return '#1976d2';
  if (mimeType.includes('pdf')) return '#d32f2f';
  return 'var(--text-muted)';
};

// ─── Connect prompt ──────────────────────────────────────────────────────────
const DriveConnectPrompt = () => {
  const { settings, updateGoogleDriveConfig } = useSettingsStore();
  const [token, setToken] = useState(settings.googleDrive.accessToken);

  const handleConnect = () => {
    if (token.trim()) {
      updateGoogleDriveConfig({ accessToken: token.trim(), connected: true });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 max-w-md mx-auto text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
        <HardDrive size={40} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Connect Google Drive</h2>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Connect your Google account to browse, search, and upload files to your Drive directly from the portal.
        </p>
      </div>

      <div className="w-full space-y-3">
        <Input
          label="Google Drive Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your Google OAuth access token..."
        />
        <div className="rounded-xl p-4 space-y-3 text-left" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            How to get an access token:
          </p>
          <ol className="text-[11px] space-y-2 list-decimal list-inside" style={{ color: 'var(--text-muted)' }}>
            <li>
              Open the{' '}
              <a
                href="https://developers.google.com/oauthplayground/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: 'var(--accent)' }}
              >
                Google OAuth 2.0 Playground
              </a>
            </li>
            <li>
              In <strong style={{ color: 'var(--text-secondary)' }}>Step 1</strong>, find and expand{' '}
              <strong style={{ color: 'var(--text-secondary)' }}>Drive API v3</strong> in the list on the left, then check the box for{' '}
              <code style={{ color: 'var(--accent)', fontSize: 10, background: 'var(--accent-bg)', padding: '1px 4px', borderRadius: 3 }}>
                https://www.googleapis.com/auth/drive
              </code>
              {' '}(do not type the scope manually — select it from the list)
            </li>
            <li>
              Click <strong style={{ color: 'var(--text-secondary)' }}>Authorize APIs</strong> and sign in with your Google account
            </li>
            <li>
              In <strong style={{ color: 'var(--text-secondary)' }}>Step 2</strong>, click{' '}
              <strong style={{ color: 'var(--text-secondary)' }}>Exchange authorization code for tokens</strong>
            </li>
            <li>
              Copy the <strong style={{ color: 'var(--text-secondary)' }}>Access token</strong> value and paste it above
            </li>
          </ol>
          <div className="flex items-start gap-2 pt-1">
            <AlertTriangle size={11} className="text-[#f5a623] mt-0.5 flex-shrink-0" />
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              Tokens expire after 1 hour. Token is stored in your browser only and never sent to any third-party server.
            </p>
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={handleConnect} disabled={!token.trim()}>
          <HardDrive size={14} /> Connect Google Drive
        </Button>
      </div>
    </div>
  );
};

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────
const DriveBreadcrumbsBar = ({
  breadcrumbs,
  onNavigate,
}: {
  breadcrumbs: DriveBreadcrumb[];
  onNavigate: (id: string) => void;
}) => (
  <div className="flex items-center gap-1 text-[13px] flex-wrap">
    {breadcrumbs.map((crumb, i) => (
      <span key={crumb.id} className="flex items-center gap-1">
        {i > 0 && <ChevronRight size={12} style={{ color: 'var(--text-faint)' }} />}
        <button
          onClick={() => onNavigate(crumb.id)}
          className="px-1.5 py-0.5 rounded transition-colors"
          style={{
            color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {crumb.name}
        </button>
      </span>
    ))}
  </div>
);

// ─── Drop zone ───────────────────────────────────────────────────────────────
const DriveDropZone = ({
  children,
  onDrop,
}: {
  children: React.ReactNode;
  onDrop: (files: FileList) => void;
}) => {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length > 0) onDrop(e.dataTransfer.files);
  };

  return (
    <div
      className="relative flex-1"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-xl"
          style={{
            background: 'rgba(var(--accent-rgb, 0, 93, 170), 0.08)',
            border: '3px dashed var(--accent)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Upload size={40} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Drop files to upload
          </span>
        </div>
      )}
    </div>
  );
};

// ─── File row ────────────────────────────────────────────────────────────────
const DriveFileRow = ({
  file,
  onNavigate,
  onDelete,
}: {
  file: DriveFile;
  onNavigate: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const folder = isFolder(file);
  const mimeIconNode = createElement(getMimeIcon(file.mimeType), {
    size: 20,
    style: { color: mimeColor(file.mimeType), flexShrink: 0 },
  });

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group"
      style={{ cursor: folder ? 'pointer' : 'default' }}
      onClick={() => folder && onNavigate(file.id)}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {mimeIconNode}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {file.name}
        </div>
        {file.modifiedTime && (
          <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            {new Date(file.modifiedTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
      {!folder && (
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>
          {formatFileSize(file.size)}
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
            title="Open in Google Drive"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = '#d32f2f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── File browser ────────────────────────────────────────────────────────────
const DriveBrowser = () => {
  const { settings, updateGoogleDriveConfig } = useSettingsStore();
  const token = settings.googleDrive.accessToken;

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([{ id: 'root', name: 'My Drive' }]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listFiles(token, folderId);
      setFiles(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load files';
      if (msg.includes('401') || msg.includes('403')) {
        setError('Token expired or invalid. Please reconnect.');
        updateGoogleDriveConfig({ connected: false, accessToken: '' });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [token, updateGoogleDriveConfig]);

  useEffect(() => {
    loadFiles(currentFolder);
  }, [currentFolder, loadFiles]);

  const navigateToFolder = async (folderId: string) => {
    setCurrentFolder(folderId);
    setSearchQuery('');
    try {
      const crumbs = await buildBreadcrumbs(token, folderId);
      setBreadcrumbs(crumbs);
    } catch {
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadFiles(currentFolder);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await searchFiles(token, searchQuery);
      setFiles(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const total = fileList.length;
      for (let i = 0; i < total; i++) {
        await uploadFile(token, fileList[i], currentFolder, (pct) => {
          setUploadProgress(Math.round(((i + pct / 100) / total) * 100));
        });
      }
      loadFiles(currentFolder);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(token, newFolderName.trim(), currentFolder);
      setNewFolderName('');
      setShowNewFolder(false);
      loadFiles(currentFolder);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(token, fileId);
      setFiles((f) => f.filter((file) => file.id !== fileId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleDisconnect = () => {
    updateGoogleDriveConfig({ accessToken: '', connected: false });
  };

  return (
    <DriveDropZone onDrop={handleUploadFiles}>
      <Card>
        <CardHeader>
          <HardDrive size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Google Drive</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </CardHeader>

        {/* Toolbar */}
        <div className="p-4 flex flex-col gap-3">
          <DriveBreadcrumbsBar breadcrumbs={breadcrumbs} onNavigate={navigateToFolder} />

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search files..."
                  className="w-full rounded-full px-4 py-2 text-[13px] outline-none pr-9"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full"
                  style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <Search size={14} />
                </button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => loadFiles(currentFolder)}>
              <RefreshCw size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(!showNewFolder)}>
              <FolderPlus size={13} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} /> Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
            />
          </div>

          {showNewFolder && (
            <div className="flex items-center gap-2 animate-[fadeIn_0.15s_ease]">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="New folder name..."
                className="flex-1 rounded-full px-4 py-2 text-[13px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              />
              <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <Spinner size={14} />
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Uploading... {uploadProgress}%</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-input)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg p-3" style={{ background: '#d32f2f12', border: '1px solid #d32f2f30' }}>
            <AlertTriangle size={14} style={{ color: '#d32f2f', flexShrink: 0 }} />
            <span className="text-[12px]" style={{ color: '#d32f2f' }}>{error}</span>
          </div>
        )}

        {/* File list */}
        <div className="px-2 pb-4" style={{ minHeight: 200 }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={24} />
            </div>
          ) : files.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={40} />}
              title={searchQuery ? 'No files match your search' : 'This folder is empty'}
              body="Drag and drop files here or use the Upload button"
            />
          ) : (
            <div className="flex flex-col">
              {files.map((file) => (
                <DriveFileRow
                  key={file.id}
                  file={file}
                  onNavigate={navigateToFolder}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Drop hint footer */}
      <div className="mt-3 text-center">
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          Drag and drop files anywhere on this page to upload to the current folder
        </span>
      </div>
    </DriveDropZone>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Google Drive Page
// ═══════════════════════════════════════════════════════════════════════════════
export const GoogleDrivePage = () => {
  const settings = useSettingsStore((s) => s.settings);
  const connected = settings.googleDrive.connected && settings.googleDrive.accessToken;

  return (
    <div className="p-6 max-w-4xl">
      <SectionTitle sub="Browse, search, and upload files to your Google Drive">
        Google Drive
      </SectionTitle>

      {connected ? <DriveBrowser /> : <DriveConnectPrompt />}
    </div>
  );
};
