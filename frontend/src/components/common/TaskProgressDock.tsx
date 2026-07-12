import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, X, XCircle, type LucideIcon } from 'lucide-react';

export type TaskProgressStatus = 'loading' | 'success' | 'error';
export type TaskProgressType = 'translate' | 'diagnosis' | 'ats' | 'export';

interface TaskProgressDockProps {
  visible: boolean;
  taskType?: TaskProgressType;
  status: TaskProgressStatus;
  title: string;
  description: string;
  successMessage?: string;
  errorMessage?: string;
  progress?: number;
  mobile?: boolean;
  icon?: LucideIcon;
  excludeId?: string;
  onClose?: () => void;
  closeLabel?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

const TASK_PROGRESS_DOCK_ROOT_ID = 'task-progress-dock-root';
const EXIT_ANIMATION_DURATION = 190;

function getTaskProgressDockRoot() {
  let root = document.getElementById(TASK_PROGRESS_DOCK_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = TASK_PROGRESS_DOCK_ROOT_ID;
    root.className = 'no-print pointer-events-none fixed bottom-6 right-6 z-[10030] flex max-h-[calc(100vh-48px)] flex-col-reverse gap-3 max-md:inset-x-3 max-md:bottom-[84px] max-md:right-auto';
    root.dataset.exportExclude = 'task-progress-dock-root';
    document.body.appendChild(root);
  }
  return root;
}

export function TaskProgressDock({
  visible,
  taskType,
  status,
  title,
  description,
  successMessage,
  errorMessage,
  progress,
  mobile = false,
  icon: Icon,
  excludeId = 'task-progress-dock',
  onClose,
  closeLabel = 'Close',
  duration,
  actions,
}: TaskProgressDockProps) {
  const [exiting, setExiting] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const beginClose = useCallback(() => {
    if (!onClose || exiting) return;
    setExiting(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, EXIT_ANIMATION_DURATION);
  }, [exiting, onClose]);

  useEffect(() => {
    setExiting(false);
  }, [status, visible]);

  useEffect(() => {
    if (!visible || status === 'loading' || !duration || !onClose) return;
    const timer = window.setTimeout(beginClose, duration);
    return () => window.clearTimeout(timer);
  }, [beginClose, duration, onClose, status, visible]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  if (!visible || typeof document === 'undefined') return null;

  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress ?? (status === 'loading' ? 24 : 100))));
  const tone = status === 'success' ? 'emerald' : status === 'error' ? 'rose' : 'blue';
  const resolvedDescription = status === 'success' && successMessage
    ? successMessage
    : status === 'error' && errorMessage
      ? errorMessage
      : description;

  return createPortal(
    <div
      className={[
        'task-progress-dock theme-transition-target pointer-events-auto overflow-hidden rounded-[20px] border bg-white/88 text-gray-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 backdrop-blur-2xl',
        'dark:text-[rgba(255,255,255,0.92)]',
        exiting ? 'task-progress-dock-exit' : 'diagnosis-progress-dock-enter',
        mobile ? 'mx-auto w-full max-w-[360px]' : 'w-[320px] max-md:mx-auto max-md:w-full max-md:max-w-[360px]',
      ].join(' ')}
      data-export-exclude={excludeId}
      data-task-type={taskType}
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
            {status === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : status === 'error' ? (
              <XCircle className="h-5 w-5" />
            ) : Icon ? (
              <Icon className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="task-progress-dock-title truncate text-sm font-semibold leading-5">{title}</h3>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums text-gray-400 dark:text-[color:var(--text-secondary)]">
                  {normalizedProgress}%
                </span>
                {onClose && status !== 'loading' && (
                  <button
                    type="button"
                    onClick={beginClose}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-[color:var(--text-primary)]"
                    aria-label={closeLabel}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="task-progress-dock-description mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-[rgba(255,255,255,0.62)]">
              {resolvedDescription}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="task-progress-dock-track h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className={[
                'h-full rounded-full transition-all duration-500',
                tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-blue-500',
              ].join(' ')}
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
          {actions && actions.length > 0 && (
            <div className="mt-3 flex items-center justify-end gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={[
                    'h-8 rounded-lg px-3 text-xs font-semibold transition-colors',
                    action.variant === 'danger'
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/12 dark:text-rose-200 dark:hover:bg-rose-500/18'
                      : action.variant === 'primary'
                        ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/8 dark:text-[color:var(--text-secondary)] dark:hover:bg-white/12',
                  ].join(' ')}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
    </div>,
    getTaskProgressDockRoot(),
  );
}
