import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Clock,
  KeyRound,
  Lightbulb,
  Loader2,
  RotateCcw,
  ScanText,
  SearchCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtsContext } from '../../context/AtsContext';
import { useAppUI } from '../../context/ResumeContext';
import { Tooltip } from '../common/Tooltip';
import type { AtsIssue, SectionKey } from '../../types/resume';
import { useToast } from '../common/Toast';
import { useAiTask } from '../../context/AiTaskContext';

// 严重级别 pill 配色：蓝色为主强调色，红色仅用于高危，去除黄色/琥珀色（暗色下保持柔和）
const severityClass = {
  high: 'border-red-100 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-rose-500/10 dark:text-rose-300',
  medium: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300',
  low: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
};

const JD_RECOMMENDED_CHAR_LIMIT = 8000;
const JD_WARNING_CHAR_LIMIT = JD_RECOMMENDED_CHAR_LIMIT * 0.8;
const DEFAULT_VISIBLE_HISTORY_COUNT = 3;

function formatRelativeTime(timestamp: number, language: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const locale = language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (elapsedSeconds < 60) return formatter.format(-elapsedSeconds, 'second');
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return formatter.format(-elapsedMinutes, 'minute');
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return formatter.format(-elapsedHours, 'hour');
  return formatter.format(-Math.floor(elapsedHours / 24), 'day');
}

function clampSection(section?: SectionKey): SectionKey | null {
  return section && section.trim() ? section : null;
}

// 通用 section 标题：左侧蓝色竖条 + 标题 + 右侧数量统计
function SectionHeader({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-[var(--theme-accent)]" aria-hidden="true" />
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-[color:var(--text-primary)]">
        {Icon && <Icon className="h-3.5 w-3.5 text-[var(--theme-accent)]" />}
        {title}
      </h3>
      {count !== undefined && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/5 dark:text-slate-300">
          {count}
        </span>
      )}
    </div>
  );
}

// 轻量操作按钮：统一尺寸、圆角、间距，蓝色 / 灰蓝两种风格
function LightButton({
  blue,
  icon: Icon,
  children,
  onClick,
  type = 'button',
}: {
  blue?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={[
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
        blue
          ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent)] hover:brightness-95'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
      ].join(' ')}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function KeywordList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs leading-5 text-gray-400">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, 18).map((item) => (
        <span
          key={item}
          className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function IssueList({
  icon: Icon,
  title,
  items,
  empty,
  onFocusSection,
  onCopyHint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: AtsIssue[];
  empty: string;
  onFocusSection: (section: SectionKey) => void;
  onCopyHint: (text: string) => void;
}) {
  const { t } = useTranslation('editor');

  return (
    <section className="space-y-3">
      <SectionHeader icon={Icon} title={title} count={items.length} />
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-gray-400 dark:border-white/10 dark:bg-white/5">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const section = clampSection(item.target_section);
            return (
              <div
                key={`${item.title}-${index}`}
                className="w-full rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition-all hover:border-[var(--theme-accent)] hover:shadow-sm dark:border-white/10"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityClass[item.severity] ?? severityClass.low}`}
                  >
                    {t(`atsPanel.severity.${item.severity}`)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-[color:var(--text-primary)]">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs leading-5 text-gray-500 dark:text-[color:var(--text-secondary)]">{item.description}</p>
                {item.rewrite_hint && (
                  <div className="mt-2.5 flex gap-2.5 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                    <span className="mt-0.5 h-auto w-0.5 flex-shrink-0 rounded-full bg-[var(--theme-accent)]" aria-hidden="true" />
                    <p className="text-sm leading-5 text-slate-600 dark:text-[color:var(--text-secondary)]">{item.rewrite_hint}</p>
                  </div>
                )}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {section && (
                    <LightButton blue onClick={() => onFocusSection(section)}>
                      {t('atsPanel.focusSection')}
                    </LightButton>
                  )}
                  {item.rewrite_hint && (
                    <LightButton icon={Clipboard} onClick={() => onCopyHint(item.rewrite_hint || '')}>
                      {t('atsPanel.copyHint')}
                    </LightButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AtsPanel() {
  const { t, i18n } = useTranslation('editor');
  const ats = useAtsContext();
  const { uiDispatch } = useAppUI();
  const { showToast } = useToast();
  const { activeAiTask, requestAiTask, releaseAiTask } = useAiTask();
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const result = ats.result;
  const score = result?.score ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : 'text-red-600';
  const jdCharCount = ats.jobDescription.length;
  const jdLengthState = jdCharCount >= JD_RECOMMENDED_CHAR_LIMIT
    ? 'danger'
    : jdCharCount >= JD_WARNING_CHAR_LIMIT
      ? 'warning'
      : 'ok';
  const jdCounterClass = jdLengthState === 'danger'
    ? 'text-red-600'
    : jdLengthState === 'warning'
      ? 'text-orange-500 dark:text-orange-300'
      : 'text-gray-400';
  const jdHintClass = jdLengthState === 'danger'
    ? 'border-red-100 bg-red-50 text-red-600'
    : jdLengthState === 'warning'
      ? 'border-blue-100 bg-blue-50 text-blue-600'
      : 'border-slate-200 bg-slate-50 text-slate-500';

  const handleFocusSection = (section: SectionKey) => {
    uiDispatch({ type: 'SET_ACTIVE_SECTION', payload: section });
    uiDispatch({ type: 'SET_EDITOR_OPEN', payload: true });
  };

  const handleCopyHint = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('atsPanel.copied'), 'success');
    } catch {
      showToast(t('atsPanel.copyFailed'), 'error');
    }
  };

  const handleRunAtsAnalysis = async () => {
    if (ats.loading) return;
    if (activeAiTask && activeAiTask !== 'ats') {
      showToast(t('aiTask.busy', { task: t(`aiTask.${activeAiTask}`) }), 'info');
      return;
    }
    if (!requestAiTask('ats')) return;
    try {
      await ats.runAnalysis();
    } finally {
      releaseAiTask('ats');
    }
  };

  // 顶部小图标按钮（清空结果 / 清空历史）
  const iconButtonClass =
    'flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200';

  const visibleHistory = historyExpanded
    ? ats.history
    : ats.history.slice(0, DEFAULT_VISIBLE_HISTORY_COUNT);
  const hiddenHistoryCount = Math.max(0, ats.history.length - DEFAULT_VISIBLE_HISTORY_COUNT);

  return (
    <div className="theme-transition-target thin-scrollbar h-full overflow-y-auto px-4 py-4 pb-6">
      {/* 顶部说明 + 清空结果 */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs leading-5 text-gray-400">{t('atsPanel.description')}</p>
        {result && (
          <Tooltip content={t('atsPanel.clear')}>
            <button
              type="button"
              onClick={ats.clearResult}
              className={iconButtonClass}
              aria-label={t('atsPanel.clear')}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="space-y-3">
        {/* 最近 JD 分析 */}
        {ats.history.length > 0 && (
          <section className="settings-card rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-[color:var(--border-default)] dark:bg-[color:var(--bg-card)]">
            <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-[color:var(--text-primary)]">
                <Clock className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                <span>{t('atsPanel.history')}</span>
              </div>
              <button
                type="button"
                onClick={ats.clearHistory}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-[var(--theme-accent-soft)] hover:text-[var(--theme-accent)] dark:text-[color:var(--text-muted)]"
                aria-label={t('atsPanel.clearHistory')}
              >
                {t('atsPanel.clearHistoryAction')}
              </button>
            </div>
            <div className="space-y-2">
              {visibleHistory.map((item) => {
                const isActive = ats.lastAnalyzedAt === item.analyzedAt
                  && ats.jobDescription === item.jobDescription;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => ats.restoreHistory(item.id)}
                    aria-pressed={isActive}
                    className={[
                      'group block w-full rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow]',
                      isActive
                        ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] shadow-[0_1px_3px_var(--theme-accent-soft)]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-[var(--theme-accent)] hover:bg-white hover:shadow-[0_2px_6px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/5',
                    ].join(' ')}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-[color:var(--text-primary)]">
                        {item.title}
                      </span>
                      <span className={[
                        'inline-flex min-w-8 flex-shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors',
                        isActive
                          ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]'
                          : 'bg-white text-slate-500 group-hover:bg-[var(--theme-accent-soft)] group-hover:text-[var(--theme-accent)] dark:bg-white/10 dark:text-slate-300',
                      ].join(' ')}>
                        {item.result.score}
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center justify-between gap-3 text-[11px] leading-4 text-slate-400 dark:text-[color:var(--text-muted)]">
                      <span className="truncate">
                        {t('atsPanel.recentlyAnalyzed')} · {formatRelativeTime(item.analyzedAt, i18n.language)}
                      </span>
                      <span className="flex-shrink-0 text-[var(--theme-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                        {t('atsPanel.reuseHistory')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {hiddenHistoryCount > 0 && (
              <button
                type="button"
                onClick={() => setHistoryExpanded((expanded) => !expanded)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-[var(--theme-accent-soft)] hover:text-[var(--theme-accent)] dark:text-[color:var(--text-secondary)]"
                aria-expanded={historyExpanded}
              >
                {historyExpanded
                  ? t('atsPanel.collapseHistory')
                  : t('atsPanel.expandHistory', { count: hiddenHistoryCount })}
                {historyExpanded
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </section>
        )}

        {/* 岗位 JD 输入 */}
        <section>
          <label className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-[color:var(--border-default)] dark:bg-[color:var(--bg-card)]">
            <span className="flex h-11 items-center justify-between gap-3 border-b border-slate-100 px-4 text-xs font-medium text-slate-600 dark:border-white/10 dark:text-[color:var(--text-secondary)]">
              <span>{t('atsPanel.jdLabel')}</span>
              <span className={`font-normal tabular-nums transition-colors ${jdCounterClass}`}>
                {jdCharCount} / {JD_RECOMMENDED_CHAR_LIMIT}
              </span>
            </span>
            <textarea
              value={ats.jobDescription}
              onChange={(event) => ats.setJobDescription(event.target.value)}
              placeholder={t('atsPanel.jdPlaceholder')}
              className="thin-scrollbar block min-h-[180px] max-h-[320px] w-full resize-y !rounded-none !border-0 !bg-transparent px-4 py-3.5 text-sm leading-[1.7] text-slate-700 !outline-none placeholder:text-slate-400 focus:!border-0 focus:!shadow-none dark:text-[color:var(--text-primary)] dark:placeholder:text-[color:var(--text-muted)]"
            />
          </label>
          {jdLengthState !== 'ok' && (
            <p className={`mt-1.5 rounded-md border px-2 py-1.5 text-xs leading-5 ${jdHintClass}`}>
              {t(`atsPanel.jdLength.${jdLengthState}`)}
            </p>
          )}
        </section>

        {/* 分析按钮 */}
        <button
          type="button"
          onClick={() => { void handleRunAtsAnalysis(); }}
          disabled={ats.loading || (activeAiTask !== null && activeAiTask !== 'ats')}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--theme-accent)] px-3 text-sm font-medium text-[var(--theme-accent-foreground)] shadow-sm transition-[filter,box-shadow] hover:brightness-105 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] disabled:cursor-progress disabled:opacity-80"
        >
          {ats.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
          <span>{ats.loading ? t('atsPanel.analyzing') : t('atsPanel.analyze')}</span>
        </button>

      </div>

      {/* 分析结果 */}
      {result && (
        <div key={ats.lastAnalyzedAt ?? 'ats-result'} className="mt-4 space-y-4 animate-fadeIn">
          {/* 分数概览 */}
          <section className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{t('atsPanel.score')}</p>
                <p className={`mt-1 text-3xl font-semibold ${scoreColor}`}>{score}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            {result.summary && (
              <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-[color:var(--text-secondary)]">{result.summary}</p>
            )}
          </section>

          {/* 已匹配关键词 */}
          <section className="space-y-2.5">
            <SectionHeader icon={ScanText} title={t('atsPanel.matchedKeywords')} count={result.matched_keywords.length} />
            <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
              <KeywordList items={result.matched_keywords} empty={t('atsPanel.noMatchedKeywords')} />
            </div>
          </section>

          {/* 缺失关键词 */}
          <section className="space-y-2.5">
            <SectionHeader icon={KeyRound} title={t('atsPanel.missingKeywords')} count={result.missing_keywords.length} />
            <div className="settings-card bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
              <KeywordList items={result.missing_keywords} empty={t('atsPanel.noMissingKeywords')} />
            </div>
          </section>

          {/* 格式风险 */}
          <IssueList
            icon={AlertTriangle}
            title={t('atsPanel.formatIssues')}
            items={result.format_issues}
            empty={t('atsPanel.noFormatIssues')}
            onFocusSection={handleFocusSection}
            onCopyHint={handleCopyHint}
          />

          {/* 内容建议 */}
          <IssueList
            icon={Lightbulb}
            title={t('atsPanel.contentSuggestions')}
            items={result.content_suggestions}
            empty={t('atsPanel.noContentSuggestions')}
            onFocusSection={handleFocusSection}
            onCopyHint={handleCopyHint}
          />

        </div>
      )}

      {/* 空状态 */}
      {!result && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-slate-50 px-4 py-10 text-center dark:border-white/10 dark:bg-white/5">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]">
            <SearchCheck className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-gray-700 dark:text-[color:var(--text-primary)]">{t('atsPanel.emptyTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-[color:var(--text-muted)]">{t('atsPanel.emptyDescription')}</p>
        </div>
      )}
    </div>
  );
}
