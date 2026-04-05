import { Lightbulb, ThumbsUp, Paperclip, ChevronRight, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../ui';
import { useForumStore } from '../../store/forum-store';
import { useAuthStore } from '../../store';
import type { FeatureRequestStatus } from '../../types';

const STATUS_CONFIG: Record<FeatureRequestStatus, { label: string; color: string }> = {
  open:          { label: 'Open',        color: '#3b82f6' },
  planned:       { label: 'Planned',     color: '#a855f7' },
  'in-progress': { label: 'In Progress', color: '#f59e0b' },
  completed:     { label: 'Completed',   color: '#22c55e' },
  declined:      { label: 'Declined',    color: '#6b7280' },
};

interface ForumTopFeatureRequestsProps {
  onSubmitClick: () => void;
}

export const ForumTopFeatureRequests = ({ onSubmitClick }: ForumTopFeatureRequestsProps) => {
  const navigate = useNavigate();
  const getTopFeatureRequests = useForumStore((s) => s.getTopFeatureRequests);
  const voteFeatureRequest = useForumStore((s) => s.voteFeatureRequest);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const topRequests = getTopFeatureRequests(5);

  return (
    <Card>
      <CardHeader>
        <Lightbulb size={15} style={{ color: '#f59e0b' }} />
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Top Feature Requests
        </span>
      </CardHeader>

      <div className="flex flex-col" style={{ padding: '8px 0' }}>
        {topRequests.map((fr, i) => {
          const score = fr.votes.reduce((sum, v) => sum + v.value, 0);
          const userVote = fr.votes.find((v) => v.userId === userId);
          const statusCfg = STATUS_CONFIG[fr.status];

          return (
            <div
              key={fr.id}
              className="flex items-start gap-2.5"
              style={{ padding: '12px 20px 12px 16px', borderBottom: i < topRequests.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
            >
              {/* Vote button */}
              <button
                onClick={() => voteFeatureRequest(fr.id, userId, 1)}
                className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition-all cursor-pointer flex-shrink-0"
                style={{
                  background: userVote?.value === 1 ? 'var(--accent-bg)' : 'var(--bg-inset)',
                  border: userVote?.value === 1 ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  color: userVote?.value === 1 ? 'var(--accent)' : 'var(--text-muted)',
                  minWidth: 36,
                }}
                title={userVote?.value === 1 ? 'Remove vote' : 'Upvote this request'}
              >
                <ThumbsUp size={12} fill={userVote?.value === 1 ? 'currentColor' : 'none'} />
                <span className="text-[10px] font-bold tabular-nums">{score}</span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {fr.title}
                  </span>
                  {fr.attachments.length > 0 && (
                    <Paperclip size={10} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${statusCfg.color}15`, color: statusCfg.color, border: `1px solid ${statusCfg.color}30` }}
                  >
                    {statusCfg.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {fr.authorName} · {formatDistanceToNow(new Date(fr.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onSubmitClick}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer"
          style={{
            background: 'rgba(245,158,11,0.08)',
            color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; }}
        >
          <Lightbulb size={13} />
          Submit a Feature Request
          <ChevronRight size={12} />
        </button>
        <button
          onClick={() => navigate('/forum/feature-requests')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-inset)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          View All
          <ArrowRight size={11} />
        </button>
      </div>
    </Card>
  );
};
