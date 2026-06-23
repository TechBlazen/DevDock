import { createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, BadgeCheck, Download, ArrowBigUp, ArrowBigDown, Check, Play, ExternalLink } from 'lucide-react';
import { Button, Pill } from '../ui';
import { ForumMarkdownBody } from '../forum/ForumMarkdownBody';
import { getIcon } from '../../lib/icon-registry';
import { useRegistryStore, useAuthStore } from '../../store';
import type { GalleryItem, GalleryKind } from '../../types';

const KIND_COLOR: Record<GalleryKind, string> = { agent: '#2a6fff', skill: '#00b478' };
const KIND_DEFAULT_ICON: Record<GalleryKind, string> = { agent: 'Bot', skill: 'Sparkles' };

interface GalleryDetailDrawerProps {
  item: GalleryItem | null;
  onClose: () => void;
}

export const GalleryDetailDrawer = ({ item, onClose }: GalleryDetailDrawerProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { installItem, uninstallItem, voteItem, isInstalled } = useRegistryStore();
  if (!item) return null;

  const color = KIND_COLOR[item.kind];
  const isRegistry = !!item.registryId;
  const installed = isRegistry ? (item.installed ?? isInstalled(item.registryId!)) : false;
  const myVote = item.votes?.find((v) => v.userId === user?.id)?.value ?? 0;

  const handleTryIt = () => {
    onClose();
    navigate(item.href ?? '/devtools/agent-builder');
  };

  const handleInstall = () => {
    if (!item.registryId) return;
    if (installed) uninstallItem(item.registryId);
    else installItem(item.registryId);
  };

  const handleVote = (value: 1 | -1) => {
    if (item.registryId && user) voteItem(item.registryId, user.id, value);
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', boxShadow: '-8px 0 32px rgba(0,0,0,0.25)' }}
        role="dialog"
        aria-label={`${item.name} details`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}33` }}
          >
            {createElement(getIcon(item.icon ?? KIND_DEFAULT_ICON[item.kind]), { size: 22, style: { color } })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[15px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</h2>
              {item.verified && <BadgeCheck size={15} style={{ color }} aria-label="Verified" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{item.kind}</span>
              {item.category && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{item.category}</span>}
              {item.author && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>· by {item.author}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body (scrolls) */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>

          {/* Popularity */}
          <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {typeof item.score === 'number' && <span className="flex items-center gap-1"><ArrowBigUp size={13} /> {item.score} votes</span>}
            {typeof item.installCount === 'number' && <span className="flex items-center gap-1"><Download size={12} /> {item.installCount} installs</span>}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Tags</div>
              <div className="flex gap-1.5 flex-wrap">
                {item.tags.map((t) => <Pill key={t} color={color}>{t}</Pill>)}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {item.capabilities && item.capabilities.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Capabilities</div>
              <div className="flex gap-1.5 flex-wrap">
                {item.capabilities.map((c) => (
                  <span key={c} className="text-[11px] rounded px-2 py-0.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Compatibility */}
          {item.compatibility && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Compatibility</div>
              <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{item.compatibility}</div>
            </div>
          )}

          {/* SKILL.md content */}
          {item.content && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Definition (SKILL.md)</div>
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <ForumMarkdownBody content={item.content} />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Vote control (registry items only) */}
          {isRegistry ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote(1)}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer"
                style={{ color: myVote === 1 ? color : 'var(--text-faint)' }}
                title="Upvote"
              >
                <ArrowBigUp size={16} />
              </button>
              <span className="text-[12px] font-bold tabular-nums" style={{ minWidth: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {item.score ?? 0}
              </span>
              <button
                onClick={() => handleVote(-1)}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer"
                style={{ color: myVote === -1 ? '#ef4444' : 'var(--text-faint)' }}
                title="Downvote"
              >
                <ArrowBigDown size={16} />
              </button>
            </div>
          ) : <span />}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            {isRegistry ? (
              <Button variant={installed ? 'outline' : 'primary'} size="sm" onClick={handleInstall}>
                {installed ? <><Check size={12} /> Installed</> : <><Download size={12} /> Install</>}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleTryIt}>
                {item.href === '/scaffold' ? <><Play size={12} /> Open in Scaffold</> : <><ExternalLink size={12} /> Open in Builder</>}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
