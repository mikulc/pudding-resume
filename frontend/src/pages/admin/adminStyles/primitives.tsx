import type { ButtonHTMLAttributes,ReactNode } from 'react';
import { adminCardClass,cn } from './tokens';

export function AdminPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-6 pb-8', className)}>{children}</div>;
}


export function AdminPageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[26px]">
            {title}
          </h2>
          {meta}
        </div>
        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}


export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(adminCardClass, className)}>{children}</div>;
}


export function AdminButton({
  variant = 'secondary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const variants = {
    primary:
      'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)] shadow-sm hover:opacity-90 disabled:bg-slate-300 disabled:text-white',
    secondary:
      'border border-[#E6EAF2] bg-white text-slate-600 hover:border-[#D8E0EE] hover:bg-[#F8FAFF] hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
    ghost:
      'text-slate-500 hover:bg-[#F8FAFF] hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    danger:
      'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/35 dark:text-red-300 dark:hover:bg-red-950/55',
  };

  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}


export function AdminIconButton({
  tone = 'neutral',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800',
    brand: 'text-slate-400 hover:bg-[var(--theme-accent-soft)] hover:text-[var(--theme-accent)] dark:hover:bg-[var(--theme-accent-soft)]',
    success: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/35',
    warning: 'text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/35',
    danger: 'text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/35',
  };

  return (
    <button
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors duration-200',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
