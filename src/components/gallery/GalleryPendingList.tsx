import { useState, createElement } from 'react';
import { Clock, Check, X, BadgeCheck } from 'lucide-react';
import { Button, Pill, EmptyState } from '../ui';
import { getIcon } from '../../lib/icon-registry';
import { useRegistryStore } from '../../store';
import type { RegistryItem } from '../../types';

const KIND_COLOR: Record<string, string> = { agent: '#2a6fff', skill: '#00b478' };

// Admin approval queue. Lists pending submissions with approve (optionally
// marking official/verified) and reject (with a reason) actions.
export const GalleryPendingList = () => {
  const items = useRegistryStore((s) => s.items);
  const { approveItem, rejectItem } = useRegistryStore();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const pending = items.filter((i) => i.status === 'pending');

  if (pending.length === 0) {
    return <EmptyState icon={<Clock />} title="No pending submissions" body="Agent and skill submissions awaiting review will appear here." />;
  }

  return (
    <div className="space-y-3">
      {pending.map((item: RegistryItem) => {
        const color = KIND_COLOR[item.kind] ?? '#2a6fff';
        const Icon = getIcon(item.kind === 'skill' ? 'Sparkles' : 'Bot');
        const isRejecting = rejectingId === item.id;
        return (
          <div key={item.id} className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
                {createElement(Icon, { size: 18, style: { color } })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{item.kind}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>by {item.authorName}</span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                {item.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">{item.tags.map((t) => <Pill key={t} color={color}>{t}</Pill>)}</div>
                )}
              </div>
            </div>

            {isRejecting ? (
              <div className="flex items-center gap-2 mt-3">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for rejection…"
                  className="flex-1 text-[12px] px-3 py-1.5 rounded-lg outline-none"
                  style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <Button variant="danger" size="sm" onClick={() => { rejectItem(item.id, reason); setRejectingId(null); setReason(''); }} disabled={!reason.trim()}>
                  Confirm reject
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={() => setRejectingId(item.id)}>
                  <X size={12} /> Reject
                </Button>
                <Button variant="outline" size="sm" onClick={() => approveItem(item.id, { verified: true, source: 'official' })}>
                  <BadgeCheck size={12} /> Approve as official
                </Button>
                <Button variant="primary" size="sm" onClick={() => approveItem(item.id)}>
                  <Check size={12} /> Approve
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
