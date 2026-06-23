import { useMemo } from 'react';
import { Bot, Sparkles, BadgeCheck } from 'lucide-react';
import { SectionTitle } from '../components/ui';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { useGalleryItems } from '../lib/gallery-adapters';

// Agent & Skill Gallery (Phase 0) — a read-only showcase aggregated from
// scaffold agents, Agent Builder items, and a curated seed. Phase 1 swaps the
// data source for a server-backed registry (submit → approve → publish).

const SummaryChip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
    <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
    <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
  </div>
);

export const AgentGalleryPage = () => {
  const items = useGalleryItems();

  const counts = useMemo(() => ({
    agents: items.filter((i) => i.kind === 'agent').length,
    skills: items.filter((i) => i.kind === 'skill').length,
    verified: items.filter((i) => i.verified).length,
  }), [items]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionTitle sub="Discover, preview, and reuse agents and skills across your team">
          Agent & Skill Gallery
        </SectionTitle>
        <div className="flex items-center gap-2">
          <SummaryChip icon={<Bot size={14} />} label="Agents" value={counts.agents} />
          <SummaryChip icon={<Sparkles size={14} />} label="Skills" value={counts.skills} />
          <SummaryChip icon={<BadgeCheck size={14} />} label="Verified" value={counts.verified} />
        </div>
      </div>

      <GalleryGrid items={items} />
    </div>
  );
};
