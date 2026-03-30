import { Star } from 'lucide-react';
import { Tooltip } from '../ui';
import { REPUTATION_TIERS } from '../../lib/forum-constants';
import type { ReputationTier } from '../../types';

interface ForumReputationBadgeProps {
  tier: ReputationTier;
  points: number;
  size?: 'sm' | 'md';
}

export const ForumReputationBadge = ({ tier, points, size = 'sm' }: ForumReputationBadgeProps) => {
  const tierInfo = REPUTATION_TIERS[tier];
  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <Tooltip tip={`${tierInfo.label} (${points} pts)`}>
      <span className="inline-flex items-center gap-0.5">
        <Star size={iconSize} style={{ color: tierInfo.color, fill: tierInfo.color }} />
      </span>
    </Tooltip>
  );
};
