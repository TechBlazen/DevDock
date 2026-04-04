import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { Card, Button, Input } from '../ui';
import { useWidgetSubmissionStore, useAuthStore } from '../../store';

export const PendingApprovalList = () => {
  const submissions = useWidgetSubmissionStore((s) => s.submissions);
  const approveSubmission = useWidgetSubmissionStore((s) => s.approveSubmission);
  const rejectSubmission = useWidgetSubmissionStore((s) => s.rejectSubmission);
  const user = useAuthStore((s) => s.user);

  const pending = submissions.filter((s) => s.status === 'pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (pending.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-faint)' }}>
        <CheckCircle2 size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No pending submissions</p>
        <p className="text-xs mt-1">All widget submissions have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((sub) => (
        <Card key={sub.id}>
          <div className="p-5" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{sub.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sub.title}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub.description}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0" style={{
                background: 'rgba(245,158,11,0.1)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                <Clock size={10} className="inline mr-1" />Pending
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 mb-3 text-[11px]" style={{ color: 'var(--text-faint)' }}>
              <span className="flex items-center gap-1">
                <User size={10} /> {sub.submittedByName}
              </span>
              <span>Size: {sub.defaultSize.toUpperCase()}</span>
              <span>Type: {sub.content.type}</span>
              <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
            </div>

            {/* Content preview */}
            <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              {sub.content.type === 'markdown' && (
                <pre className="whitespace-pre-wrap font-mono text-[11px] max-h-[120px] overflow-auto">{sub.content.markdown?.slice(0, 500)}</pre>
              )}
              {sub.content.type === 'iframe' && (
                <span>Embed URL: <code style={{ color: 'var(--accent)' }}>{sub.content.url}</code> (height: {sub.content.iframeHeight ?? 300}px)</span>
              )}
              {sub.content.type === 'link' && (
                <span>Link: <code style={{ color: 'var(--accent)' }}>{sub.content.url}</code></span>
              )}
            </div>

            {/* Actions */}
            {rejectingId === sub.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (user) rejectSubmission(sub.id, user.id, rejectReason);
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  Confirm
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => { if (user) approveSubmission(sub.id, user.id); }}>
                  <CheckCircle2 size={13} /> Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => setRejectingId(sub.id)}>
                  <XCircle size={13} /> Reject
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
