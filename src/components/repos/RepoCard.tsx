import { useState, useRef, useEffect } from 'react';
import { Star, GitBranch, Lock, Globe, ExternalLink, Code2, Download, Copy, Check, Terminal, Pencil, X, User, Users, Cloud, Tag, Plus } from 'lucide-react';
import { Card, Pill, Button, Tooltip } from '../ui';
import { openInVSCode, openInVSCodeWeb } from '../../lib/repos';
import { useRepoStore, useAuthStore, useUserAccountsStore } from '../../store';
import type { Repository, RepoEnvironment, CloudPlatform, RepoOwner } from '../../types';

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

const ENV_COLORS: Record<RepoEnvironment, string> = {
  SBX: '#3b82f6',
  ADT: '#0891b2',
  UAT: '#d97706',
  QAT: '#ea580c',
  SPD: '#7c3aed',
  PRD: '#dc2626',
};

const CLOUD_COLORS: Record<CloudPlatform, string> = {
  Azure: '#0078d4',
  GCP: '#4285f4',
  AWS: '#ff9900',
  'On-Prem': '#6b7280',
  Other: '#9ca3af',
};

const ALL_ENVS: RepoEnvironment[] = ['SBX', 'ADT', 'UAT', 'QAT', 'SPD', 'PRD'];
const ALL_CLOUDS: CloudPlatform[] = ['Azure', 'GCP', 'AWS', 'On-Prem', 'Other'];

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
  const sshUrl = repo.source === 'github' ? `git@github.com:${repo.fullName}.git` : '';
  const ghCliCmd = repo.source === 'github' ? `gh repo clone ${repo.fullName}` : '';

  return (
    <div ref={menuRef} className="absolute bottom-full right-0 mb-2 w-[320px] rounded-[18px] p-4 z-50 animate-[fadeIn_0.15s_ease]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="text-[11px] font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Clone Repository</div>
      {[
        { label: 'HTTPS', url: httpsUrl, key: 'https' },
        ...(sshUrl ? [{ label: 'SSH', url: sshUrl, key: 'ssh' }] : []),
        ...(ghCliCmd ? [{ label: 'GitHub CLI', url: ghCliCmd, key: 'cli' }] : []),
      ].map(({ label, url, key }) => (
        <div key={key} className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          <div className="flex gap-1.5">
            <div className="flex-1 rounded-xl px-2.5 py-1.5 text-[11px] font-mono truncate" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{url}</div>
            <button onClick={() => handleCopy(url, key)} className="px-2 rounded-xl transition-all duration-200 flex-shrink-0" style={{ background: copiedType === key ? 'rgba(16,185,129,0.12)' : 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: copiedType === key ? '#10b981' : 'var(--text-muted)' }}>
              {copiedType === key ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="success" size="sm" onClick={() => openInVSCode(repo.cloneUrl)}><Code2 size={11} /> Clone in VS Code</Button>
        <Button variant="ghost" size="sm" onClick={() => handleCopy(`git clone ${httpsUrl}`, 'gitclone')}>
          <Terminal size={11} /> {copiedType === 'gitclone' ? 'Copied!' : 'git clone'}
        </Button>
      </div>
    </div>
  );
};

// ─── Metadata Editor ─────────────────────────────────────────────────────────
const MetadataEditor = ({ repo }: { repo: Repository }) => {
  const updateRepoMeta = useRepoStore((s) => s.updateRepoMeta);
  const [ownerInput, setOwnerInput] = useState('');
  const [ownerType, setOwnerType] = useState<'user' | 'team'>('user');
  const [tagInput, setTagInput] = useState('');

  const toggleEnv = (env: RepoEnvironment) => {
    const current = repo.environments ?? [];
    const next = current.includes(env) ? current.filter((e) => e !== env) : [...current, env];
    updateRepoMeta(repo.id, repo.source, { environments: next });
  };

  const setCloud = (cloud: CloudPlatform) => {
    updateRepoMeta(repo.id, repo.source, { cloudPlatform: cloud });
  };

  const addOwner = () => {
    if (!ownerInput.trim()) return;
    const current = repo.owners ?? [];
    if (current.some((o) => o.name === ownerInput.trim())) return;
    updateRepoMeta(repo.id, repo.source, { owners: [...current, { name: ownerInput.trim(), type: ownerType }] });
    setOwnerInput('');
  };

  const removeOwner = (name: string) => {
    updateRepoMeta(repo.id, repo.source, { owners: (repo.owners ?? []).filter((o) => o.name !== name) });
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const current = repo.customTags ?? [];
    const newTags = tagInput.split(',').map((t) => t.trim()).filter((t) => t && !current.includes(t));
    if (newTags.length) updateRepoMeta(repo.id, repo.source, { customTags: [...current, ...newTags] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateRepoMeta(repo.id, repo.source, { customTags: (repo.customTags ?? []).filter((t) => t !== tag) });
  };

  return (
    <div className="flex flex-col gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
      {/* Environments */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Environments</div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_ENVS.map((env) => {
            const active = repo.environments?.includes(env);
            return (
              <button key={env} onClick={() => toggleEnv(env)} className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all" style={{
                background: active ? `${ENV_COLORS[env]}20` : 'transparent',
                color: active ? ENV_COLORS[env] : 'var(--text-faint)',
                border: `1px solid ${active ? ENV_COLORS[env] : 'var(--border-input)'}`,
                cursor: 'pointer',
              }}>{env}</button>
            );
          })}
        </div>
      </div>

      {/* Cloud Platform */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Cloud Platform</div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_CLOUDS.map((cloud) => {
            const active = repo.cloudPlatform === cloud;
            return (
              <button key={cloud} onClick={() => setCloud(cloud)} className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all" style={{
                background: active ? `${CLOUD_COLORS[cloud]}20` : 'transparent',
                color: active ? CLOUD_COLORS[cloud] : 'var(--text-faint)',
                border: `1px solid ${active ? CLOUD_COLORS[cloud] : 'var(--border-input)'}`,
                cursor: 'pointer',
              }}>{cloud}</button>
            );
          })}
        </div>
      </div>

      {/* Owners */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Owners</div>
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          {(repo.owners ?? []).map((o) => (
            <span key={o.name} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              {o.type === 'team' ? <Users size={9} /> : <User size={9} />}
              {o.name}
              <button onClick={() => removeOwner(o.name)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', padding: 0 }}><X size={9} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setOwnerType(ownerType === 'user' ? 'team' : 'user')} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {ownerType === 'user' ? <User size={10} /> : <Users size={10} />}
          </button>
          <input value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOwner()} placeholder="Add owner..." className="text-[11px] px-2 py-1 rounded flex-1 min-w-0 outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
          <button onClick={addOwner} className="px-1.5 py-1 rounded" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}><Plus size={10} /></button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Tags</div>
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          {(repo.customTags ?? []).map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Tag size={8} />{tag}
              <button onClick={() => removeTag(tag)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', padding: 0 }}><X size={9} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="Add tags (comma separated)..." className="text-[11px] px-2 py-1 rounded flex-1 min-w-0 outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
          <button onClick={addTag} className="px-1.5 py-1 rounded" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}><Plus size={10} /></button>
        </div>
      </div>
    </div>
  );
};

// ─── Repo Card ───────────────────────────────────────────────────────────────
export const RepoCard = ({ repo }: RepoCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showCloneMenu, setShowCloneMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const langColor = langColors[repo.language] ?? langColors.Unknown;

  const user = useAuthStore((s) => s.user);
  const toggleFavoriteRepo = useUserAccountsStore((s) => s.toggleFavoriteRepo);
  const isFavoriteRepo = useUserAccountsStore((s) => s.isFavoriteRepo);
  const isFav = user ? isFavoriteRepo(user.id, repo.id) : false;

  return (
    <Card highlight={expanded} onClick={() => { if (!editing) setExpanded((v) => !v); }} className="transition-all">
      <div style={{ padding: '12px 16px 12px 28px' }}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Favorite star */}
            <button
              onClick={(e) => { e.stopPropagation(); if (user) toggleFavoriteRepo(user.id, repo.id); }}
              className="flex-shrink-0 transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isFav ? '#f59e0b' : 'var(--text-faint)', padding: 0 }}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={14} fill={isFav ? '#f59e0b' : 'none'} />
            </button>
            <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{repo.name}</span>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end items-center">
            {/* Edit metadata button */}
            <button
              onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }}
              className="p-1 rounded transition-colors"
              style={{ background: editing ? 'var(--accent-bg)' : 'transparent', color: editing ? 'var(--accent)' : 'var(--text-faint)', border: 'none', cursor: 'pointer' }}
              title="Edit metadata"
            >
              <Pencil size={11} />
            </button>
            {repo.isPrivate ? (
              <Pill color="#f59e0b"><Lock size={9} className="inline mr-0.5" />private</Pill>
            ) : (
              <Pill color="#3b82f6"><Globe size={9} className="inline mr-0.5" />public</Pill>
            )}
            <Pill color={langColor}>{repo.language}</Pill>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs mb-2.5 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{repo.description}</p>

        {/* Metadata pills */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {/* Environments */}
          {repo.environments?.map((env) => (
            <span key={env} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${ENV_COLORS[env]}18`, color: ENV_COLORS[env], border: `1px solid ${ENV_COLORS[env]}40` }}>{env}</span>
          ))}
          {/* Cloud platform */}
          {repo.cloudPlatform && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${CLOUD_COLORS[repo.cloudPlatform]}18`, color: CLOUD_COLORS[repo.cloudPlatform], border: `1px solid ${CLOUD_COLORS[repo.cloudPlatform]}40` }}>
              <Cloud size={8} />{repo.cloudPlatform}
            </span>
          )}
          {/* Owners */}
          {repo.owners?.map((o) => (
            <span key={o.name} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              {o.type === 'team' ? <Users size={8} /> : <User size={8} />}{o.name}
            </span>
          ))}
          {/* Custom tags */}
          {repo.customTags?.map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              <Tag size={7} />{tag}
            </span>
          ))}
        </div>

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2.5">
            {repo.topics.slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] rounded-lg px-1.5 py-0.5" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'rgba(59, 130, 246, 0.7)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>{t}</span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><GitBranch size={11} />{repo.defaultBranch}</span>
          {repo.stars !== undefined && (
            <span className="flex items-center gap-1"><Star size={11} />{repo.stars}</span>
          )}
          <span className="ml-auto">{repo.updatedAt}</span>
        </div>

        {/* Metadata editor */}
        {editing && <MetadataEditor repo={repo} />}

        {/* Expanded actions */}
        {expanded && !editing && (
          <div className="mt-3 pt-3 flex flex-wrap gap-2 relative" style={{ borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip tip="Open repo in a new browser tab">
              <Button variant="outline" size="sm" onClick={() => window.open(repo.webUrl, '_blank')}><ExternalLink size={11} /> Open in Browser</Button>
            </Tooltip>
            <Tooltip tip="Clone & open in your local VS Code">
              <Button variant="success" size="sm" onClick={() => openInVSCode(repo.cloneUrl)}><Code2 size={11} /> Open in VS Code</Button>
            </Tooltip>
            {repo.source === 'github' && (
              <Tooltip tip="Edit in the browser via github.dev">
                <Button variant="ghost" size="sm" onClick={() => openInVSCodeWeb(repo.webUrl)}><Globe size={11} /> Edit in Browser</Button>
              </Tooltip>
            )}
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setShowCloneMenu(!showCloneMenu)}><Download size={11} /> Clone</Button>
              {showCloneMenu && <CloneMenu repo={repo} onClose={() => setShowCloneMenu(false)} />}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
