import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from './tokens';
import { AdminCard } from './primitives';

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const tones = {
    blue: 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]',
    emerald: 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]',
    violet: 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]',
    amber: 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]',
  };

  return (
    <AdminCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tones[tone])}>
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>
    </AdminCard>
  );
}

export function AdminOverviewCard({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    formatValue?: (value: number) => string;
  }>;
}) {
  return (
    <AdminCard className="overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.08] sm:px-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">{title}</h3>
      </div>
      <div className="admin-overview-grid">
        {items.map(({ label, value, icon: Icon, formatValue }, index) => (
          <div key={label} className="admin-overview-item flex min-w-0 items-center justify-between gap-3 px-4 py-5 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
              <p className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                <AnimatedOverviewValue value={value} formatValue={formatValue} delay={index * 45} />
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]">
              <Icon size={19} strokeWidth={1.8} />
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

function AnimatedOverviewValue({
  value,
  formatValue = (current) => current.toLocaleString(),
  delay,
}: {
  value: number;
  formatValue?: (value: number) => string;
  delay: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || value === 0) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;
    const duration = 850;

    const tick = (time: number) => {
      if (startTime === null) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [delay, value]);

  return <span className="tabular-nums">{formatValue(displayValue)}</span>;
}

export function AdminMetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <AdminCard className="p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
    </AdminCard>
  );
}

export function AdminChartCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard className={cn('p-5', className)}>
      <h3 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
        {icon && <span className="text-[var(--theme-accent)]">{icon}</span>}
        {title}
      </h3>
      {children}
    </AdminCard>
  );
}


export function AdminTableCard({ children }: { children: ReactNode }) {
  return <AdminCard className="overflow-hidden">{children}</AdminCard>;
}


export function AdminBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'violet';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    brand: 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/35 dark:text-amber-300',
    danger: 'bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/35 dark:text-violet-300',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
