import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  MouseEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DatePicker } from '../../components/editor/DatePicker';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const adminTokens = {
  brand: '#2248FF',
  brandHover: '#1D3FE8',
  brandText: '#2454FF',
  brandSoft: '#EEF4FF',
  pageBg: '#F5F7FB',
  border: '#E6EAF2',
  title: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  subtle: '#94A3B8',
  hover: '#F8FAFF',
  chartGrid: '#E6EAF2',
  chartAxis: '#94A3B8',
  chartBlue: '#2248FF',
  chartBlueSoft: '#5B78FF',
  chartPurpleSoft: '#8B7CFF',
  chartBar: '#6B84FF',
};

export const adminCardClass =
  'rounded-2xl border border-[#E9EDF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_18px_rgba(16,24,40,0.04)] transition-[transform,box-shadow] duration-200 dark:border-slate-800 dark:bg-slate-900';

export const adminInputClass =
  'h-10 w-full min-w-0 rounded-xl border border-[#E6EAF0] bg-white px-3 text-sm text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.02)] transition-[border-color,box-shadow] duration-200 placeholder:text-[#98A2B3] focus:border-[#3272FF]/60 focus:outline-none focus:ring-[3px] focus:ring-[#3272FF]/[0.08] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400';

export const adminTableHeadClass =
  'bg-[#F8FAFC] text-xs font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400';

export const adminTableRowClass =
  'transition-colors hover:bg-[#F8FAFF] dark:hover:bg-slate-800/40';

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
          <h2 className="text-[30px] font-bold leading-tight tracking-[-0.025em] text-slate-900 dark:text-white sm:text-[32px]">
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
      'bg-[#2248FF] text-white shadow-sm hover:bg-[#1D3FE8] disabled:bg-slate-300 disabled:text-white',
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
    brand: 'text-slate-400 hover:bg-blue-50 hover:text-[#2454FF] dark:hover:bg-blue-950/35',
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

export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(adminInputClass, className)} {...props} />;
}

export interface AdminSelectOption {
  value: string;
  label: string;
}

export function AdminSelect({ value, onChange, options, className, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismissibleLayer({ open, refs: [rootRef], onDismiss: () => setOpen(false) });
  const selected = options.find(option => option.value === value) ?? options[0];

  return (
    <div ref={rootRef} className={cn('relative min-w-[152px]', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-[14px] border border-[#E6EAF0] bg-white px-3.5 text-left text-sm text-slate-700',
          'shadow-[0_1px_2px_rgba(16,24,40,0.02)] transition-[border-color,box-shadow] duration-200',
          'placeholder:text-[#98A2B3]',
          'focus:border-[rgba(59,130,246,0.45)] focus:outline-none focus:ring-[3px] focus:ring-[rgba(59,130,246,0.10)]',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400',
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-[16px] border border-[rgba(148,163,184,0.18)] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] animate-[adminDropdownIn_180ms_ease-out] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-1.5">
            {options.map(option => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    'flex min-h-[42px] w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-[rgba(59,130,246,0.12)] font-medium text-[#2563eb]'
                      : 'text-slate-600 hover:bg-[rgba(59,130,246,0.08)] dark:text-slate-300 dark:hover:bg-white/8',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {active && <Check size={15} className="shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminMonthPicker({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className={cn('w-[176px] admin-date-picker', className)}>
      <DatePicker value={value.replace('-', '.')} onChange={next => onChange(next.replace('.', '-'))} placeholder="yyyy.MM" />
    </div>
  );
}

export function AdminDatePicker({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className={cn('admin-date-picker w-full min-w-0', className)}>
      <DatePicker value={value} onChange={onChange} placeholder="yyyy-MM-dd" mode="date" />
    </div>
  );
}

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

export function AdminModal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.34)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* Content */}
      <AdminModalShell className={cn('relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[adminModalIn_200ms_ease-out]', className)} onClick={event => event.stopPropagation()}>
        {children}
      </AdminModalShell>
    </div>,
    document.body,
  );
}

export function AdminModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      <AdminIconButton onClick={onClose} aria-label="Close"><X size={18} /></AdminIconButton>
    </div>
  );
}

export function AdminField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
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

export function AdminModalShell({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-[#E6EAF2] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── AdminSwitch ──
export function AdminSwitch({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3272FF]/[0.12]',
        checked
          ? 'bg-[#2248FF]'
          : 'bg-slate-200 dark:bg-slate-700',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}

// ── AdminFormModal (desktop: centered dialog with fixed header/footer) ──
export function AdminFormModal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.30)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full animate-[adminModalIn_200ms_ease-out]',
          'flex flex-col overflow-hidden',
          'rounded-[20px] border border-[rgba(31,45,61,0.08)] bg-white',
          'shadow-[0_24px_70px_rgba(15,23,42,0.16)]',
          'dark:border-slate-800 dark:bg-slate-900',
          className,
        )}
        style={{
          width: 'min(560px, calc(100vw - 40px))',
          maxHeight: 'min(760px, calc(100dvh - 48px))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function AdminFormModalHeader({
  title,
  onClose,
  showCloseButton = true,
}: {
  title: string;
  onClose: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between px-[22px] pt-[20px] pb-[16px]">
        <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">
          {title}
        </h3>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-slate-400',
              'transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600',
              'dark:hover:bg-slate-800 dark:hover:text-slate-300',
            )}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="mx-[22px] border-b border-[rgba(31,45,61,0.06)] dark:border-slate-800" />
    </div>
  );
}

export function AdminFormModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-[22px] py-[18px]', className)}>
      {children}
    </div>
  );
}

export function AdminFormModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-[rgba(31,45,61,0.06)] bg-white/95 px-[22px] pt-[14px] pb-[18px] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      {children}
    </div>
  );
}

// ── AdminBottomSheet (mobile bottom sheet) ──
export function AdminBottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    // Only dismiss when dragging the header/handle area or when at scroll top
    const scrollable = sheetRef.current?.querySelector('[data-sheet-scroll]');
    if (scrollable && scrollable.scrollTop > 0) return;
    dragging.current = true;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    const diff = currentY.current - startY.current;
    sheetRef.current.style.transition = 'transform 250ms cubic-bezier(0.32,0.72,0,1)';
    if (diff > 80) {
      onClose();
    } else {
      sheetRef.current.style.transform = '';
    }
  }, [onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 animate-[adminFadeIn_180ms_ease-out]"
        style={{
          background: 'rgba(15, 23, 42, 0.30)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <div
        ref={sheetRef}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden',
          'rounded-t-[22px] border border-b-0 border-[rgba(31,45,61,0.08)] bg-white',
          'shadow-[0_-8px_40px_rgba(15,23,42,0.12)]',
          'dark:border-slate-800 dark:bg-slate-900',
          'animate-[adminSheetUp_280ms_cubic-bezier(0.32,0.72,0,1)]',
        )}
        style={{
          maxHeight: 'calc(100dvh - 16px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
