interface ForumTagPillProps {
  tag: string;
  color?: string;
}

export const ForumTagPill = ({ tag, color }: ForumTagPillProps) => (
  <span
    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
    style={{
      color: color ?? 'var(--text-muted)',
      background: `${color ?? 'var(--text-muted)'}14`,
      border: `1px solid ${color ?? 'var(--text-muted)'}30`,
    }}
  >
    {tag}
  </span>
);
