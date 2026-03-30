import { MessageSquare, Eye, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '../ui';
import { ForumVoteControl } from './ForumVoteControl';
import { ForumTagPill } from './ForumTagPill';
import { ForumReputationBadge } from './ForumReputationBadge';
import { useForumStore } from '../../store/forum-store';
import { useAuthStore } from '../../store';
import { getCategoryColor, getCategoryLabel } from '../../lib/forum-constants';
import { getTier } from '../../lib/forum-constants';
import type { ForumThread } from '../../types';

interface ForumThreadCardProps {
  thread: ForumThread;
  onClick: () => void;
}

export const ForumThreadCard = ({ thread, onClick }: ForumThreadCardProps) => {
  const voteThread = useForumStore((s) => s.voteThread);
  const getReputation = useForumStore((s) => s.getReputation);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const authorRep = getReputation(thread.authorId);
  const bodyExcerpt = thread.body.length > 150 ? thread.body.slice(0, 150) + '...' : thread.body;

  return (
    <Card onClick={onClick} className="p-4">
      <div className="flex gap-4">
        {/* Left: vote control */}
        <ForumVoteControl
          votes={thread.votes}
          onVote={(value) => voteThread(thread.id, userId, value)}
        />

        {/* Center: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3
              className="text-sm font-semibold leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {thread.title}
            </h3>
            {thread.acceptedAnswerId && (
              <CheckCircle
                size={16}
                style={{ color: '#2e7d32', flexShrink: 0, marginTop: 2 }}
              />
            )}
          </div>

          <p
            className="text-[12px] mt-1 line-clamp-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {bodyExcerpt}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <ForumTagPill
              tag={getCategoryLabel(thread.category)}
              color={getCategoryColor(thread.category)}
            />
            {thread.tags.map((tag) => (
              <ForumTagPill key={tag} tag={tag} />
            ))}
          </div>

          {/* Author + time */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {thread.authorName}
            </span>
            <ForumReputationBadge tier={authorRep.tier} points={authorRep.points} size="sm" />
            <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Right: stats */}
        <div className="flex flex-col items-end gap-2 shrink-0" style={{ minWidth: 60 }}>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={13} style={{ color: 'var(--text-faint)' }} />
            <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {thread.answers.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye size={13} style={{ color: 'var(--text-faint)' }} />
            <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {thread.viewCount}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
