import { CheckCircle2, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { adminInputClass, cn } from './tokens';

export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('admin-input', adminInputClass, className)} {...props} />;
}

export interface AdminSelectOption {
  value: string;
  label: string;
}

export function AdminSelect({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'admin-input flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-[#E6EAF2] bg-white px-3.5 text-left text-sm text-slate-600 outline-none',
          'transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--theme-accent)] hover:bg-[var(--theme-accent-soft)]',
          'focus-visible:border-[var(--theme-accent)] focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-soft)]',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[var(--theme-accent)] dark:hover:bg-[var(--theme-accent-soft)]',
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 min-w-[132px] origin-top overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-200/50 animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-[var(--theme-accent-soft)] font-medium text-[var(--theme-accent)]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                )}
              >
                <span className="flex w-4 shrink-0 items-center">
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[var(--theme-accent)]" />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
