import { Card, CardHeader } from '../ui';
import { ForumReputationBadge } from './ForumReputationBadge';
import { useForumStore } from '../../store/forum-store';
import { Trophy } from 'lucide-react';

export const ForumTopContributors = () => {
  const getTopContributors = useForumStore((s) => s.getTopContributors);
  const contributors = getTopContributors(10);

  return (
    <Card>
      <CardHeader>
        <Trophy size={15} style={{ color: 'var(--accent)' }} />
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Top Contributors
        </span>
      </CardHeader>

      <div className="flex flex-col" style={{ padding: '8px 0' }}>
        {contributors.map((c, i) => {
          const initials = c.displayName
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={c.userId}
              className="flex items-center gap-2.5"
              style={{
                padding: '10px 20px 10px 16px',
                borderBottom: i < contributors.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              {/* Avatar */}
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt={c.displayName}
                  className="rounded-full shrink-0"
                  style={{ width: 28, height: 28 }}
                />
              ) : (
                <div
                  className="rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                  style={{
                    width: 28,
                    height: 28,
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                  }}
                >
                  {initials}
                </div>
              )}

              {/* Name + badge */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-[12px] font-medium truncate block"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {c.displayName}
                </span>
              </div>

              <ForumReputationBadge tier={c.tier} points={c.points} size="sm" />

              <span
                className="text-[11px] tabular-nums font-medium shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                {c.points}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
