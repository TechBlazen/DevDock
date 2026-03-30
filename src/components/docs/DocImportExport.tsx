import { useState } from 'react';
import {
  Download, Upload, X, Loader2, AlertCircle, CheckCircle, FileText,
  GitFork, GitBranch,
} from 'lucide-react';
import { useDocsStore, useSettingsStore } from '../../store';
import {
  parseRepoUrl,
  listGitHubMarkdownFiles,
  fetchGitHubFile,
  pushGitHubFile,
  listADOMarkdownFiles,
  fetchADOFile,
  pushADOFile,
} from '../../lib/repos';
import { Button, Pill } from '../ui';
import type { DocEntry } from '../../types';

// ─── Import Modal ────────────────────────────────────────────────────────────
export const ImportModal = ({ onClose }: { onClose: () => void }) => {
  const { addDoc } = useDocsStore();
  const settings = useSettingsStore((s) => s.settings);

  const [repoUrl, setRepoUrl] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<{ path: string; name: string; id: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState(0);

  const handleDiscover = async () => {
    setError('');
    setFiles([]);
    setSelected(new Set());
    setImported(0);

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      setError('Invalid repository URL. Use https://github.com/owner/repo or https://dev.azure.com/org/project/_git/repo');
      return;
    }

    setLoading(true);
    try {
      if (parsed.source === 'github') {
        const mdFiles = await listGitHubMarkdownFiles(
          parsed.owner, parsed.repo, dirPath || '.', settings.github.accessToken || undefined
        );
        setFiles(mdFiles.map((f) => ({ path: f.path, name: f.name, id: f.sha })));
      } else {
        const mdFiles = await listADOMarkdownFiles(
          parsed.org, parsed.project, parsed.repo, dirPath || '/', settings.ado.personalAccessToken || undefined
        );
        setFiles(mdFiles.map((f) => ({ path: f.path, name: f.name, id: f.objectId })));
      }
    } catch (e) {
      const msg = String(e);
      if (msg.includes('404')) setError('Path not found in repository.');
      else if (msg.includes('401') || msg.includes('403')) setError('Authentication failed. Check your token in Settings.');
      else setError(`Failed to list files: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.path)));
  };

  const handleImport = async () => {
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed || selected.size === 0) return;

    setLoading(true);
    setError('');
    let count = 0;

    for (const path of selected) {
      try {
        let content: string;
        if (parsed.source === 'github') {
          const file = await fetchGitHubFile(parsed.owner, parsed.repo, path, settings.github.accessToken || undefined);
          content = file.content;
        } else {
          content = await fetchADOFile(parsed.org, parsed.project, parsed.repo, path, settings.ado.personalAccessToken || undefined);
        }

        const name = path.split('/').pop()?.replace(/\.md$/, '') ?? path;
        addDoc({
          title: name,
          content,
          sourceUrl: `${repoUrl.replace(/\/$/, '')}/${path}`,
          tags: [parsed.source, 'imported'],
        });
        count++;
      } catch (e) {
        setError(`Failed to import ${path}: ${String(e)}`);
      }
    }

    setImported(count);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(0,0,0,0.1)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download size={16} style={{ color: '#2a6fff' }} />
            <h3 className="text-sm font-bold" style={{ color: 'rgba(0,0,0,0.9)' }}>Import Markdown from Repository</h3>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'rgba(0,0,0,0.3)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Repo URL */}
        <div className="space-y-2 mb-4">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full rounded-xl px-3 py-2 text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.9)' }}
          />
          <div className="flex gap-2">
            <input
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="Directory path (e.g., docs/ or leave empty for root)"
              className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.9)' }}
            />
            <Button variant="outline" size="sm" onClick={handleDiscover} disabled={!repoUrl.trim() || loading}>
              {loading && files.length === 0 ? <Loader2 size={12} className="animate-spin" /> : 'Discover'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg mb-3 text-[11px]" style={{
            background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.15)', color: '#ff4757',
          }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {imported > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3 text-[11px]" style={{
            background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', color: '#00e5a0',
          }}>
            <CheckCircle size={13} />
            <span>Imported {imported} file{imported > 1 ? 's' : ''} successfully.</span>
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(0,0,0,0.5)' }}>
                {files.length} markdown file{files.length > 1 ? 's' : ''} found
              </span>
              <button onClick={selectAll} className="text-[10px] font-semibold" style={{ color: '#2a6fff' }}>
                {selected.size === files.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1 max-h-[240px] overflow-y-auto mb-4">
              {files.map((f) => (
                <label key={f.path} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all" style={{
                  background: selected.has(f.path) ? 'rgba(42,111,255,0.06)' : 'transparent',
                  border: selected.has(f.path) ? '1px solid rgba(42,111,255,0.2)' : '1px solid rgba(0,0,0,0.04)',
                }}>
                  <input
                    type="checkbox"
                    checked={selected.has(f.path)}
                    onChange={() => toggleFile(f.path)}
                    className="accent-[#2a6fff]"
                  />
                  <FileText size={13} style={{ color: 'rgba(0,0,0,0.3)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{ color: 'rgba(0,0,0,0.8)' }}>{f.name}</div>
                    <div className="text-[10px] truncate" style={{ color: 'rgba(0,0,0,0.35)' }}>{f.path}</div>
                  </div>
                </label>
              ))}
            </div>
            <Button variant="primary" size="md" onClick={handleImport} disabled={selected.size === 0 || loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Import {selected.size} file{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Export Modal ─────────────────────────────────────────────────────────────
export const ExportModal = ({ doc, onClose }: { doc: DocEntry; onClose: () => void }) => {
  const settings = useSettingsStore((s) => s.settings);

  const [repoUrl, setRepoUrl] = useState('');
  const [filePath, setFilePath] = useState(`docs/${doc.title.toLowerCase().replace(/\s+/g, '-')}.md`);
  const [branch, setBranch] = useState('main');
  const [commitMsg, setCommitMsg] = useState(`docs: add ${doc.title}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const parsed = parseRepoUrl(repoUrl);
  const isGitHub = parsed?.source === 'github';
  const isADO = parsed?.source === 'ado';

  const handleExport = async () => {
    if (!parsed) {
      setError('Invalid repository URL.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (parsed.source === 'github') {
        const token = settings.github.accessToken;
        if (!token) throw new Error('GitHub access token not configured. Set it in Settings.');

        // Check if file already exists to get SHA
        let sha: string | undefined;
        try {
          const existing = await fetch(
            `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${filePath}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
          );
          if (existing.ok) {
            const data = await existing.json();
            sha = data.sha;
          }
        } catch { /* file doesn't exist, that's fine */ }

        await pushGitHubFile(parsed.owner, parsed.repo, filePath, doc.content, commitMsg, token, sha);
      } else {
        const pat = settings.ado.personalAccessToken;
        if (!pat) throw new Error('Azure DevOps PAT not configured. Set it in Settings.');
        await pushADOFile(parsed.org, parsed.project, parsed.repo, branch, filePath, doc.content, commitMsg, pat);
      }
      setSuccess(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(0,0,0,0.1)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload size={16} style={{ color: '#00e5a0' }} />
            <h3 className="text-sm font-bold" style={{ color: 'rgba(0,0,0,0.9)' }}>Export to Repository</h3>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'rgba(0,0,0,0.3)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Doc info */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{
          background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <FileText size={14} style={{ color: 'rgba(0,0,0,0.4)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(0,0,0,0.7)' }}>{doc.title}</span>
          <Pill color="rgba(0,0,0,0.3)">{doc.content.length} chars</Pill>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'rgba(0,0,0,0.5)' }}>Repository URL</label>
            <input
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setError(''); setSuccess(false); }}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-xl px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.9)' }}
            />
            {parsed && (
              <div className="flex items-center gap-1.5 mt-1">
                {isGitHub ? <GitFork size={10} style={{ color: '#2a6fff' }} /> : <GitBranch size={10} style={{ color: '#2a6fff' }} />}
                <span className="text-[10px]" style={{ color: 'rgba(0,0,0,0.4)' }}>
                  {isGitHub ? `${parsed.owner}/${parsed.repo}` : `${parsed.org}/${parsed.project}/${parsed.repo}`}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'rgba(0,0,0,0.5)' }}>File Path</label>
            <input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none font-mono"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.9)' }}
            />
          </div>

          {isADO && (
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'rgba(0,0,0,0.5)' }}>Branch</label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs outline-none font-mono"
                style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.9)' }}
              />
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'rgba(0,0,0,0.5)' }}>Commit Message</label>
            <input
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.9)' }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg mb-3 text-[11px]" style={{
            background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.15)', color: '#ff4757',
          }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3 text-[11px]" style={{
            background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', color: '#00e5a0',
          }}>
            <CheckCircle size={13} />
            <span>Exported successfully to {filePath}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={handleExport} disabled={!parsed || !filePath.trim() || loading}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {success ? 'Export Again' : 'Export'}
          </Button>
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};
