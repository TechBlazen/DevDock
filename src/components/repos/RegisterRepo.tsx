import { useState } from 'react';
import { Plus, Loader2, CheckCircle, AlertCircle, X, GitFork, GitBranch } from 'lucide-react';
import { useRepoStore, useSettingsStore } from '../../store';
import { parseRepoUrl, fetchGitHubRepo, fetchADORepo } from '../../lib/repos';
import { Card, Button, Pill } from '../ui';
import type { Repository, RepoSource } from '../../types';

interface RegisterRepoProps {
  source: RepoSource;
}

export const RegisterRepo = ({ source }: RegisterRepoProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Repository | null>(null);

  const { addRepo } = useRepoStore();
  const settings = useSettingsStore((s) => s.settings);

  const handleAnalyze = async () => {
    setError('');
    setPreview(null);

    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setError(
        source === 'github'
          ? 'Invalid URL. Expected format: https://github.com/owner/repo'
          : 'Invalid URL. Expected format: https://dev.azure.com/org/project/_git/repo'
      );
      return;
    }

    if (parsed.source !== source) {
      setError(`This is a ${parsed.source === 'github' ? 'GitHub' : 'Azure DevOps'} URL. Use the ${parsed.source === 'github' ? 'GitHub' : 'Azure DevOps'} page to register it.`);
      return;
    }

    setLoading(true);
    try {
      let repo: Repository;
      if (parsed.source === 'github') {
        repo = await fetchGitHubRepo(parsed.owner, parsed.repo, settings.github.accessToken || undefined);
      } else {
        repo = await fetchADORepo(parsed.org, parsed.project, parsed.repo, settings.ado.personalAccessToken || undefined);
      }
      setPreview(repo);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('404')) {
        setError('Repository not found. Check the URL and ensure you have access.');
      } else if (msg.includes('401') || msg.includes('403')) {
        setError('Authentication failed. Configure your access token in Settings.');
      } else {
        setError(`Failed to fetch repository: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    addRepo(preview);
    setPreview(null);
    setUrl('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim()) handleAnalyze();
  };

  const handleClose = () => {
    setIsOpen(false);
    setUrl('');
    setError('');
    setPreview(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
        style={{
          background: 'rgba(42, 111, 255, 0.1)',
          color: '#2a6fff',
          border: '1px solid rgba(42, 111, 255, 0.25)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(42, 111, 255, 0.18)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(42, 111, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(42, 111, 255, 0.1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Plus size={13} />
        Register Repository
      </button>
    );
  }

  return (
    <Card>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {source === 'github' ? <GitFork size={14} style={{ color: '#2a6fff' }} /> : <GitBranch size={14} style={{ color: '#2a6fff' }} />}
            <span className="text-[12px] font-bold" style={{ color: 'rgba(0,0,0,0.8)' }}>
              Register {source === 'github' ? 'GitHub' : 'Azure DevOps'} Repository
            </span>
          </div>
          <button onClick={handleClose} className="p-1 transition-colors" style={{ color: 'rgba(0,0,0,0.3)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(0,0,0,0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(0,0,0,0.3)'}>
            <X size={14} />
          </button>
        </div>

        {/* URL input */}
        <div className="flex gap-2 mb-2">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); setPreview(null); }}
            onKeyDown={handleKeyDown}
            placeholder={
              source === 'github'
                ? 'https://github.com/owner/repo'
                : 'https://dev.azure.com/org/project/_git/repo'
            }
            autoFocus
            className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid rgba(42,111,255,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42,111,255,0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid rgba(0,0,0,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={!url.trim() || loading}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Analyze'}
          </Button>
        </div>

        <p className="text-[10px] mb-3" style={{ color: 'rgba(0,0,0,0.35)' }}>
          Paste a repository URL to fetch its metadata and register it in Forge Portal.
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg mb-3 text-[11px]" style={{
            background: 'rgba(255,71,87,0.06)',
            border: '1px solid rgba(255,71,87,0.15)',
            color: '#ff4757',
          }}>
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="rounded-xl p-3 mb-3 animate-[fadeIn_0.2s_ease]" style={{
            background: 'rgba(0,229,160,0.06)',
            border: '1px solid rgba(0,229,160,0.2)',
          }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={14} style={{ color: '#00e5a0' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#00e5a0' }}>Repository found</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold" style={{ color: 'rgba(0,0,0,0.9)' }}>{preview.name}</span>
                <Pill color={preview.isPrivate ? '#f5a623' : '#2a6fff'}>
                  {preview.isPrivate ? 'private' : 'public'}
                </Pill>
                <Pill color="#3178C6">{preview.language}</Pill>
              </div>
              {preview.description && (
                <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.55)' }}>{preview.description}</p>
              )}
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(0,0,0,0.4)' }}>
                <span>Branch: {preview.defaultBranch}</span>
                {preview.stars !== undefined && <span>Stars: {preview.stars}</span>}
                <span>{preview.fullName}</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" size="sm" onClick={handleImport}>
                Import Repository
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setPreview(null); setUrl(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
