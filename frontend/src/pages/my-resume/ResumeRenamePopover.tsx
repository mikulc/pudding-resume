import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

interface ResumeRenamePopoverProps {
  open: boolean;
  position: { top: number; left: number };
  popoverRef: RefObject<HTMLDivElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ResumeRenamePopover({
  open, position, popoverRef, value, onChange, onSubmit, onCancel,
}: ResumeRenamePopoverProps) {
  const { t } = useTranslation(['resume', 'common']);
  if (!open) return null;

  return createPortal(
    <div
      ref={popoverRef as RefObject<HTMLDivElement>}
      className="resume-popover-enter fixed z-[101] w-[240px] rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950"
      style={{ top: position.top, left: position.left }}
      onClick={(event) => event.stopPropagation()}
    >
      <p className="mb-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t('list.rename')}</p>
      <input
        id="resume-rename-input"
        autoFocus
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
          if (event.key === 'Escape') onCancel();
        }}
        className="rename-input mb-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-800 transition-colors placeholder:text-slate-300 focus:border-[#425aef] focus:bg-white focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#ffc848] dark:focus:bg-slate-900 dark:focus:ring-0"
        maxLength={100}
      />
      <div className="flex items-center justify-end gap-2.5">
        <button type="button" onClick={onCancel} className="h-8 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300">
          {t('common:button.cancel')}
        </button>
        <button type="button" onClick={onSubmit} className="h-8 rounded-[10px] bg-slate-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
          {t('common:button.ok')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
