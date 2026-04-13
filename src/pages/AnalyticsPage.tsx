import { useState, useMemo } from 'react';
import {
  Eye,
  Users,
  AlertTriangle,
  Activity,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Trash2,
  MessageSquare,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAnalyticsStore, useUserAccountsStore, useAuthStore, useForumStore, useWidgetSubmissionStore } from '../store';
import { SectionTitle, Card, Button, Pill } from '../components/ui';
import { getRoleLabel } from '../lib/rbac';

// ─── Helpers ────────────────────────────────────────────────────────────────

const relative = (ts: string) =>
  formatDistanceToNow(new Date(ts), { addSuffix: true });

const roleBadgeColor: Record<string, string> = {
  admin: '#d32f2f',
  editor: '#ed6c02',
  viewer: '#2e7d32',
};

// ─── KPI Card ───────────────────────────────────────────────────────────────

const KpiCard = ({ icon, iconBg, iconColor, label, value }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: number;
}) => (
  <Card className="flex items-center gap-4 p-5">
    <div style={{ background: iconBg, color: iconColor, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{value.toLocaleString()}</div>
    </div>
  </Card>
);

// ─── Collapsible Section ────────────────────────────────────────────────────

const CollapsibleSection = ({ title, icon, badge, actions, open, onToggle, children }: {
  id: string; title: string; icon?: React.ReactNode; badge?: React.ReactNode; actions?: React.ReactNode;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <Card className="mb-8">
    <div
      style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: open ? '1px solid var(--border-subtle)' : 'none' }}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {open ? <ChevronDown size={16} style={{ color: 'var(--text-faint)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-faint)' }} />}
        {icon}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {badge}
      </button>
      {open && actions}
    </div>
    {open && children}
  </Card>
);

// ─── AnalyticsPage ──────────────────────────────────────────────────────────

export const AnalyticsPage = () => {
  const { pageViews, errors, getVisitsByUser, getVisitsByPage, getVisitsByDay, getActiveUsers, getRecentErrors, clearErrors } = useAnalyticsStore();
  const accounts = useUserAccountsStore((s) => s.accounts);
  const _currentUser = useAuthStore((s) => s.user);
  const getTopContributors = useForumStore((s) => s.getTopContributors);

  const widgetSubmissions = useWidgetSubmissionStore((s) => s.submissions);

  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setCollapsed((s) => ({ ...s, [key]: !s[key] }));
  const isOpen = (key: string) => collapsed[key] === true;

  const topContributors = useMemo(() => getTopContributors(10), [getTopContributors]);

  const uniqueUsers = useMemo(() => new Set(pageViews.map((p) => p.userId)).size, [pageViews]);
  const activeNow = useMemo(() => getActiveUsers(1).length, [pageViews]);
  const visitsByPage = useMemo(() => getVisitsByPage().slice(0, 15), [pageViews]);
  const maxPageCount = useMemo(() => Math.max(1, ...visitsByPage.map((v) => v.count)), [visitsByPage]);

  const activityDays = useMemo(() => {
    const raw = getVisitsByDay();
    const map = new Map(raw.map((d) => [d.date, d.count]));
    const days: { date: string; label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: iso, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: map.get(iso) ?? 0 });
    }
    return days;
  }, [pageViews]);
  const maxDayCount = useMemo(() => Math.max(1, ...activityDays.map((d) => d.count)), [activityDays]);

  const userActivity = useMemo(() => {
    const byUser = getVisitsByUser();
    const userPageMap = new Map<string, Map<string, number>>();
    for (const pv of pageViews) {
      if (!userPageMap.has(pv.userId)) userPageMap.set(pv.userId, new Map());
      const pm = userPageMap.get(pv.userId)!;
      pm.set(pv.path, (pm.get(pv.path) ?? 0) + 1);
    }
    const lastSeenMap = new Map<string, string>();
    for (const pv of pageViews) {
      const cur = lastSeenMap.get(pv.userId);
      if (!cur || pv.timestamp > cur) lastSeenMap.set(pv.userId, pv.timestamp);
    }
    return byUser.map((u) => {
      const pm = userPageMap.get(u.userId);
      let topPage = '-';
      if (pm) { let max = 0; for (const [path, cnt] of pm) { if (cnt > max) { max = cnt; topPage = path; } } }
      const acct = accounts.find((a) => a.id === u.userId);
      return { ...u, role: acct?.role ?? 'viewer', lastSeen: lastSeenMap.get(u.userId) ?? '', topPage };
    });
  }, [pageViews, accounts]);

  const recentErrors = useMemo(() => getRecentErrors(20), [errors]);

  const userSessions = useMemo(() => {
    const visitMap = new Map(getVisitsByUser().map((v) => [v.userId, v.count]));
    return [...accounts].sort((a, b) => (b.lastLogin ?? '').localeCompare(a.lastLogin ?? '')).map((a) => ({ ...a, pageViewCount: visitMap.get(a.id) ?? 0 }));
  }, [accounts, pageViews]);

  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-inset)' };
  const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <SectionTitle sub="Admin overview of user activity and error tracking">Analytics</SectionTitle>

      {/* ── 1. KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard icon={<Eye size={22} />} iconBg="#e3f2fd" iconColor="#1976d2" label="Total Page Views" value={pageViews.length} />
        <KpiCard icon={<Users size={22} />} iconBg="#e8f5e9" iconColor="#2e7d32" label="Unique Users" value={uniqueUsers} />
        <KpiCard icon={<AlertTriangle size={22} />} iconBg="#ffebee" iconColor="#d32f2f" label="Total Errors" value={errors.length} />
        <KpiCard icon={<Activity size={22} />} iconBg="#f3e5f5" iconColor="#7b1fa2" label="Active Now" value={activeNow} />
      </div>

      {/* ── 2. Most Visited Pages ────────────────────────────────────────── */}
      <CollapsibleSection id="pages" title="Most Visited Pages" open={isOpen('pages')} onToggle={() => toggle('pages')}>
        <div className="p-5">
          {visitsByPage.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No page view data yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visitsByPage.map((v) => (
                <div key={v.path} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 120, flexShrink: 0, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.path}>{v.path}</span>
                  <div style={{ flex: 1, height: 20, borderRadius: 4, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                    <div style={{ width: `${(v.count / maxPageCount) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{v.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ── 3. Activity Over Time ────────────────────────────────────────── */}
      <CollapsibleSection id="activity" title="Activity — Last 14 Days" open={isOpen('activity')} onToggle={() => toggle('activity')}>
        <div className="p-5">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, paddingBottom: 24, position: 'relative' }}>
            {activityDays.map((d) => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{d.count > 0 ? d.count : ''}</span>
                <div style={{ width: '100%', maxWidth: 40, height: Math.max(d.count > 0 ? 4 : 0, (d.count / maxDayCount) * 120), background: 'var(--accent)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                <span style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, whiteSpace: 'nowrap' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 4. User Activity ─────────────────────────────────────────────── */}
      <CollapsibleSection id="user-activity" title="User Activity" open={isOpen('user-activity')} onToggle={() => toggle('user-activity')}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>User Name</th>
                <th style={thStyle}>Role</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Visits</th>
                <th style={thStyle}>Last Active</th>
                <th style={thStyle}>Most Visited Page</th>
              </tr>
            </thead>
            <tbody>
              {userActivity.length === 0 ? (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>No user activity recorded.</td></tr>
              ) : (
                userActivity.map((u) => (
                  <tr key={u.userId}>
                    <td style={tdStyle}>{u.userName}</td>
                    <td style={tdStyle}><Pill color={roleBadgeColor[u.role] ?? '#888'}>{getRoleLabel(u.role as any)}</Pill></td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{u.count}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{u.lastSeen ? relative(u.lastSeen) : '-'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{u.topPage}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* ── 5. Community — Top Contributors ──────────────────────────────── */}
      <CollapsibleSection
        id="contributors"
        title="Community — Top Contributors"
        icon={<MessageSquare size={16} style={{ color: 'var(--accent)' }} />}
        open={isOpen('contributors')}
        onToggle={() => toggle('contributors')}
      >
        {topContributors.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No community contributions yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>#</th>
                  <th style={thStyle}>Contributor</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Tier</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Points</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Questions</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Answers</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Accepted</th>
                </tr>
              </thead>
              <tbody>
                {topContributors.map((c, i) => {
                  const tierColors: Record<string, { bg: string; color: string; icon: string }> = {
                    gold: { bg: '#fef3c7', color: '#b45309', icon: '🥇' },
                    silver: { bg: '#f1f5f9', color: '#475569', icon: '🥈' },
                    bronze: { bg: '#fed7aa', color: '#9a3412', icon: '🥉' },
                  };
                  const tier = tierColors[c.tier] ?? tierColors.bronze;
                  return (
                    <tr key={c.userId}>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: i < 3 ? 'var(--accent)' : 'var(--text-faint)' }}>{i + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.displayName} style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                              {c.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontWeight: 600 }}>{c.displayName}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: tier.bg, color: tier.color }}>
                          {tier.icon} {c.tier.charAt(0).toUpperCase() + c.tier.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{c.points.toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}><HelpCircle size={12} style={{ color: 'var(--text-faint)' }} /> {c.questionCount}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}><MessageSquare size={12} style={{ color: 'var(--text-faint)' }} /> {c.answerCount}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981' }}><CheckCircle2 size={12} /> {c.acceptedCount}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ── 6. Widget Contributions ─────────────────────────────────────── */}
      <CollapsibleSection
        id="widgets"
        title="Widget Contributions"
        badge={<span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)' }}>{widgetSubmissions.length} total</span>}
        open={isOpen('widgets')}
        onToggle={() => toggle('widgets')}
      >
        {widgetSubmissions.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No widget submissions yet.</div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 20px' }}>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Pending</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{widgetSubmissions.filter((s) => s.status === 'pending').length}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Approved</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{widgetSubmissions.filter((s) => s.status === 'approved').length}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Rejected</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{widgetSubmissions.filter((s) => s.status === 'rejected').length}</div>
              </div>
            </div>
            {/* Submissions table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Widget</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Submitted By</th>
                    <th style={thStyle}>Submitted</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                    <th style={thStyle}>Reviewed By</th>
                    <th style={thStyle}>Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {widgetSubmissions.map((s) => {
                    const statusColors: Record<string, { bg: string; color: string }> = {
                      pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
                      approved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
                      rejected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
                    };
                    const sc = statusColors[s.status] ?? statusColors.pending;
                    const reviewer = s.reviewedBy ? accounts.find((a) => a.id === s.reviewedBy) : null;
                    return (
                      <tr key={s.id}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{s.icon}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{s.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.description.slice(0, 60)}{s.description.length > 60 ? '...' : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-inset)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.content.type}</span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{s.submittedByName}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{relative(s.submittedAt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: sc.bg, color: sc.color }}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500, color: reviewer ? 'var(--text-primary)' : 'var(--text-faint)' }}>
                          {reviewer?.displayName ?? (s.reviewedBy || '—')}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>
                          {s.reviewedAt ? relative(s.reviewedAt) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ── 7. Error Log ─────────────────────────────────────────────────── */}
      <CollapsibleSection
        id="errors"
        title="Error Log"
        badge={errors.length > 0 ? <span style={{ background: '#ffebee', color: '#d32f2f', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{errors.length}</span> : undefined}
        actions={errors.length > 0 ? <Button variant="danger" size="sm" onClick={clearErrors}><Trash2 size={14} /> Clear Errors</Button> : undefined}
        open={isOpen('errors')}
        onToggle={() => toggle('errors')}
      >
        {recentErrors.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0', color: '#2e7d32', fontSize: 14, fontWeight: 500 }}>
            <CheckCircle size={18} /> No errors recorded
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 28 }} />
                  <th style={thStyle}>Timestamp</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Page</th>
                  <th style={thStyle}>Error Message</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((err) => {
                  const isExpanded = expandedError === err.id;
                  return (
                    <tr key={err.id} style={{ verticalAlign: 'top' }}>
                      <td style={{ ...tdStyle, cursor: err.stack ? 'pointer' : 'default', paddingRight: 0 }}>
                        {err.stack && <span onClick={() => setExpandedError(isExpanded ? null : err.id)}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{relative(err.timestamp)}</td>
                      <td style={tdStyle}>{err.userName}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{err.path}</td>
                      <td style={tdStyle}>
                        <div style={{ color: '#d32f2f', fontSize: 13 }}>{err.message}</div>
                        {isExpanded && err.stack && (
                          <pre style={{ marginTop: 8, padding: 12, borderRadius: 6, background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {err.stack}
                          </pre>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ── 7. User Sessions ─────────────────────────────────────────────── */}
      <CollapsibleSection id="sessions" title="User Sessions" open={isOpen('sessions')} onToggle={() => toggle('sessions')}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Display Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Account Created</th>
                <th style={thStyle}>Last Login</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Page Views</th>
              </tr>
            </thead>
            <tbody>
              {userSessions.map((a) => (
                <tr key={a.id}>
                  <td style={tdStyle}>{a.displayName}</td>
                  <td style={tdStyle}><Pill color={roleBadgeColor[a.role] ?? '#888'}>{getRoleLabel(a.role)}</Pill></td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{relative(a.createdAt)}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{a.lastLogin ? relative(a.lastLogin) : 'Never'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{a.pageViewCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
};
