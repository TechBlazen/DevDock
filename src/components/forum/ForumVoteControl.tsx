import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuthStore } from '../../store';
import type { ForumVote } from '../../types';

interface ForumVoteControlProps {
  votes: ForumVote[];
  onVote: (value: 1 | -1) => void;
  label?: string; // e.g. "Rate this answer"
}

export const ForumVoteControl = ({ votes, onVote, label }: ForumVoteControlProps) => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const userVote = votes.find((v) => v.userId === userId);
  const score = votes.reduce((sum, v) => sum + v.value, 0);
  const isPositive = score > 0;
  const isNegative = score < 0;

  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
      {/* Upvote */}
      <button
        onClick={(e) => { e.stopPropagation(); onVote(1); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
        style={{
          color: userVote?.value === 1 ? '#fff' : 'var(--text-muted)',
          background: userVote?.value === 1 ? 'var(--accent)' : 'var(--bg-inset)',
          border: userVote?.value === 1 ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
          transform: userVote?.value === 1 ? 'scale(1.1)' : 'scale(1)',
        }}
        title="Upvote — earns author reputation"
        aria-label="Upvote"
      >
        <ThumbsUp size={15} fill={userVote?.value === 1 ? '#fff' : 'none'} />
      </button>

      {/* Score */}
      <span
        className="text-sm font-bold tabular-nums px-1.5 py-0.5 rounded-md"
        style={{
          color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : 'var(--text-secondary)',
          background: isPositive ? 'rgba(34,197,94,0.1)' : isNegative ? 'rgba(239,68,68,0.1)' : 'var(--bg-inset)',
          minWidth: 28,
          textAlign: 'center',
        }}
      >
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Downvote */}
      <button
        onClick={(e) => { e.stopPropagation(); onVote(-1); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
        style={{
          color: userVote?.value === -1 ? '#fff' : 'var(--text-muted)',
          background: userVote?.value === -1 ? '#ef4444' : 'var(--bg-inset)',
          border: userVote?.value === -1 ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
          transform: userVote?.value === -1 ? 'scale(1.1)' : 'scale(1)',
        }}
        title="Downvote"
        aria-label="Downvote"
      >
        <ThumbsDown size={15} fill={userVote?.value === -1 ? '#fff' : 'none'} />
      </button>

      {/* Label */}
      {label && (
        <span className="text-[9px] mt-0.5 text-center leading-tight" style={{ color: 'var(--text-faint)' }}>
          {label}
        </span>
      )}
    </div>
  );
};
