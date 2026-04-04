import type { ForumCategory, ForumDepartment, ForumTechnology, ReputationTier } from '../types';

export const FORUM_CATEGORIES: { value: ForumCategory; label: string; color: string }[] = [
  { value: 'bug',        label: 'Bug',        color: '#d32f2f' },
  { value: 'question',   label: 'Question',   color: '#005DAA' },
  { value: 'discussion', label: 'Discussion', color: '#2e7d32' },
  { value: 'how-to',     label: 'How-To',     color: '#ed6c02' },
];

export const DEPARTMENTS: ForumDepartment[] = ['Engineering', 'DevOps', 'Platform', 'Security', 'Data'];

export const TECHNOLOGIES: ForumTechnology[] = [
  'React', 'TypeScript', 'Python', 'Go', 'Rust', 'Java',
  'Kubernetes', 'Terraform', 'Docker', 'AWS', 'Azure', 'GCP',
  'PostgreSQL', 'Redis', 'GraphQL', 'Node.js', 'CI/CD', 'Monitoring',
];

export const REPUTATION_TIERS: Record<ReputationTier, { min: number; color: string; label: string }> = {
  bronze: { min: 0,   color: '#CD7F32', label: 'Bronze' },
  silver: { min: 100, color: '#C0C0C0', label: 'Silver' },
  gold:   { min: 500, color: '#FFD700', label: 'Gold' },
};

export function getTier(points: number): ReputationTier {
  if (points >= 500) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
}

export function getCategoryColor(category: ForumCategory): string {
  return FORUM_CATEGORIES.find((c) => c.value === category)?.color ?? 'var(--text-muted)';
}

export function getCategoryLabel(category: ForumCategory): string {
  return FORUM_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}
