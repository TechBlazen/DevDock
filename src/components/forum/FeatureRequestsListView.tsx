import { useState } from 'react';
import { Lightbulb, ThumbsUp, Paperclip, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button, SectionTitle, Card } from '../ui';
import { FeatureRequestModal } from './FeatureRequestModal';
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

export const FeatureRequestsListView = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');

  const featureRequests = useForumStore((s) => s.featureRequests);
  const voteFeatureRequest = useForumStore((s) => s.voteFeatureRequest);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  // Filter and sort
  let filtered = [...featureRequests];
  if (statusFilter !== 'all') {
    filtered = filtered.filter((fr) => fr.status === statusFilter);
  }

  if (sortBy === 'votes') {
    filtered.sort((a, b) => {
      const aScore = a.votes.reduce((sum, v) => sum + v.value, 0);
      const bScore = b.votes.reduce((sum, v) => sum + v.value, 0);
      return bScore - aScore;
    });
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return (
    <>
      <SectionTitle sub="Submit ideas and vote on features you'd like to see.">
        Feature Requests
      </SectionTitle>

      {/* Action bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} />
          Submit Feature Request
        </Button>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: statusFilter === 'all' ? 'var(--accent-bg)' : 'transparent',
              color: statusFilter === 'all' ? 'var(--accent)' : 'var(--text-faint)',
              border: 'none',
            }}
          >
            All
          </button>
          {(Object.keys(STATUS_CONFIG) as FeatureRequestStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 cursor-pointer"
                style={{
                  background: active ? `${cfg.color}18` : 'transparent',
                  color: active ? cfg.color : 'var(--text-faint)',
                  border: 'none',
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'votes' | 'newest')}
          className="ml-auto rounded-md px-2.5 py-1.5 text-[12px] outline-none transition-all duration-200 cursor-pointer"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="votes">Most Voted</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Feature requests list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <Lightbulb size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                No feature requests found
              </div>
              <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Try adjusting your filters or submit a new request.
              </div>
            </div>
          </Card>
        ) : (
          filtered.map((fr) => {
            const score = fr.votes.reduce((sum, v) => sum + v.value, 0);
            const userVote = fr.votes.find((v) => v.userId === userId);
            const statusCfg = STATUS_CONFIG[fr.status];

            return (
              <Card key={fr.id}>
                <div className="flex items-start gap-3 p-4">
                  {/* Vote button */}
                  <button
                    onClick={() => voteFeatureRequest(fr.id, userId, 1)}
                    className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-all cursor-pointer flex-shrink-0"
                    style={{
                      background: userVote?.value === 1 ? 'var(--accent-bg)' : 'var(--bg-inset)',
                      border: userVote?.value === 1 ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      color: userVote?.value === 1 ? 'var(--accent)' : 'var(--text-muted)',
                      minWidth: 44,
                    }}
                    title={userVote?.value === 1 ? 'Remove vote' : 'Upvote this request'}
                  >
                    <ThumbsUp size={16} fill={userVote?.value === 1 ? 'currentColor' : 'none'} />
                    <span className="text-xs font-bold tabular-nums">{score}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1.5">
                      <h3 className="text-[15px] font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                        {fr.title}
                      </h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: `${statusCfg.color}15`,
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.color}30`,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <div
                      className="text-[13px] mb-2 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                      dangerouslySetInnerHTML={{
                        __html: fr.description.replace(/^##\s+/gm, '').split('\n\n')[0],
                      }}
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                        {fr.authorName} · {formatDistanceToNow(new Date(fr.createdAt), { addSuffix: true })}
                      </span>
                      {fr.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                          <Paperclip size={10} />
                          {fr.attachments.length}
                        </div>
                      )}
                      {fr.tags.length > 0 && (
                        <div className="flex items-center gap-1 ml-1">
                          {fr.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-md"
                              style={{
                                background: 'var(--bg-inset)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <FeatureRequestModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
