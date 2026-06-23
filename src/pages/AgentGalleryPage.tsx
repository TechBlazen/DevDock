import { useEffect, useMemo, useState } from 'react';
import { Bot, Sparkles, BadgeCheck, LayoutGrid, Send, ShieldCheck } from 'lucide-react';
import { SectionTitle } from '../components/ui';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { GallerySubmitForm } from '../components/gallery/GallerySubmitForm';
import { GalleryPendingList } from '../components/gallery/GalleryPendingList';
import { useGalleryItems } from '../lib/gallery-adapters';
import { useRegistryStore, useAuthStore } from '../store';
import { ROLE_PERMISSIONS } from '../lib/rbac';
import type { UserRole } from '../types';

// Agent & Skill Gallery (Phase 1) — a server-backed showcase with a submit →
// approve → publish governance flow. The Browse grid still aggregates scaffold
// agents and local Builder drafts alongside the registry, so nothing from
// Phase 0 disappears.

type Tab = 'browse' | 'submit' | 'pending';

const SummaryChip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
    <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
    <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
  </div>
);

export const AgentGalleryPage = () => {
  const items = useGalleryItems();
  const registryItems = useRegistryStore((s) => s.items);
  const loadItems = useRegistryStore((s) => s.loadItems);
  const loadInstalls = useRegistryStore((s) => s.loadInstalls);
  const role = (useAuthStore((s) => s.user?.role) ?? 'viewer') as UserRole;
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;

  const [tab, setTab] = useState<Tab>('browse');

  // Hydrate the registry from the API on mount (best-effort; the grid falls
  // back to the static seed + client sources when the API is unreachable).
  useEffect(() => {
    loadItems();
    loadInstalls();
  }, [loadItems, loadInstalls]);

  const counts = useMemo(() => ({
    agents: items.filter((i) => i.kind === 'agent' && (!i.status || i.status === 'approved')).length,
    skills: items.filter((i) => i.kind === 'skill' && (!i.status || i.status === 'approved')).length,
    verified: items.filter((i) => i.verified && (!i.status || i.status === 'approved')).length,
  }), [items]);

  const pendingCount = registryItems.filter((i) => i.status === 'pending').length;

  const tabs: { key: Tab; label: string; icon: typeof LayoutGrid; show: boolean; badge?: number }[] = [
    { key: 'browse', label: 'Browse', icon: LayoutGrid, show: true },
    { key: 'submit', label: 'Submit', icon: Send, show: perms.canSubmitRegistry },
    { key: 'pending', label: 'Pending', icon: ShieldCheck, show: perms.canApproveRegistry, badge: pendingCount },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionTitle sub="Discover, preview, and reuse agents and skills across your team">
          Agent &amp; Skill Gallery
        </SectionTitle>
        <div className="flex items-center gap-2">
          <SummaryChip icon={<Bot size={14} />} label="Agents" value={counts.agents} />
          <SummaryChip icon={<Sparkles size={14} />} label="Skills" value={counts.skills} />
          <SummaryChip icon={<BadgeCheck size={14} />} label="Verified" value={counts.verified} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3" style={{ borderBottom: '2px solid var(--border-subtle)' }}>
        {tabs.filter((t) => t.show).map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 font-semibold px-4 py-2.5 text-[13px]"
            style={{
              color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            <Icon size={14} /> {label}
            {badge ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#f59e0b22', color: '#b45309' }}>{badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'browse' && <GalleryGrid items={items} />}
      {tab === 'submit' && perms.canSubmitRegistry && <GallerySubmitForm onDone={() => loadItems()} />}
      {tab === 'pending' && perms.canApproveRegistry && <GalleryPendingList />}
    </div>
  );
};
