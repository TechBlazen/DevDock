type SortOption = 'newest' | 'votes' | 'unanswered';

interface ForumSortBarProps {
  value: SortOption;
  onChange: (v: SortOption) => void;
}

const options: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'votes', label: 'Top Votes' },
  { value: 'unanswered', label: 'Unanswered' },
];

export const ForumSortBar = ({ value, onChange }: ForumSortBarProps) => (
  <div className="flex items-center gap-1">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: active ? 'var(--accent-bg)' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
