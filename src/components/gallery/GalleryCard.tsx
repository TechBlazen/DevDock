import { createElement } from 'react';
import { BadgeCheck, Download, ArrowBigUp } from 'lucide-react';
import { Card, Pill } from '../ui';
import { getIcon } from '../../lib/icon-registry';
import type { GalleryItem, GalleryKind, GallerySource } from '../../types';

// Accent per kind so agents vs skills read at a glance.
const KIND_COLOR: Record<GalleryKind, string> = {
  agent: '#2a6fff',
  skill: '#00b478',
};

const KIND_DEFAULT_ICON: Record<GalleryKind, string> = {
  agent: 'Bot',
  skill: 'Sparkles',
};

const SOURCE_LABEL: Record<GallerySource, string> = {
  official: 'Official',
  org: 'Org',
  mine: 'Mine',
  community: 'Community',
};

interface GalleryCardProps {
  item: GalleryItem;
  onSelect: (item: GalleryItem) => void;
}

export const GalleryCard = ({ item, onSelect }: GalleryCardProps) => {
  const color = KIND_COLOR[item.kind];

  return (
    <Card onClick={() => onSelect(item)}>
      <div className="p-5 flex flex-col gap-3 cursor-pointer group h-full">
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
            style={{ background: `${color}18`, border: `1px solid ${color}33`, boxShadow: `0 4px 16px ${color}20` }}
          >
            {createElement(getIcon(item.icon ?? KIND_DEFAULT_ICON[item.kind]), { size: 20, style: { color } })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {item.name}
              </span>
              {item.verified && <BadgeCheck size={13} style={{ color }} aria-label="Verified" />}
            </div>
            <div className="text-[11px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {item.description}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {item.tags.slice(0, 4).map((tag) => (
            <Pill key={tag} color={color}>{tag}</Pill>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5" style={{ color: 'var(--text-faint)' }}>
              +{item.tags.length - 4}
            </span>
          )}
        </div>

        {/* Footer: kind/source + popularity */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${color}15`, color }}
            >
              {item.kind}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              {SOURCE_LABEL[item.source]}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
            {typeof item.score === 'number' && (
              <span className="flex items-center gap-0.5"><ArrowBigUp size={11} /> {item.score}</span>
            )}
            {typeof item.installCount === 'number' && (
              <span className="flex items-center gap-0.5"><Download size={10} /> {item.installCount}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
