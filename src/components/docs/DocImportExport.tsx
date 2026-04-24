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
import {
  Pill,
  FormTitle, FormCard, FormField, FormInput, FormPrimaryButton, FormSecondaryButton,
  FormDivider,
} from '../ui';
import type { DocEntry } from '../../types';

// Shared overlay wrapper — matches the Costco "card-on-light-overlay" look.
const ModalShell = ({
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    onClick={onClose}
    style={{ background: 'var(--overlay)' }}
  >
    <div className={`w-full ${maxWidth} my-8`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <FormTitle className="!mb-0">{title}</FormTitle>
        <button
          onClick={onClose}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ErrorBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 p-3 text-[13px]" style={{
    background: 'rgba(209,52,56,0.08)',
    border: '1px solid rgba(209,52,56,0.35)',
    borderRadius: 'var(--form-radius)',
    color: '#b02226',
  }}>
    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const SuccessBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 p-3 text-[13px]" style={{
    background: 'rgba(46,125,50,0.08)',
    border: '1px solid rgba(46,125,50,0.35)',
    borderRadius: 'var(--form-radius)',
    color: '#1e5b23',
  }}>
    <CheckCircle size={16} />
    <span>{children}</span>
  </div>
);

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
    <ModalShell onClose={onClose} title={
      <span className="inline-flex items-center gap-2">
        <Download size={22} style={{ color: 'var(--form-primary-bg)' }} />
        Import Markdown
      </span>
    }>
      <FormCard>
        <div className="space-y-4">
          <FormField label="Repository URL" htmlFor="import-url">
            <FormInput
              id="import-url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              autoFocus
            />
          </FormField>

          <FormField
            label="Directory Path"
            htmlFor="import-dir"
            help="Leave empty to scan from repository root."
          >
            <FormInput
              id="import-dir"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="docs/"
            />
          </FormField>

          {error && <ErrorBanner>{error}</ErrorBanner>}
          {imported > 0 && <SuccessBanner>Imported {imported} file{imported > 1 ? 's' : ''} successfully.</SuccessBanner>}

          <FormPrimaryButton onClick={handleDiscover} disabled={!repoUrl.trim() || loading}>
            {loading && files.length === 0 ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading && files.length === 0 ? 'Discovering…' : 'Discover Markdown Files'}
          </FormPrimaryButton>
        </div>

        {files.length > 0 && (
          <>
            <FormDivider />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {files.length} markdown file{files.length > 1 ? 's' : ''} found
                </span>
                <button
                  onClick={selectAll}
                  className="text-[13px] font-semibold underline"
                  style={{ color: 'var(--form-primary-bg)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {selected.size === files.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto mb-4">
                {files.map((f) => {
                  const isSelected = selected.has(f.path);
                  return (
                    <label
                      key={f.path}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        background: isSelected ? 'var(--form-secondary-bg-hover)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--form-primary-bg)' : 'var(--form-input-border)'}`,
                        borderRadius: 'var(--form-radius)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFile(f.path)}
                        style={{ accentColor: 'var(--form-primary-bg)' }}
                      />
                      <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--form-title-text)' }}>{f.name}</div>
                        <div className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{f.path}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <FormPrimaryButton onClick={handleImport} disabled={selected.size === 0 || loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Import {selected.size} file{selected.size !== 1 ? 's' : ''}
              </FormPrimaryButton>
            </div>
          </>
        )}
      </FormCard>
    </ModalShell>
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
    <ModalShell
      onClose={onClose}
      maxWidth="max-w-md"
      title={
        <span className="inline-flex items-center gap-2">
          <Upload size={22} style={{ color: 'var(--form-primary-bg)' }} />
          Export to Repository
        </span>
      }
    >
      <FormCard>
        <div className="flex items-center gap-2 mb-4 px-3 py-2" style={{
          background: 'var(--bg-inset)',
          border: '1px solid var(--form-input-border)',
          borderRadius: 'var(--form-radius)',
        }}>
          <FileText size={16} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[14px] font-semibold flex-1 truncate" style={{ color: 'var(--form-title-text)' }}>{doc.title}</span>
          <Pill color="var(--text-muted)">{doc.content.length} chars</Pill>
        </div>

        <div className="space-y-4">
          <FormField label="Repository URL" htmlFor="export-url">
            <FormInput
              id="export-url"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setError(''); setSuccess(false); }}
              placeholder="https://github.com/owner/repo"
              autoFocus
            />
            {parsed && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {isGitHub ? <GitFork size={12} style={{ color: 'var(--form-primary-bg)' }} /> : <GitBranch size={12} style={{ color: 'var(--form-primary-bg)' }} />}
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {isGitHub ? `${parsed.owner}/${parsed.repo}` : `${parsed.org}/${parsed.project}/${parsed.repo}`}
                </span>
              </div>
            )}
          </FormField>

          <FormField label="File Path" htmlFor="export-path">
            <FormInput
              id="export-path"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              style={{ fontFamily: 'Source Code Pro, monospace', fontSize: 14 }}
            />
          </FormField>

          {isADO && (
            <FormField label="Branch" htmlFor="export-branch">
              <FormInput
                id="export-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={{ fontFamily: 'Source Code Pro, monospace', fontSize: 14 }}
              />
            </FormField>
          )}

          <FormField label="Commit Message" htmlFor="export-msg">
            <FormInput
              id="export-msg"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
            />
          </FormField>

          {error && <ErrorBanner>{error}</ErrorBanner>}
          {success && <SuccessBanner>Exported successfully to {filePath}</SuccessBanner>}

          <FormPrimaryButton onClick={handleExport} disabled={!parsed || !filePath.trim() || loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {success ? 'Export Again' : 'Export'}
          </FormPrimaryButton>
          <FormSecondaryButton onClick={onClose}>Cancel</FormSecondaryButton>
        </div>
      </FormCard>
    </ModalShell>
  );
};
