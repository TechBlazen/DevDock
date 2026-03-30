import { useState, useRef, useEffect } from 'react';
import { Star, GitBranch, Lock, Globe, ExternalLink, Code2, Download, Copy, Check, Terminal } from 'lucide-react';
import { Card, Pill, Button, Tooltip } from '../ui';
import { openInVSCode, openInVSCodeWeb } from '../../lib/repos';
import type { Repository } from '../../types';

const langColors: Record<string, string> = {
  Python:     '#3572A5',
  TypeScript: '#3178C6',
  JavaScript: '#F1E05A',
  Go:         '#00ADD8',
  Rust:       '#DEA584',
  YAML:       '#CB171E',
  HCL:        '#844FBA',
  Java:       '#B07219',
  'C#':       '#178600',
  Shell:      '#89E051',
  Unknown:    '#8B8B8B',
};

interface RepoCardProps {
  repo: Repository;
}

// ─── Clone Menu ──────────────────────────────────────────────────────────────
const CloneMenu = ({ repo, onClose }: { repo: Repository; onClose: () => void }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  const httpsUrl = repo.cloneUrl;
  const sshUrl = repo.source === 'github'
    ? `git@github.com:${repo.fullName}.git`
    : '';

  const ghCliCmd = repo.source === 'github'
    ? `gh repo clone ${repo.fullName}`
    : '';

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full right-0 mb-2 w-[320px] rounded-[18px] p-4 z-50 animate-[fadeIn_0.15s_ease]"
      style={{
        background: 'rgba(245, 247, 250, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(60px) saturate(200%)',
        WebkitBackdropFilter: 'blur(60px) saturate(200%)',
        boxShadow: '0 16px 48px rgba(31, 38, 135, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }}
    >
      <div className="text-[11px] font-bold mb-3" style={{ color: 'rgba(0,0,0,0.7)' }}>
        Clone Repository
      </div>

      {/* HTTPS */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
          HTTPS
        </div>
        <div className="flex gap-1.5">
          <div className="flex-1 rounded-xl px-2.5 py-1.5 text-[11px] font-mono truncate" style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'rgba(0,0,0,0.7)',
          }}>
            {httpsUrl}
          </div>
          <button
            onClick={() => handleCopy(httpsUrl, 'https')}
            className="px-2 rounded-xl transition-all duration-200 flex-shrink-0"
            style={{
              background: copiedType === 'https' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: copiedType === 'https' ? '#10b981' : 'rgba(0,0,0,0.5)',
            }}
          >
            {copiedType === 'https' ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* SSH (GitHub only) */}
      {sshUrl && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
            SSH
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 rounded-xl px-2.5 py-1.5 text-[11px] font-mono truncate" style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(0,0,0,0.7)',
            }}>
              {sshUrl}
            </div>
            <button
              onClick={() => handleCopy(sshUrl, 'ssh')}
              className="px-2 rounded-xl transition-all duration-200 flex-shrink-0"
              style={{
                background: copiedType === 'ssh' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: copiedType === 'ssh' ? '#10b981' : 'rgba(0,0,0,0.5)',
              }}
            >
              {copiedType === 'ssh' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* GitHub CLI (GitHub only) */}
      {ghCliCmd && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
            GitHub CLI
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 rounded-xl px-2.5 py-1.5 text-[11px] font-mono truncate" style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(0,0,0,0.7)',
            }}>
              {ghCliCmd}
            </div>
            <button
              onClick={() => handleCopy(ghCliCmd, 'cli')}
              className="px-2 rounded-xl transition-all duration-200 flex-shrink-0"
              style={{
                background: copiedType === 'cli' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: copiedType === 'cli' ? '#10b981' : 'rgba(0,0,0,0.5)',
              }}
            >
              {copiedType === 'cli' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Button variant="success" size="sm" onClick={() => openInVSCode(repo.cloneUrl)}>
          <Code2 size={11} /> Clone in VS Code
        </Button>
        <Button variant="ghost" size="sm" onClick={() => {
          handleCopy(`git clone ${httpsUrl}`, 'gitclone');
        }}>
          <Terminal size={11} /> {copiedType === 'gitclone' ? 'Copied!' : 'git clone'}
        </Button>
      </div>
    </div>
  );
};

// ─── Repo Card ───────────────────────────────────────────────────────────────
export const RepoCard = ({ repo }: RepoCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showCloneMenu, setShowCloneMenu] = useState(false);
  const langColor = langColors[repo.language] ?? langColors.Unknown;

  return (
    <Card
      highlight={expanded}
      onClick={() => setExpanded((v) => !v)}
      className="transition-all"
    >
      <div style={{ padding: '12px 16px 12px 28px' }}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-sm font-bold truncate" style={{ color: 'rgba(0,0,0,0.85)' }}>{repo.name}</span>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {repo.isPrivate ? (
              <Pill color="#f59e0b"><Lock size={9} className="inline mr-0.5" />private</Pill>
            ) : (
              <Pill color="#3b82f6"><Globe size={9} className="inline mr-0.5" />public</Pill>
            )}
            <Pill color={langColor}>{repo.language}</Pill>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs mb-2.5 leading-relaxed line-clamp-2" style={{ color: 'rgba(0, 0, 0, 0.55)' }}>{repo.description}</p>

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2.5">
            {repo.topics.slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] rounded-lg px-1.5 py-0.5" style={{
                background: 'rgba(59, 130, 246, 0.08)',
                color: 'rgba(59, 130, 246, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.15)'
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
          <span className="flex items-center gap-1"><GitBranch size={11} />{repo.defaultBranch}</span>
          {repo.stars !== undefined && (
            <span className="flex items-center gap-1"><Star size={11} />{repo.stars}</span>
          )}
          <span className="ml-auto">{repo.updatedAt}</span>
        </div>

        {/* Expanded actions */}
        {expanded && (
          <div
            className="mt-3 pt-3 flex flex-wrap gap-2 relative"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip tip="Open repo in a new browser tab">
              <Button variant="outline" size="sm" onClick={() => window.open(repo.webUrl, '_blank')}>
                <ExternalLink size={11} /> Open in Browser
              </Button>
            </Tooltip>
            <Tooltip tip="Clone & open in your local VS Code">
              <Button variant="success" size="sm" onClick={() => openInVSCode(repo.cloneUrl)}>
                <Code2 size={11} /> Open in VS Code
              </Button>
            </Tooltip>
            {repo.source === 'github' && (
              <Tooltip tip="Edit in the browser via github.dev">
                <Button variant="ghost" size="sm" onClick={() => openInVSCodeWeb(repo.webUrl)}>
                  <Globe size={11} /> Edit in Browser
                </Button>
              </Tooltip>
            )}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCloneMenu(!showCloneMenu)}
              >
                <Download size={11} /> Clone
              </Button>
              {showCloneMenu && (
                <CloneMenu repo={repo} onClose={() => setShowCloneMenu(false)} />
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
