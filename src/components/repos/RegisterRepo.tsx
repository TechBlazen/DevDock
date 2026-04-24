import { useState } from 'react';
import { Plus, Loader2, CheckCircle, AlertCircle, X, GitFork, GitBranch, Key, AlertTriangle } from 'lucide-react';
import { useRepoStore, useSettingsStore } from '../../store';
import { parseRepoUrl, fetchGitHubRepo, fetchADORepo } from '../../lib/repos';
import {
  Pill,
  FormTitle, FormCard, FormField, FormInput, FormPrimaryButton,
  FormSecondaryButton, FormDivider, FormHelpText,
} from '../ui';
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
  const [inlinePat, setInlinePat] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);

  const { addRepo } = useRepoStore();
  const settings = useSettingsStore((s) => s.settings);
  const updateADOConfig = useSettingsStore((s) => s.updateADOConfig);

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
        const pat = inlinePat.trim() || settings.ado.personalAccessToken || undefined;
        if (!pat) {
          setError('Azure DevOps requires a Personal Access Token (PAT). Enter one below or configure it in Settings.');
          setShowPatInput(true);
          setLoading(false);
          return;
        }
        repo = await fetchADORepo(parsed.org, parsed.project, parsed.repo, pat);
        if (inlinePat.trim() && !settings.ado.personalAccessToken) {
          updateADOConfig({ personalAccessToken: inlinePat.trim() });
        }
      }
      setPreview(repo);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('404')) {
        setError('Repository not found. Check the URL and ensure you have access.');
      } else if (msg.includes('401') || msg.includes('403')) {
        setError('Authentication failed. Check your Personal Access Token and ensure it has Code (Read) scope.');
        setShowPatInput(true);
      } else if (msg.includes('Network Error') || msg.includes('ECONNREFUSED')) {
        setError('Cannot reach Azure DevOps. Check your network connection and organization URL.');
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
    setInlinePat('');
    setShowPatInput(false);
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

  const SourceIcon = source === 'github' ? GitFork : GitBranch;
  const title = `Register ${source === 'github' ? 'GitHub' : 'Azure DevOps'} Repository`;
  const urlPlaceholder =
    source === 'github'
      ? 'https://github.com/owner/repo'
      : 'https://dev.azure.com/org/project/_git/repo';

  return (
    <div className="max-w-[540px]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <SourceIcon size={22} style={{ color: 'var(--form-primary-bg)' }} />
          <FormTitle className="!mb-0">{title}</FormTitle>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <X size={18} />
        </button>
      </div>

      <FormCard>
        <div className="space-y-4">
          <FormField
            label="Repository URL"
            htmlFor="repo-url"
            help="Paste a repository URL to fetch its metadata and register it in DevDock."
          >
            <FormInput
              id="repo-url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); setPreview(null); }}
              onKeyDown={handleKeyDown}
              placeholder={urlPlaceholder}
              autoFocus
            />
          </FormField>

          {/* ADO auth warning when no PAT is configured */}
          {source === 'ado' && !settings.ado.personalAccessToken && !showPatInput && (
            <div className="flex items-start gap-2 p-3 text-[13px]" style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 'var(--form-radius)',
              color: '#b45309',
            }}>
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">No PAT configured.</span> Azure DevOps repos require a Personal Access Token with <strong>Code (Read)</strong> scope.{' '}
                <button
                  onClick={() => setShowPatInput(true)}
                  className="underline font-semibold cursor-pointer"
                  style={{ background: 'none', border: 'none', color: 'inherit', padding: 0 }}
                >
                  Enter PAT
                </button>
                {' '}or configure it in Settings.
              </div>
            </div>
          )}

          {showPatInput && (
            <FormField
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Key size={13} />
                  Azure DevOps Personal Access Token
                </span>
              }
              htmlFor="repo-pat"
              help="Create a PAT at dev.azure.com → User Settings → Personal Access Tokens with Code (Read) scope. It will be saved to your settings automatically."
            >
              <FormInput
                id="repo-pat"
                value={inlinePat}
                onChange={(e) => setInlinePat(e.target.value)}
                placeholder="Paste your PAT here…"
                type="password"
              />
            </FormField>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 text-[13px]" style={{
              background: 'rgba(209,52,56,0.08)',
              border: '1px solid rgba(209,52,56,0.35)',
              borderRadius: 'var(--form-radius)',
              color: '#b02226',
            }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <FormPrimaryButton onClick={handleAnalyze} disabled={!url.trim() || loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Analyzing…' : 'Analyze Repository'}
          </FormPrimaryButton>
        </div>

        {preview && (
          <>
            <FormDivider />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: '#2e7d32' }} />
                <span className="text-[14px] font-bold" style={{ color: 'var(--form-title-text)' }}>Repository found</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-bold" style={{ color: 'var(--form-title-text)' }}>{preview.name}</span>
                  <Pill color={preview.isPrivate ? '#f5a623' : 'var(--form-primary-bg)'}>
                    {preview.isPrivate ? 'private' : 'public'}
                  </Pill>
                  <Pill color="#3178C6">{preview.language}</Pill>
                </div>
                {preview.description && (
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{preview.description}</p>
                )}
                <div className="flex items-center gap-3 text-[12px] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                  <span>Branch: {preview.defaultBranch}</span>
                  {preview.stars !== undefined && preview.source === 'github' && <span>Stars: {preview.stars}</span>}
                  <span>{preview.fullName}</span>
                  <span>Updated: {preview.updatedAt}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <FormPrimaryButton onClick={handleImport} fullWidth={false} className="sm:flex-1">
                  Import Repository
                </FormPrimaryButton>
                <FormSecondaryButton onClick={() => { setPreview(null); setUrl(''); }} fullWidth={false} className="sm:flex-1">
                  Cancel
                </FormSecondaryButton>
              </div>
            </div>
          </>
        )}

        {!preview && (
          <FormHelpText className="mt-4">
            Need help finding the URL? Open your repository in GitHub or Azure DevOps and copy the browser URL.
          </FormHelpText>
        )}
      </FormCard>
    </div>
  );
};
