import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { createDiffSegments, type DiffSegmentData } from './aiDiff';

export type OptimizeTab = 'compare' | 'optimized' | 'original';
export type OptimizeStatus = 'idle' | 'loading' | 'success' | 'error';

interface AiOptimizePanelProps {
  status: OptimizeStatus;
  activeTab: OptimizeTab;
  originalText: string;
  optimizedText: string;
  errorMessage: string;
  onTabChange: (tab: OptimizeTab) => void;
  onOptimizedTextChange: (text: string) => void;
  onRetry: () => void;
}

const tabItems: Array<{ key: OptimizeTab; labelKey: string; defaultLabel: string }> = [
  { key: 'compare', labelKey: 'longTextEditor.aiOptimize.tabs.compare', defaultLabel: 'Compare' },
  { key: 'optimized', labelKey: 'longTextEditor.aiOptimize.tabs.optimized', defaultLabel: 'Optimized' },
  { key: 'original', labelKey: 'longTextEditor.aiOptimize.tabs.original', defaultLabel: 'Original' },
];

function textWithDefault(t: ReturnType<typeof useTranslation>['t'], key: string, defaultValue: string) {
  return t(key, { defaultValue });
}

export function AiOptimizePanel({
  status,
  activeTab,
  originalText,
  optimizedText,
  errorMessage,
  onTabChange,
  onOptimizedTextChange,
  onRetry,
}: AiOptimizePanelProps) {
  const { t } = useTranslation(['editor']);
  const isReady = status === 'success';

  if (status === 'loading') {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center rounded-xl border border-indigo-100 bg-white px-6 py-8 shadow-sm dark:border-indigo-400/20 dark:bg-[var(--bg-input)]">
        <div className="flex max-w-xs flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <p className="mt-3 text-sm font-medium text-gray-800">
            {textWithDefault(t, 'longTextEditor.aiOptimize.loadingTitle', 'AI is optimizing content')}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            {textWithDefault(t, 'longTextEditor.aiOptimize.loadingDescription', 'Your original text will not be overwritten before the result is ready.')}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center rounded-xl border border-rose-100 bg-white px-6 py-8 shadow-sm dark:border-rose-400/25 dark:bg-[var(--bg-input)]">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-gray-800">
            {textWithDefault(t, 'longTextEditor.aiOptimize.errorTitle', 'AI optimization failed')}
          </p>
          <p className="mt-1 max-h-24 overflow-y-auto text-xs leading-5 text-gray-500">
            {errorMessage || textWithDefault(t, 'longTextEditor.aiOptimize.errorDescription', 'Please try again later.')}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {textWithDefault(t, 'longTextEditor.aiOptimize.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--bg-input)]">
      <div className="shrink-0 border-b border-gray-100 px-3.5 py-3 dark:border-[var(--border-soft)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>{textWithDefault(t, 'longTextEditor.aiOptimize.title', 'AI optimization result')}</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-gray-500">
              {textWithDefault(t, 'longTextEditor.aiOptimize.description', 'Compare the original and optimized content before applying changes.')}
            </p>
          </div>
          <OptimizeResultTabs activeTab={activeTab} disabled={!isReady} onTabChange={onTabChange} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3.5">
        {activeTab === 'compare' && (
          <DiffPreview originalText={originalText} optimizedText={optimizedText} />
        )}
        {activeTab === 'optimized' && (
          <textarea
            value={optimizedText}
            onChange={(event) => onOptimizedTextChange(event.target.value)}
            className="hide-scrollbar h-full min-h-[220px] w-full resize-none rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-gray-800 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-[var(--border-soft)] dark:bg-[var(--bg-card-muted)] dark:text-[var(--text-primary)] dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            aria-label={textWithDefault(t, 'longTextEditor.aiOptimize.optimizedAria', 'Optimized content')}
            spellCheck={false}
          />
        )}
        {activeTab === 'original' && (
          <div className="hide-scrollbar h-full min-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-gray-700 dark:border-[var(--border-soft)] dark:bg-[var(--bg-card-muted)] dark:text-[var(--text-secondary)]">
            {originalText}
          </div>
        )}
      </div>
    </div>
  );
}

interface OptimizeResultTabsProps {
  activeTab: OptimizeTab;
  disabled: boolean;
  onTabChange: (tab: OptimizeTab) => void;
}

export function OptimizeResultTabs({ activeTab, disabled, onTabChange }: OptimizeResultTabsProps) {
  const { t } = useTranslation(['editor']);

  return (
    <div
      role="tablist"
      aria-label={textWithDefault(t, 'longTextEditor.aiOptimize.tabs.aria', 'AI optimization result views')}
      className="flex shrink-0 rounded-lg bg-gray-100 p-0.5 dark:bg-[var(--bg-control)]"
    >
      {tabItems.map((item) => {
        const selected = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onTabChange(item.key)}
            className={[
              'inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'bg-white text-gray-900 shadow-sm dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]'
                : 'text-gray-500 hover:text-gray-700 dark:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {textWithDefault(t, item.labelKey, item.defaultLabel)}
          </button>
        );
      })}
    </div>
  );
}

interface DiffPreviewProps {
  originalText: string;
  optimizedText: string;
}

export function DiffPreview({ originalText, optimizedText }: DiffPreviewProps) {
  const segments = useMemo(
    () => createDiffSegments(originalText, optimizedText),
    [originalText, optimizedText],
  );

  return (
    <div className="hide-scrollbar h-full min-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm leading-7 text-gray-800 dark:border-[var(--border-soft)] dark:bg-[var(--bg-card-muted)] dark:text-[var(--text-primary)]">
      {segments.map((segment, index) => (
        <DiffSegment key={`${segment.type}-${index}`} segment={segment} />
      ))}
    </div>
  );
}

interface DiffSegmentProps {
  segment: DiffSegmentData;
}

export function DiffSegment({ segment }: DiffSegmentProps) {
  if (segment.type === 'equal') {
    return <span>{segment.text}</span>;
  }

  if (segment.type === 'added') {
    return (
      <span className="rounded bg-emerald-100/80 px-0.5 text-gray-900 dark:bg-emerald-400/20 dark:text-emerald-50">
        {segment.text}
      </span>
    );
  }

  if (segment.type === 'removed') {
    return (
      <span className="rounded bg-rose-100/80 px-0.5 text-gray-700 line-through decoration-rose-400 decoration-1 dark:bg-rose-400/20 dark:text-rose-100 dark:decoration-rose-300">
        {segment.text}
      </span>
    );
  }

  return (
    <>
      {segment.previousText && (
        <span className="rounded bg-rose-100/80 px-0.5 text-gray-700 line-through decoration-rose-400 decoration-1 dark:bg-rose-400/20 dark:text-rose-100 dark:decoration-rose-300">
          {segment.previousText}
        </span>
      )}
      <span className="rounded bg-sky-100/90 px-0.5 text-gray-900 dark:bg-sky-400/20 dark:text-sky-50">
        {segment.text}
      </span>
    </>
  );
}
