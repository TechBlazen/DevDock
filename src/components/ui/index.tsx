import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

// ─── Colors ──────────────────────────────────────────────────────────────────
const BLUE = '#005DAA';

// ─── StatusDot ────────────────────────────────────────────────────────────────
type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

const statusColors: Record<StatusColor, string> = {
  green: '#2e7d32',
  yellow: '#ed6c02',
  red: '#d32f2f',
  blue: BLUE,
  gray: '#9e9e9e',
};

export const StatusDot = ({ color = 'green', pulse = false }: { color?: StatusColor; pulse?: boolean }) => (
  <span
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: statusColors[color],
      animation: pulse ? 'forge-pulse 2s infinite' : undefined,
      flexShrink: 0,
    }}
  />
);

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'running' | 'idle' | 'stopped' | 'error' | 'ok' | 'private' | 'public';

const badgeMap: Record<BadgeVariant, { color: string; label: string }> = {
  running: { color: '#2e7d32', label: 'running' },
  idle:    { color: '#ed6c02', label: 'idle' },
  stopped: { color: '#d32f2f', label: 'stopped' },
  error:   { color: '#d32f2f', label: 'error' },
  ok:      { color: '#2e7d32', label: 'ok' },
  private: { color: '#ed6c02', label: 'private' },
  public:  { color: BLUE, label: 'public' },
};

export const Badge = ({ variant }: { variant: BadgeVariant }) => {
  const { color, label } = badgeMap[variant] ?? badgeMap.idle;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color, fontWeight: 500 }}>
      <StatusDot color={color === '#2e7d32' ? 'green' : color === '#ed6c02' ? 'yellow' : color === '#d32f2f' ? 'red' : 'blue'} />
      {label}
    </span>
  );
};

// ─── Pill ─────────────────────────────────────────────────────────────────────
export const Pill = ({ children, color = BLUE }: { children: ReactNode; color?: string }) => (
  <span
    style={{
      background: `${color}14`,
      color,
      border: `1px solid ${color}30`,
      borderRadius: 4,
      padding: '1px 8px',
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const getVariantStyle = (variant: NonNullable<ButtonProps['variant']>) => {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent)',
        color: '#ffffff',
        border: '1px solid var(--accent)',
        boxShadow: 'var(--shadow-sm)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
      };
    case 'danger':
      return {
        background: 'var(--bg-surface)',
        color: '#d32f2f',
        border: '1px solid #ffcdd2',
      };
    case 'success':
      return {
        background: 'var(--bg-surface)',
        color: '#2e7d32',
        border: '1px solid #c8e6c9',
      };
    case 'outline':
      return {
        background: 'var(--bg-surface)',
        color: 'var(--accent)',
        border: '1px solid var(--accent)',
      };
  }
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-5 py-2 text-[12px]',
  md: 'px-7 py-2.5 text-[13px]',
  lg: 'px-9 py-3.5 text-sm',
};

export const Button = ({ variant = 'ghost', size = 'md', className, children, ...props }: ButtonProps) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
      'transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
      'hover:opacity-90 active:scale-[0.97]',
      sizeStyles[size],
      className
    )}
    style={getVariantStyle(variant)}
    {...props}
  >
    {children}
  </button>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({
  children,
  className,
  highlight = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={clsx(
      'rounded-xl transition-all duration-200',
      onClick && 'cursor-pointer hover:shadow-lg',
      className
    )}
    style={{
      background: 'var(--bg-surface)',
      border: highlight ? '2px solid var(--accent)' : '1px solid var(--border-color)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    }}
  >
    {children}
  </div>
);

// ─── CardHeader ───────────────────────────────────────────────────────────────
export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('flex items-center gap-2 py-3 rounded-t-lg', className)} style={{ paddingLeft: 24, paddingRight: 20,
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-inset)',
  }}>
    {children}
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className, ...props }: InputProps) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
    )}
    <input
      className={clsx(
        'w-full rounded-md px-3 py-2 text-[13px] outline-none transition-all duration-200',
        className
      )}
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-input)',
        color: 'var(--text-primary)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = '1px solid var(--accent)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = '1px solid var(--border-input)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...props}
    />
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────
export const Toggle = ({
  checked,
  onChange,
  label,
  color = BLUE,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  color?: string;
  disabled?: boolean;
}) => (
  <div 
    className={`flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} 
    onClick={() => !disabled && onChange(!checked)}
  >
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? color : 'var(--border-input)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--bg-surface)',
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          transition: 'left 0.2s',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </div>
    {label && <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{label}</span>}
  </div>
);

// ─── Tooltip ─────────────────────────────────────────────────────────────────
export const Tooltip = ({ children, tip }: { children: ReactNode; tip: string }) => (
  <div className="relative group inline-flex">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{
      background: 'var(--text-primary)',
      color: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-md)',
    }}>
      {tip}
    </div>
  </div>
);

// ─── Spinner ─────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 16 }: { size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      border: '2px solid var(--border-color)',
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'forge-spin 0.7s linear infinite',
      flexShrink: 0,
    }}
  />
);

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export const SectionTitle = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div className="mb-6">
    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{children}</h1>
    {sub && <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </div>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, body }: { icon?: ReactNode; title: string; body?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    {icon && <div className="text-4xl" style={{ color: 'var(--text-faint)' }}>{icon}</div>}
    <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{title}</div>
    {body && <div className="text-[13px] max-w-xs" style={{ color: 'var(--text-muted)' }}>{body}</div>}
  </div>
);
