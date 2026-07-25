import { Check,ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes,ReactNode } from 'react';
import { useRef,useState } from 'react';
import { DatePicker } from '../../../components/editor/DatePicker';
import { useDismissibleLayer } from '../../../hooks/useDismissibleLayer';
import { adminInputClass,cn } from './tokens';

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


export function AdminField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
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
