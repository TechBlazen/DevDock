import { ChevronUp, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store';
import type { ForumVote } from '../../types';

interface ForumVoteControlProps {
  votes: ForumVote[];
  onVote: (value: 1 | -1) => void;
}

export const ForumVoteControl = ({ votes, onVote }: ForumVoteControlProps) => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const userVote = votes.find((v) => v.userId === userId);
  const score = votes.reduce((sum, v) => sum + v.value, 0);

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 40 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onVote(1); }}
        className="p-0.5 rounded transition-colors hover:opacity-80 cursor-pointer"
        style={{
          color: userVote?.value === 1 ? 'var(--accent)' : 'var(--text-faint)',
          background: 'transparent',
          border: 'none',
        }}
        aria-label="Upvote"
      >
        <ChevronUp size={20} />
      </button>

      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: 'var(--text-primary)' }}
      >
        {score}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onVote(-1); }}
        className="p-0.5 rounded transition-colors hover:opacity-80 cursor-pointer"
        style={{
          color: userVote?.value === -1 ? '#d32f2f' : 'var(--text-faint)',
          background: 'transparent',
          border: 'none',
        }}
        aria-label="Downvote"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
};
