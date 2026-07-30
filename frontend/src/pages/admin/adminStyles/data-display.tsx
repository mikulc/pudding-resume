import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
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
    blue: 'bg-[#EEF4FF] text-[#2454FF]',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
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
        {icon && <span className="text-[#2454FF]">{icon}</span>}
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
    brand: 'bg-[#EEF4FF] text-[#2454FF] dark:bg-blue-950/35 dark:text-blue-300',
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
