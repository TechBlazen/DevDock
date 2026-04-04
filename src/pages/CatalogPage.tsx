import { useState } from 'react';
import { useSettingsStore, useAuthStore, useWidgetSubmissionStore } from '../store';
import { CORE_WIDGET_CATALOG } from '../components/dashboard/DashboardGrid';
import { usePluginExtensions } from '../lib/plugins';
import { SectionTitle, Button, Card } from '../components/ui';
import { ShieldCheck, CheckCircle2, XCircle, Clock, Layers, Plus, Send, List } from 'lucide-react';
import { WidgetSubmissionForm } from '../components/widgets/WidgetSubmissionForm';
import { PendingApprovalList } from '../components/widgets/PendingApprovalList';
import type { WidgetId, WidgetSubmissionStatus } from '../types';

type Tab = 'catalog' | 'submit' | 'my' | 'pending';

const STATUS_CONFIG: Record<WidgetSubmissionStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending:  { icon: Clock,        color: '#f59e0b', label: 'Pending' },
  approved: { icon: CheckCircle2, color: '#10b981', label: 'Approved' },
  rejected: { icon: XCircle,      color: '#ef4444', label: 'Rejected' },
};

export const CatalogPage = () => {
  const { settings, updateDashboardWidgets } = useSettingsStore();
  const currentUser = useAuthStore((s) => s.user);
  const submissions = useWidgetSubmissionStore((s) => s.submissions);
  const active = settings.dashboardWidgets;
  const { widgetCatalog: pluginWidgets } = usePluginExtensions();
  const isAdmin = currentUser?.role === 'admin';

  const [tab, setTab] = useState<Tab>('catalog');

  // Merge core + plugin + approved user widgets
  const approvedUserWidgets = submissions
    .filter((s) => s.status === 'approved')
    .map((s) => ({
      id: `user_widget_${s.id}` as WidgetId,
      title: s.title,
      icon: s.icon,
      description: s.description,
      defaultSize: s.defaultSize,
    }));
  const allWidgets = [...CORE_WIDGET_CATALOG, ...pluginWidgets, ...approvedUserWidgets];

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const mySubmissions = submissions.filter((s) => s.submittedBy === currentUser?.id);

  const toggle = (id: WidgetId) => {
    if (active.includes(id)) {
      updateDashboardWidgets(active.filter((w) => w !== id));
    } else {
      updateDashboardWidgets([...active, id]);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Layers; count?: number; adminOnly?: boolean }[] = [
    { key: 'catalog', label: 'All Widgets', icon: Layers },
    { key: 'submit', label: 'Submit Widget', icon: Plus },
    { key: 'my', label: 'My Submissions', icon: List, count: mySubmissions.length },
    { key: 'pending', label: 'Pending Approval', icon: Send, count: pendingCount, adminOnly: true },
  ];

  return (
    <div className="p-6" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      <SectionTitle sub="Browse, submit, and manage dashboard widgets">
        Widgets
      </SectionTitle>

      {/* Tabs */}
      <div className="flex mb-6" style={{ borderBottom: '2px solid var(--border-subtle)' }}>
        {tabs.map(({ key, label, icon: Icon, count, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2.5 transition-all relative"
              style={{
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
              {count !== undefined && count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{
                  background: key === 'pending' ? 'rgba(245,158,11,0.15)' : 'var(--bg-inset)',
                  color: key === 'pending' ? '#f59e0b' : 'var(--text-faint)',
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* All Widgets tab */}
      {tab === 'catalog' && (
        <>
          {!isAdmin && (
            <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2" style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
            }}>
              <ShieldCheck size={16} />
              <span className="text-xs font-medium">Only administrators can add or remove widgets. Contact an admin to modify the dashboard.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allWidgets.map((w) => {
              const isActive = active.includes(w.id);
              return (
                <Card key={w.id} highlight={isActive} className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{w.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {w.title}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{w.description}</div>
                    <div className="text-[10px] font-mono mt-1 uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                      size: {w.defaultSize}
                    </div>
                  </div>
                  <Button
                    variant={isActive ? 'danger' : 'outline'}
                    size="sm"
                    onClick={() => toggle(w.id)}
                    disabled={!isAdmin}
                  >
                    {isActive ? 'Remove' : 'Add'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Submit Widget tab */}
      {tab === 'submit' && <WidgetSubmissionForm />}

      {/* My Submissions tab */}
      {tab === 'my' && (
        <div className="space-y-3">
          {mySubmissions.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
              <Plus size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No submissions yet</p>
              <p className="text-xs mt-1">Submit a widget to see it here.</p>
            </div>
          ) : (
            mySubmissions.map((sub) => {
              const cfg = STATUS_CONFIG[sub.status];
              const StatusIcon = cfg.icon;
              return (
                <Card key={sub.id}>
                  <div className="p-4 flex items-center gap-3">
                    <span className="text-xl">{sub.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sub.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub.description}</div>
                      {sub.status === 'rejected' && sub.rejectionReason && (
                        <div className="text-[11px] mt-1 px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                          Reason: {sub.rejectionReason}
                        </div>
                      )}
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                        {sub.content.type} · {sub.defaultSize} · {new Date(sub.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0" style={{
                      background: `${cfg.color}15`,
                      color: cfg.color,
                      border: `1px solid ${cfg.color}30`,
                    }}>
                      <StatusIcon size={10} />
                      {cfg.label}
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Pending Approval tab (admin only) */}
      {tab === 'pending' && isAdmin && <PendingApprovalList />}
    </div>
  );
};
