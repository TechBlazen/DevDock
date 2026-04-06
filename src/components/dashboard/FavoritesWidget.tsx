import { useNavigate } from 'react-router-dom';
import { Star, GitFork, GitBranch, Cloud, ExternalLink, Wrench } from 'lucide-react';
import { useAuthStore, useUserAccountsStore, useRepoStore } from '../../store';
import { TOOLS } from '../../pages/DevToolsPage';
import type { RepoEnvironment } from '../../types';

const ENV_COLORS: Record<RepoEnvironment, string> = {
  SBX: '#3b82f6', ADT: '#0891b2', UAT: '#d97706', QAT: '#ea580c', SPD: '#7c3aed', PRD: '#dc2626',
};

const langColors: Record<string, string> = {
  Python: '#3572A5', TypeScript: '#3178C6', JavaScript: '#F1E05A', Go: '#00ADD8',
  Rust: '#DEA584', YAML: '#CB171E', HCL: '#844FBA', Java: '#B07219', Unknown: '#8B8B8B',
};

export const FavoritesWidget = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const accounts = useUserAccountsStore((s) => s.accounts);
  const { githubRepos, adoRepos } = useRepoStore();

  const userAccount = accounts.find((a) => a.id === user?.id);
  const favRepoIds = userAccount?.favoriteRepos ?? [];
  const favToolIds = userAccount?.favoriteTools ?? [];
  const isAdmin = user?.role === 'admin';
  const allRepos = [...githubRepos, ...adoRepos];
  const favoriteRepos = allRepos.filter((r) => favRepoIds.includes(r.id) && (isAdmin || r.visible !== false));
  const favoriteTools = TOOLS.filter((t) => favToolIds.includes(t.id));

  const hasAny = favoriteRepos.length > 0 || favoriteTools.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6" style={{ color: 'var(--text-faint)' }}>
        <Star size={24} />
        <span className="text-xs">Star repos or dev tools to see them here</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Favorite repos */}
      {favoriteRepos.map((repo) => (
        <div
          key={repo.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          style={{ border: '1px solid var(--border-subtle)' }}
          onClick={() => window.open(repo.webUrl, '_blank')}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
            {repo.source === 'github' ? <GitFork size={14} /> : <GitBranch size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{repo.name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${langColors[repo.language] ?? langColors.Unknown}18`, color: langColors[repo.language] ?? langColors.Unknown }}>{repo.language}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {repo.cloudPlatform && (
                <span className="flex items-center gap-0.5 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  <Cloud size={8} />{repo.cloudPlatform}
                </span>
              )}
              {repo.environments?.slice(0, 3).map((env) => (
                <span key={env} className="text-[8px] font-bold px-1 rounded" style={{ color: ENV_COLORS[env] }}>{env}</span>
              ))}
            </div>
          </div>
          <ExternalLink size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        </div>
      ))}

      {/* Favorite tools */}
      {favoriteTools.length > 0 && favoriteRepos.length > 0 && (
        <div className="text-[9px] font-bold uppercase tracking-wider px-1 pt-1" style={{ color: 'var(--text-faint)' }}>
          <Wrench size={9} className="inline mr-0.5" /> Tools
        </div>
      )}
      {favoriteTools.map((tool) => {
        const Icon = tool.icon;
        return (
          <div
            key={tool.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            style={{ border: '1px solid var(--border-subtle)' }}
            onClick={() => navigate(tool.path)}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tool.color}12`, border: `1px solid ${tool.color}25` }}>
              <Icon size={13} style={{ color: tool.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-semibold truncate block" style={{ color: 'var(--text-primary)' }}>{tool.name}</span>
              <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>{tool.category}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
