import {
  forwardRef,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

// Costco-style form primitives. Layout: bold title above a white card, a
// vertical stack of labeled inputs inside, primary filled-blue action
// followed by outlined secondary actions separated by a thin "Or" rule.
// Backed by --form-* tokens in index.css so light and dark themes both work.

// ─── FormTitle ─────────────────────────────────────────────────────────────
export const FormTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h1
    className={clsx('text-[28px] font-bold leading-tight mb-3', className)}
    style={{ color: 'var(--form-title-text)' }}
  >
    {children}
  </h1>
);

// ─── FormCard ──────────────────────────────────────────────────────────────
export const FormCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx('p-6 md:p-7', className)}
    style={{
      background: 'var(--form-card-bg)',
      border: '1px solid var(--form-card-border)',
      borderRadius: 'var(--form-radius)',
      boxShadow: 'var(--form-card-shadow)',
    }}
  >
    {children}
  </div>
);

// ─── FormFieldLabel ────────────────────────────────────────────────────────
export const FormFieldLabel = ({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) => (
  <label
    htmlFor={htmlFor}
    className={clsx('block text-[14px] font-semibold mb-1.5', className)}
    style={{ color: 'var(--form-label-text)' }}
  >
    {children}
  </label>
);

// ─── FormHelpText ──────────────────────────────────────────────────────────
export const FormHelpText = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p
    className={clsx('text-[12px] mt-1', className)}
    style={{ color: 'var(--text-muted)' }}
  >
    {children}
  </p>
);

// ─── FormInput ─────────────────────────────────────────────────────────────
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, invalid, style, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx('w-full px-3 text-[15px] outline-none transition-all', className)}
      style={{
        background: 'var(--form-input-bg)',
        border: `1px solid ${invalid ? '#d13438' : 'var(--form-input-border)'}`,
        borderRadius: 'var(--form-radius)',
        color: 'var(--form-input-text)',
        height: 'var(--form-input-height)',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = `1px solid ${invalid ? '#d13438' : 'var(--form-input-border-focus)'}`;
        e.currentTarget.style.boxShadow = `0 0 0 2px var(--form-input-focus-ring)`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = `1px solid ${invalid ? '#d13438' : 'var(--form-input-border)'}`;
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
      {...props}
    />
  )
);
FormInput.displayName = 'FormInput';

// ─── FormTextarea ──────────────────────────────────────────────────────────
interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, invalid, style, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx('w-full px-3 py-2 text-[15px] outline-none transition-all resize-y', className)}
      style={{
        background: 'var(--form-input-bg)',
        border: `1px solid ${invalid ? '#d13438' : 'var(--form-input-border)'}`,
        borderRadius: 'var(--form-radius)',
        color: 'var(--form-input-text)',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = `1px solid ${invalid ? '#d13438' : 'var(--form-input-border-focus)'}`;
        e.currentTarget.style.boxShadow = `0 0 0 2px var(--form-input-focus-ring)`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = `1px solid ${invalid ? '#d13438' : 'var(--form-input-border)'}`;
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
      {...props}
    />
  )
);
FormTextarea.displayName = 'FormTextarea';

// ─── FormField ─────────────────────────────────────────────────────────────
// Convenience wrapper: label + input/slot + optional help text.
export const FormField = ({
  label,
  htmlFor,
  help,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div className={clsx('w-full', className)}>
    {label && <FormFieldLabel htmlFor={htmlFor}>{label}</FormFieldLabel>}
    {children}
    {help && <FormHelpText>{help}</FormHelpText>}
  </div>
);

// ─── FormPrimaryButton ─────────────────────────────────────────────────────
type ButtonBaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
  children: ReactNode;
};

const buttonBaseStyle = (fullWidth: boolean) => ({
  height: 'var(--form-input-height)',
  padding: '0 20px',
  borderRadius: 'var(--form-radius)',
  fontSize: 15,
  fontWeight: 600,
  width: fullWidth ? '100%' : undefined,
  minWidth: 120,
});

export const FormPrimaryButton = ({
  className,
  fullWidth = true,
  children,
  style,
  ...props
}: ButtonBaseProps) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-2 transition-colors',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className
    )}
    style={{
      ...buttonBaseStyle(fullWidth),
      background: 'var(--form-primary-bg)',
      color: 'var(--form-primary-text)',
      border: '1px solid var(--form-primary-bg)',
      ...style,
    }}
    onMouseEnter={(e) => {
      if (!e.currentTarget.disabled) {
        e.currentTarget.style.background = 'var(--form-primary-bg-hover)';
        e.currentTarget.style.borderColor = 'var(--form-primary-bg-hover)';
      }
      props.onMouseEnter?.(e);
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'var(--form-primary-bg)';
      e.currentTarget.style.borderColor = 'var(--form-primary-bg)';
      props.onMouseLeave?.(e);
    }}
    {...props}
  >
    {children}
  </button>
);

// ─── FormSecondaryButton ───────────────────────────────────────────────────
export const FormSecondaryButton = ({
  className,
  fullWidth = true,
  children,
  style,
  ...props
}: ButtonBaseProps) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-2 transition-colors',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      className
    )}
    style={{
      ...buttonBaseStyle(fullWidth),
      background: 'var(--form-secondary-bg)',
      color: 'var(--form-secondary-text)',
      border: '1px solid var(--form-secondary-border)',
      ...style,
    }}
    onMouseEnter={(e) => {
      if (!e.currentTarget.disabled) {
        e.currentTarget.style.background = 'var(--form-secondary-bg-hover)';
      }
      props.onMouseEnter?.(e);
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'var(--form-secondary-bg)';
      props.onMouseLeave?.(e);
    }}
    {...props}
  >
    {children}
  </button>
);

// ─── FormDivider ───────────────────────────────────────────────────────────
// Horizontal rule. When `label` is provided, the label is centered on the
// rule like "——— Or ———".
export const FormDivider = ({ label, className }: { label?: string; className?: string }) => {
  if (!label) {
    return <hr className={clsx('border-0 my-5', className)} style={{ height: 1, background: 'var(--form-divider)' }} />;
  }
  return (
    <div className={clsx('flex items-center gap-3 my-5', className)}>
      <div className="flex-1 h-px" style={{ background: 'var(--form-divider)' }} />
      <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--form-divider)' }} />
    </div>
  );
};

// ─── FormSection ───────────────────────────────────────────────────────────
// Bold section heading inside a card — mirrors "Need an account?" / "Not a
// Costco member?" in the reference design.
export const FormSection = ({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <div className="text-[15px] font-bold mb-2" style={{ color: 'var(--form-title-text)' }}>{title}</div>
    {children}
  </div>
);
