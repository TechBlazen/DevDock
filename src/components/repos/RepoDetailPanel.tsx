import { useState, useEffect } from 'react';
import {
  GitCommit, GitPullRequest, Hammer, ExternalLink,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useSettingsStore } from '../../store';
import { parseRepoUrl } from '../../lib/repos';
import type { Repository, RepoCommit, RepoMerge, RepoBuild, MergeStatus, BuildStatus } from '../../types';
import {
  fetchGitHubCommits, fetchGitHubPRs, fetchGitHubBuilds,
  fetchADOCommits, fetchADOPRs, fetchADOBuilds,
} from '../../lib/repos';

type Tab = 'commits' | 'merges' | 'builds';

// ─── Seed data (used when no API token is configured) ────────────────────────
const SEED_COMMITS: Record<string, RepoCommit[]> = {
  gh1: [
    { sha: 'a3f8c21', message: 'feat: add multi-agent orchestration pipeline', author: 'judge', date: '4/2/2026', url: '#' },
    { sha: 'b7d4e19', message: 'fix: resolve race condition in diagnostics loop', author: 'jorge', date: '4/1/2026', url: '#' },
    { sha: 'c2a9f05', message: 'chore: bump otel-sdk to 1.9.0', author: 'adithya', date: '3/31/2026', url: '#' },
    { sha: 'd8b3c47', message: 'refactor: extract agent config into separate module', author: 'judge', date: '3/30/2026', url: '#' },
    { sha: 'e1f6a82', message: 'docs: update architecture diagram', author: 'jorge', date: '3/29/2026', url: '#' },
  ],
  gh2: [
    { sha: 'f4c7d31', message: 'feat: add bookmark management widget', author: 'judge', date: '4/2/2026', url: '#' },
    { sha: 'g9e2b56', message: 'fix: settings store persistence bug', author: 'judge', date: '4/1/2026', url: '#' },
    { sha: 'h5a1c78', message: 'feat: add RBAC role management', author: 'jorge', date: '3/31/2026', url: '#' },
    { sha: 'i3d8f94', message: 'chore: upgrade React to v19', author: 'judge', date: '3/30/2026', url: '#' },
  ],
  gh3: [
    { sha: 'j7b2e41', message: 'feat: add websocket transport support', author: 'adithya', date: '3/30/2026', url: '#' },
    { sha: 'k1c5f63', message: 'fix: handle server crash recovery gracefully', author: 'judge', date: '3/28/2026', url: '#' },
    { sha: 'l4d9a87', message: 'test: add integration tests for registry', author: 'jorge', date: '3/27/2026', url: '#' },
  ],
  ado1: [
    { sha: 'a91bc23', message: 'feat: add rate limiting policy to ApigeeX', author: 'adithya', date: '4/2/2026', url: '#' },
    { sha: 'b42de56', message: 'fix: correct CORS headers for /v2 endpoints', author: 'judge', date: '4/1/2026', url: '#' },
    { sha: 'c73ef89', message: 'chore: rotate API gateway certificates', author: 'adithya', date: '3/31/2026', url: '#' },
    { sha: 'd04fa12', message: 'feat: add request tracing via x-correlation-id', author: 'jorge', date: '3/30/2026', url: '#' },
  ],
  ado2: [
    { sha: 'e35ab45', message: 'feat: add node auto-scaling policy for GKE', author: 'adithya', date: '4/1/2026', url: '#' },
    { sha: 'f66bc78', message: 'fix: correct subnet CIDR overlap in staging', author: 'judge', date: '3/30/2026', url: '#' },
    { sha: 'g97cd01', message: 'chore: upgrade Terraform provider to 5.x', author: 'adithya', date: '3/28/2026', url: '#' },
  ],
  ado3: [
    { sha: 'h28de34', message: 'feat: integrate AI chat sidebar', author: 'judge', date: '4/2/2026', url: '#' },
    { sha: 'i59ef67', message: 'fix: plugin loader memory leak', author: 'jorge', date: '4/1/2026', url: '#' },
    { sha: 'j80fa90', message: 'refactor: move catalog to entity-provider pattern', author: 'judge', date: '3/31/2026', url: '#' },
  ],
  ado4: [
    { sha: 'k11ab23', message: 'feat: add autonomous remediation agent', author: 'judge', date: '4/2/2026', url: '#' },
    { sha: 'l42bc56', message: 'fix: agent timeout on large k8s clusters', author: 'adithya', date: '4/1/2026', url: '#' },
    { sha: 'm73cd89', message: 'perf: batch OTel span export for throughput', author: 'judge', date: '3/31/2026', url: '#' },
    { sha: 'n04de12', message: 'test: add e2e agent workflow tests', author: 'jorge', date: '3/30/2026', url: '#' },
  ],
};

const SEED_MERGES: Record<string, RepoMerge[]> = {
  gh1: [
    { id: '47', title: 'Multi-agent orchestration', author: 'judge', status: 'merged', sourceBranch: 'feat/multi-agent', targetBranch: 'main', date: '4/2/2026', url: '#' },
    { id: '46', title: 'Fix diagnostics race condition', author: 'jorge', status: 'merged', sourceBranch: 'fix/race-cond', targetBranch: 'main', date: '4/1/2026', url: '#' },
    { id: '45', title: 'Add GPU scheduling support', author: 'adithya', status: 'open', sourceBranch: 'feat/gpu-sched', targetBranch: 'main', date: '3/31/2026', url: '#' },
    { id: '44', title: 'Refactor config module', author: 'judge', status: 'closed', sourceBranch: 'refactor/config', targetBranch: 'main', date: '3/30/2026', url: '#' },
  ],
  gh2: [
    { id: '23', title: 'Bookmark management widget', author: 'judge', status: 'merged', sourceBranch: 'feat/bookmarks', targetBranch: 'main', date: '4/2/2026', url: '#' },
    { id: '22', title: 'RBAC implementation', author: 'jorge', status: 'merged', sourceBranch: 'feat/rbac', targetBranch: 'main', date: '3/31/2026', url: '#' },
    { id: '21', title: 'Dark mode color fixes', author: 'judge', status: 'open', sourceBranch: 'fix/dark-mode', targetBranch: 'main', date: '3/30/2026', url: '#' },
  ],
  ado1: [
    { id: '112', title: 'Rate limiting policy', author: 'adithya', status: 'merged', sourceBranch: 'feat/rate-limit', targetBranch: 'main', date: '4/2/2026', url: '#' },
    { id: '111', title: 'CORS header fix for v2', author: 'judge', status: 'merged', sourceBranch: 'fix/cors-v2', targetBranch: 'main', date: '4/1/2026', url: '#' },
    { id: '110', title: 'Migrate to mTLS', author: 'adithya', status: 'open', sourceBranch: 'feat/mtls', targetBranch: 'main', date: '3/30/2026', url: '#' },
  ],
  ado2: [
    { id: '88', title: 'Node auto-scaling policy', author: 'adithya', status: 'merged', sourceBranch: 'feat/autoscale', targetBranch: 'main', date: '4/1/2026', url: '#' },
    { id: '87', title: 'Fix subnet CIDR overlap', author: 'judge', status: 'merged', sourceBranch: 'fix/cidr', targetBranch: 'main', date: '3/30/2026', url: '#' },
    { id: '86', title: 'Upgrade Terraform 5.x', author: 'adithya', status: 'closed', sourceBranch: 'chore/tf5', targetBranch: 'main', date: '3/28/2026', url: '#' },
  ],
  ado3: [
    { id: '56', title: 'AI chat sidebar integration', author: 'judge', status: 'merged', sourceBranch: 'feat/ai-chat', targetBranch: 'feature/ai-chat', date: '4/2/2026', url: '#' },
    { id: '55', title: 'Fix plugin loader leak', author: 'jorge', status: 'merged', sourceBranch: 'fix/plugin-leak', targetBranch: 'feature/ai-chat', date: '4/1/2026', url: '#' },
  ],
  ado4: [
    { id: '201', title: 'Autonomous remediation agent', author: 'judge', status: 'merged', sourceBranch: 'feat/auto-remediate', targetBranch: 'main', date: '4/2/2026', url: '#' },
    { id: '200', title: 'Agent timeout fix', author: 'adithya', status: 'merged', sourceBranch: 'fix/timeout', targetBranch: 'main', date: '4/1/2026', url: '#' },
    { id: '199', title: 'Add LLM fallback provider', author: 'judge', status: 'open', sourceBranch: 'feat/llm-fallback', targetBranch: 'main', date: '3/31/2026', url: '#' },
  ],
};

const SEED_BUILDS: Record<string, RepoBuild[]> = {
  gh1: [
    { id: 'r1001', name: 'CI Pipeline', status: 'succeeded', branch: 'main', commit: 'a3f8c21', duration: '3m 42s', date: '4/2/2026', url: '#' },
    { id: 'r1002', name: 'CI Pipeline', status: 'succeeded', branch: 'main', commit: 'b7d4e19', duration: '3m 18s', date: '4/1/2026', url: '#' },
    { id: 'r1003', name: 'Deploy Staging', status: 'succeeded', branch: 'main', commit: 'b7d4e19', duration: '5m 01s', date: '4/1/2026', url: '#' },
    { id: 'r1004', name: 'CI Pipeline', status: 'failed', branch: 'feat/gpu-sched', commit: 'x9c2d31', duration: '2m 56s', date: '3/31/2026', url: '#' },
    { id: 'r1005', name: 'Deploy Production', status: 'succeeded', branch: 'main', commit: 'c2a9f05', duration: '7m 12s', date: '3/31/2026', url: '#' },
  ],
  gh2: [
    { id: 'r2001', name: 'Build & Lint', status: 'succeeded', branch: 'main', commit: 'f4c7d31', duration: '1m 48s', date: '4/2/2026', url: '#' },
    { id: 'r2002', name: 'Build & Lint', status: 'failed', branch: 'fix/dark-mode', commit: 'z2b4a51', duration: '1m 12s', date: '3/30/2026', url: '#' },
    { id: 'r2003', name: 'Build & Lint', status: 'succeeded', branch: 'main', commit: 'h5a1c78', duration: '1m 55s', date: '3/31/2026', url: '#' },
  ],
  gh3: [
    { id: 'r3001', name: 'Go Test', status: 'succeeded', branch: 'develop', commit: 'j7b2e41', duration: '2m 05s', date: '3/30/2026', url: '#' },
    { id: 'r3002', name: 'Go Test', status: 'succeeded', branch: 'develop', commit: 'k1c5f63', duration: '1m 58s', date: '3/28/2026', url: '#' },
  ],
  ado1: [
    { id: 'b5001', name: 'Gateway CI', status: 'succeeded', branch: 'main', commit: 'a91bc23', duration: '4m 15s', date: '4/2/2026', url: '#' },
    { id: 'b5002', name: 'Gateway CI', status: 'succeeded', branch: 'main', commit: 'b42de56', duration: '4m 02s', date: '4/1/2026', url: '#' },
    { id: 'b5003', name: 'Deploy SPD', status: 'failed', branch: 'main', commit: 'b42de56', duration: '6m 33s', date: '4/1/2026', url: '#' },
    { id: 'b5004', name: 'Deploy SPD', status: 'succeeded', branch: 'main', commit: 'c73ef89', duration: '6m 18s', date: '3/31/2026', url: '#' },
  ],
  ado2: [
    { id: 'b6001', name: 'Terraform Plan', status: 'succeeded', branch: 'main', commit: 'e35ab45', duration: '2m 44s', date: '4/1/2026', url: '#' },
    { id: 'b6002', name: 'Terraform Apply', status: 'succeeded', branch: 'main', commit: 'e35ab45', duration: '8m 31s', date: '4/1/2026', url: '#' },
    { id: 'b6003', name: 'Terraform Plan', status: 'failed', branch: 'fix/cidr', commit: 'f66bc78', duration: '1m 52s', date: '3/30/2026', url: '#' },
  ],
  ado3: [
    { id: 'b7001', name: 'IDP Build', status: 'succeeded', branch: 'feature/ai-chat', commit: 'h28de34', duration: '3m 22s', date: '4/2/2026', url: '#' },
    { id: 'b7002', name: 'IDP Build', status: 'succeeded', branch: 'feature/ai-chat', commit: 'i59ef67', duration: '3m 11s', date: '4/1/2026', url: '#' },
    { id: 'b7003', name: 'Deploy ADT', status: 'running', branch: 'feature/ai-chat', commit: 'h28de34', duration: '—', date: '4/2/2026', url: '#' },
  ],
  ado4: [
    { id: 'b8001', name: 'Overwatch CI', status: 'succeeded', branch: 'main', commit: 'k11ab23', duration: '5m 07s', date: '4/2/2026', url: '#' },
    { id: 'b8002', name: 'Overwatch CI', status: 'failed', branch: 'feat/llm-fallback', commit: 'p5e6f78', duration: '4m 45s', date: '3/31/2026', url: '#' },
    { id: 'b8003', name: 'Deploy PRD', status: 'succeeded', branch: 'main', commit: 'l42bc56', duration: '9m 33s', date: '4/1/2026', url: '#' },
    { id: 'b8004', name: 'E2E Tests', status: 'succeeded', branch: 'main', commit: 'k11ab23', duration: '12m 18s', date: '4/2/2026', url: '#' },
  ],
};

// ─── Status helpers ─────────────────────────────────────────────────────────
const MERGE_STATUS_CONFIG: Record<MergeStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  merged: { icon: CheckCircle2, color: '#a855f7', label: 'Merged' },
  open:   { icon: Clock,        color: '#22c55e', label: 'Open' },
  closed: { icon: XCircle,      color: '#ef4444', label: 'Closed' },
};

const BUILD_STATUS_CONFIG: Record<BuildStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  succeeded: { icon: CheckCircle2,   color: '#22c55e', label: 'Passed' },
  failed:    { icon: XCircle,        color: '#ef4444', label: 'Failed' },
  running:   { icon: Loader2,        color: '#3b82f6', label: 'Running' },
  canceled:  { icon: AlertTriangle,  color: '#f59e0b', label: 'Canceled' },
  queued:    { icon: Clock,          color: '#6b7280', label: 'Queued' },
};

// ─── Main component ─────────────────────────────────────────────────────────
export const RepoDetailPanel = ({ repo }: { repo: Repository }) => {
  const [tab, setTab] = useState<Tab>('commits');
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [merges, setMerges] = useState<RepoMerge[]>([]);
  const [builds, setBuilds] = useState<RepoBuild[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = useSettingsStore((s) => s.settings);
  const ghToken = settings.github.accessToken;
  const adoPat = settings.ado.personalAccessToken;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      // If no token, use seed data
      if ((repo.source === 'github' && !ghToken) || (repo.source === 'ado' && !adoPat)) {
        setCommits(SEED_COMMITS[repo.id] ?? generateFallbackCommits(repo));
        setMerges(SEED_MERGES[repo.id] ?? generateFallbackMerges(repo));
        setBuilds(SEED_BUILDS[repo.id] ?? generateFallbackBuilds(repo));
        setLoading(false);
        return;
      }

      try {
        if (repo.source === 'github') {
          const parsed = parseRepoUrl(repo.webUrl);
          if (parsed?.source !== 'github') throw new Error('Invalid GitHub URL');
          const [c, m, b] = await Promise.all([
            fetchGitHubCommits(parsed.owner, parsed.repo, ghToken),
            fetchGitHubPRs(parsed.owner, parsed.repo, ghToken),
            fetchGitHubBuilds(parsed.owner, parsed.repo, ghToken),
          ]);
          if (!cancelled) { setCommits(c); setMerges(m); setBuilds(b); }
        } else {
          const parsed = parseRepoUrl(repo.webUrl);
          if (parsed?.source !== 'ado') throw new Error('Invalid ADO URL');
          const [c, m, b] = await Promise.all([
            fetchADOCommits(parsed.org, parsed.project, parsed.repo, adoPat),
            fetchADOPRs(parsed.org, parsed.project, parsed.repo, adoPat),
            fetchADOBuilds(parsed.org, parsed.project, adoPat),
          ]);
          if (!cancelled) { setCommits(c); setMerges(m); setBuilds(b); }
        }
      } catch (e) {
        if (!cancelled) {
          // Fall back to seed data on API error
          setCommits(SEED_COMMITS[repo.id] ?? generateFallbackCommits(repo));
          setMerges(SEED_MERGES[repo.id] ?? generateFallbackMerges(repo));
          setBuilds(SEED_BUILDS[repo.id] ?? generateFallbackBuilds(repo));
          setError(e instanceof Error ? e.message : 'Failed to load');
        }
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [repo.id, repo.source, repo.webUrl, ghToken, adoPat]);

  const tabs: { key: Tab; label: string; icon: typeof GitCommit; count: number }[] = [
    { key: 'commits', label: 'Commits', icon: GitCommit, count: commits.length },
    { key: 'merges',  label: 'Merges',  icon: GitPullRequest, count: merges.length },
    { key: 'builds',  label: 'Builds',  icon: Hammer, count: builds.length },
  ];

  return (
    <div className="pt-5" style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
      {/* Section header */}
      <div className="font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: "Verdana, Geneva, sans-serif", fontSize: '12px' }}>
        Repo History
      </div>

      {/* Tabs */}
      <div className="flex gap-3" style={{ borderBottom: '2px solid var(--border-subtle)' }}>
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 font-semibold px-5 py-2.5 transition-all relative"
            style={{
              fontFamily: "Verdana, Geneva, sans-serif",
              fontSize: '12px',
              background: 'transparent',
              color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              border: '2px solid var(--border-subtle)',
              borderBottom: tab === key ? '2px solid var(--bg-surface, transparent)' : '2px solid var(--border-subtle)',
              marginBottom: '-2px',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
            }}
          >
            <Icon size={13} />
            {label}
            <span className="font-bold px-1.5 py-0.5 rounded-full ml-0.5" style={{
              fontSize: '10px',
              fontFamily: "Verdana, Geneva, sans-serif",
              background: tab === key ? 'var(--accent-bg)' : 'var(--bg-inset)',
              color: tab === key ? 'var(--accent)' : 'var(--text-faint)',
            }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Tab content area */}
      <div style={{ padding: '12px 12px 12px 22px', border: '2px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 4px 4px', fontFamily: "Verdana, Geneva, sans-serif", fontSize: '12px' }}>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4 gap-2" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      )}

      {/* Error notice */}
      {error && !loading && (
        <div className="px-2 py-1 mb-2 rounded" style={{ fontSize: '11px', background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
          Using demo data — {error}
        </div>
      )}

      {/* Commits tab */}
      {!loading && tab === 'commits' && (
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {commits.length === 0 && <EmptyState label="No commits found" />}
          {commits.map((c) => (
            <a
              key={c.sha}
              href={c.url !== '#' ? c.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors group"
              style={{ textDecoration: 'none', color: 'inherit' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <code className="flex-shrink-0 mt-0.5 px-1 py-0.5 rounded" style={{ fontSize: '11px', fontFamily: "Verdana, Geneva, sans-serif", background: 'var(--bg-inset)', color: 'var(--accent)' }}>{c.sha}</code>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{c.message}</div>
                <div className="mt-0.5" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                  {c.author} · {c.date}
                </div>
              </div>
              {c.url !== '#' && <ExternalLink size={11} className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }} />}
            </a>
          ))}
        </div>
      )}

      {/* Merges tab */}
      {!loading && tab === 'merges' && (
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {merges.length === 0 && <EmptyState label="No pull requests found" />}
          {merges.map((m) => {
            const cfg = MERGE_STATUS_CONFIG[m.status];
            const StatusIcon = cfg.icon;
            return (
              <a
                key={m.id}
                href={m.url !== '#' ? m.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors group"
                style={{ textDecoration: 'none', color: 'inherit' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <StatusIcon size={14} className="flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: '11px', fontFamily: "Verdana, Geneva, sans-serif", color: 'var(--text-faint)' }}>#{m.id}</span>
                    <span className="font-medium truncate" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{m.title}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    <span>{m.author}</span>
                    <ChevronRight size={8} />
                    <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-inset)', fontSize: '10px', fontFamily: "Verdana, Geneva, sans-serif" }}>{m.sourceBranch}</code>
                    <span>→</span>
                    <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-inset)', fontSize: '10px', fontFamily: "Verdana, Geneva, sans-serif" }}>{m.targetBranch}</code>
                    <span className="ml-1">· {m.date}</span>
                  </div>
                </div>
                <span className="font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ fontSize: '10px', background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  {cfg.label}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* Builds tab */}
      {!loading && tab === 'builds' && (
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {builds.length === 0 && <EmptyState label="No builds found" />}
          {builds.map((b) => {
            const cfg = BUILD_STATUS_CONFIG[b.status];
            const StatusIcon = cfg.icon;
            return (
              <a
                key={b.id}
                href={b.url !== '#' ? b.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors group"
                style={{ textDecoration: 'none', color: 'inherit' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <StatusIcon
                  size={14}
                  className={`flex-shrink-0 mt-0.5 ${b.status === 'running' ? 'animate-spin' : ''}`}
                  style={{ color: cfg.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{b.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-inset)', fontSize: '10px', fontFamily: "Verdana, Geneva, sans-serif" }}>{b.branch}</code>
                    <span>·</span>
                    <code style={{ fontSize: '10px', fontFamily: "Verdana, Geneva, sans-serif" }}>{b.commit}</code>
                    <span>·</span>
                    <span>{b.duration}</span>
                    <span>·</span>
                    <span>{b.date}</span>
                  </div>
                </div>
                <span className="font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ fontSize: '10px', background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  {cfg.label}
                </span>
              </a>
            );
          })}
        </div>
      )}

      </div>{/* end tab content area */}
    </div>
  );
};

// ─── Fallback generators for repos without seed data ────────────────────────
function generateFallbackCommits(repo: Repository): RepoCommit[] {
  return [
    { sha: 'abc1234', message: `chore: update ${repo.name} dependencies`, author: 'developer', date: '4/1/2026', url: '#' },
    { sha: 'def5678', message: `fix: resolve build warnings`, author: 'developer', date: '3/30/2026', url: '#' },
    { sha: 'ghi9012', message: `feat: initial setup`, author: 'developer', date: '3/28/2026', url: '#' },
  ];
}

function generateFallbackMerges(repo: Repository): RepoMerge[] {
  return [
    { id: '1', title: 'Update dependencies', author: 'developer', status: 'merged', sourceBranch: 'chore/deps', targetBranch: repo.defaultBranch, date: '4/1/2026', url: '#' },
    { id: '2', title: 'Fix build warnings', author: 'developer', status: 'open', sourceBranch: 'fix/warnings', targetBranch: repo.defaultBranch, date: '3/30/2026', url: '#' },
  ];
}

function generateFallbackBuilds(repo: Repository): RepoBuild[] {
  return [
    { id: '1', name: 'CI Build', status: 'succeeded', branch: repo.defaultBranch, commit: 'abc1234', duration: '2m 15s', date: '4/1/2026', url: '#' },
    { id: '2', name: 'CI Build', status: 'failed', branch: 'fix/warnings', commit: 'def5678', duration: '1m 48s', date: '3/30/2026', url: '#' },
  ];
}

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-[11px] text-center py-4" style={{ color: 'var(--text-faint)' }}>{label}</div>
);
