import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileText, Image, Loader2, XCircle } from 'lucide-react';
import type { ExportProgressState } from '../../types/export';

export function ExportProgressDock({ progress }: { progress: ExportProgressState | null }) {
  const { t } = useTranslation('editor');

  if (!progress?.active) return null;

  const FormatIcon = progress.format === 'pdf' ? FileText : Image;
  const title = progress.format === 'pdf' ? t('export.progressTitlePdf') : t('export.progressTitlePng');
  const tone = progress.status === 'success'
    ? 'emerald'
    : progress.status === 'error'
      ? 'rose'
      : 'blue';

  return (
    <div
      className="no-print pointer-events-none fixed bottom-6 right-6 z-[10035]"
      data-export-exclude="export-progress-dock"
    >
      <div
        className="theme-transition-target pointer-events-auto w-[320px] overflow-hidden rounded-2xl border bg-white/88 text-gray-800 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 backdrop-blur-2xl dark:border-[color:var(--border-soft)] dark:bg-[color:var(--bg-panel)] dark:text-[color:var(--text-primary)]"
        style={{ WebkitBackdropFilter: 'blur(24px) saturate(1.3)', backdropFilter: 'blur(24px) saturate(1.3)' }}
      >
        <div className="flex items-start gap-3 px-4 pb-3 pt-4">
          <div
            className={[
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              tone === 'emerald'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300'
                : tone === 'rose'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/12 dark:text-rose-300'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-500/12 dark:text-blue-300',
            ].join(' ')}
          >
            {progress.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : progress.status === 'error' ? (
              <XCircle className="h-5 w-5" />
            ) : progress.stage === 'render' || progress.stage === 'download' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FormatIcon className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate text-sm font-semibold leading-5">{title}</h3>
              <span className="shrink-0 text-xs font-medium tabular-nums text-gray-400 dark:text-[color:var(--text-secondary)]">
                {Math.round(progress.progress)}%
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-[color:var(--text-secondary)]">
              {progress.message}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className={[
                'h-full rounded-full transition-all duration-500',
                tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-blue-500',
              ].join(' ')}
              style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
