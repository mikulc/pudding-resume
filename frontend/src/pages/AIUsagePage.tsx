import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bot, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchAIUsage,
  type AIUsageDailyTrend,
  type AIUsageModelBreakdown,
  type AIUsageRecord,
  type AIUsageResponse,
} from '../api/usage';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
  mimo: 'MiMo',
  other: 'Other',
};

const MODEL_COLORS = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#84cc16', '#64748b'];
const CHART_GRID = 'rgba(148, 163, 184, 0.22)';
const RECENT_PAGE_SIZE = 10;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0);
}

function formatShortTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value.slice(5, 16);
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function featureLabel(t: (key: string) => string, feature: string): string {
  return ({
    service: t('aiUsage.feature.service'),
    diagnose: t('aiUsage.feature.diagnose'),
    polish: t('aiUsage.feature.polish'),
  } as Record<string, string>)[feature] ?? feature;
}

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

function usageStatus(t: (key: string) => string, record: AIUsageRecord): { label: string; className: string } {
  if (!record.success) {
    return { label: t('aiUsage.status.failed'), className: 'bg-red-50 text-red-700' };
  }
  if (record.usage_status === 'known') {
    return { label: t('aiUsage.status.tracked'), className: 'bg-emerald-50 text-emerald-700' };
  }
  return { label: t('aiUsage.status.unknown'), className: 'bg-amber-50 text-amber-700' };
}

function monthDays(month: string): string[] {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex) return [];
  const count = new Date(year, monthIndex, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

function buildModelMeta(models: AIUsageModelBreakdown[], trend: AIUsageDailyTrend[]) {
  const names = Array.from(new Set([
    ...models.map((item) => item.model),
    ...trend.map((item) => item.model),
  ].filter(Boolean)));
  return names.map((model, index) => ({
    model,
    key: `model_${index}`,
    color: MODEL_COLORS[index % MODEL_COLORS.length],
  }));
}

function buildTrendRows(month: string, trend: AIUsageDailyTrend[], modelMeta: ReturnType<typeof buildModelMeta>) {
  const byModel = new Map(modelMeta.map((item) => [item.model, item.key]));
  const rows = monthDays(month).map((date) => {
    const day = Number(date.slice(-2));
    return {
      date,
      label: `${Number(month.slice(5))}-${day}`,
      total_tokens: 0,
    } as Record<string, string | number>;
  });
  const byDate = new Map(rows.map((row) => [row.date as string, row]));

  trend.forEach((item) => {
    const row = byDate.get(item.date);
    const key = byModel.get(item.model);
    if (!row || !key) return;
    row.total_tokens = Number(row.total_tokens) + item.total_tokens;
    row[key] = Number(row[key] ?? 0) + item.total_tokens;
    row[`${key}_prompt`] = Number(row[`${key}_prompt`] ?? 0) + item.prompt_tokens;
    row[`${key}_completion`] = Number(row[`${key}_completion`] ?? 0) + item.completion_tokens;
    row[`${key}_reasoning`] = Number(row[`${key}_reasoning`] ?? 0) + item.reasoning_tokens;
    row[`${key}_requests`] = Number(row[`${key}_requests`] ?? 0) + item.request_count;
  });

  return rows;
}

type TrendRow = ReturnType<typeof buildTrendRows>[number];

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-[460px] animate-pulse rounded-2xl bg-gray-100" />
      <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 text-center">
      <Bot className="h-10 w-10 text-gray-300" />
      <h2 className="mt-4 text-base font-semibold text-gray-900">{t('aiUsage.noRecords')}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6b7280]">
        {t('aiUsage.noRecordsHint')}
      </p>
    </div>
  );
}

function UsageTrendTooltip({
  active,
  payload,
  label,
  models,
  t,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TrendRow }>;
  label?: string | number;
  models: ReturnType<typeof buildModelMeta>;
  t: (key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="min-w-[260px] rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-gray-900">{t('aiUsage.tooltip.date')} {label}</p>
      <div className="space-y-2">
        {models.map((model) => {
          const total = Number(row[model.key] ?? 0);
          if (total <= 0) return null;
          return (
            <div key={model.key} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-gray-800">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: model.color }} />
                  <span className="truncate">{model.model}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatNumber(total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500">
                <span>{t('aiUsage.tooltip.prompt')}：{formatNumber(Number(row[`${model.key}_prompt`] ?? 0))}</span>
                <span>{t('aiUsage.tooltip.completion')}：{formatNumber(Number(row[`${model.key}_completion`] ?? 0))}</span>
                <span>{t('aiUsage.tooltip.reasoning')}：{formatNumber(Number(row[`${model.key}_reasoning`] ?? 0))}</span>
                <span>{t('aiUsage.tooltip.requests')}：{formatNumber(Number(row[`${model.key}_requests`] ?? 0))}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TokenTrendSection({
  modelMeta,
  rows,
  t,
}: {
  modelMeta: ReturnType<typeof buildModelMeta>;
  rows: ReturnType<typeof buildTrendRows>;
  t: (key: string) => string;
}) {
  const hasTrend = rows.some((row) => Number(row.total_tokens) > 0);
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-8">
      <div className="border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t('aiUsage.monthlyTrend')}</h1>
          <p className="mt-1 text-sm text-[#6b7280]">{t('aiUsage.monthlyTrendDesc')}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#6b7280]">
        {modelMeta.map((model) => (
          <span key={model.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: model.color }} />
            {model.model}
          </span>
        ))}
      </div>
      <div className="mt-5 h-[320px] sm:h-[420px]">
        {!hasTrend ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
            {t('aiUsage.noTrendData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<UsageTrendTooltip models={modelMeta} t={t} />} />
              {modelMeta.map((model) => (
                <Bar key={model.key} dataKey={model.key} name={model.model} stackId="tokens" fill={model.color} radius={[3, 3, 0, 0]} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function UsageLogsTable({
  records,
  total,
  page,
  pageSize,
  onPageChange,
  t,
}: {
  records: AIUsageRecord[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const showPagination = total > pageSize;

  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-8">
        <h2 className="text-base font-bold text-gray-900">{t('aiUsage.recentCalls')}</h2>
        <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
          {t('aiUsage.noCallRecords')}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white">
      <div className="border-b border-gray-100 p-8">
        <h2 className="text-base font-bold text-gray-900">{t('aiUsage.recentCalls')}</h2>
        <p className="mt-1 text-sm text-[#6b7280]">{t('aiUsage.recentCallsDesc')}</p>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">{t('aiUsage.table.time')}</th>
              <th className="px-5 py-3 font-medium">{t('aiUsage.table.feature')}</th>
              <th className="px-5 py-3 font-medium">{t('aiUsage.table.providerModel')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('aiUsage.table.promptTokens')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('aiUsage.table.completionTokens')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('aiUsage.table.reasoningTokens')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('aiUsage.table.totalTokens')}</th>
              <th className="px-5 py-3 font-medium">{t('aiUsage.table.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => {
              const status = usageStatus(t, record);
              return (
                <tr key={record.id} className="text-gray-700">
                  <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatShortTime(record.created_at)}</td>
                  <td className="px-5 py-3">{featureLabel(t, record.feature)}</td>
                  <td className="max-w-[260px] px-5 py-3">
                    <p className="font-medium text-gray-900">{providerLabel(record.provider)}</p>
                    <p className="truncate text-xs text-gray-400">{record.model}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatNumber(record.prompt_tokens)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatNumber(record.completion_tokens)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatNumber(record.reasoning_tokens)}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatNumber(record.total_tokens)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 p-4 md:hidden">
        {records.map((record) => {
          const status = usageStatus(t, record);
          return (
            <div key={record.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{featureLabel(t, record.feature)}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatShortTime(record.created_at)}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
              </div>
              <p className="mt-3 text-sm text-gray-700">{providerLabel(record.provider)}</p>
              <p className="truncate text-xs text-gray-400">{record.model}</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <Metric label={t('aiUsage.metric.prompt')} value={record.prompt_tokens} />
                <Metric label={t('aiUsage.metric.completion')} value={record.completion_tokens} />
                <Metric label={t('aiUsage.metric.reasoning')} value={record.reasoning_tokens} />
                <Metric label={t('aiUsage.metric.total')} value={record.total_tokens} />
              </div>
            </div>
          );
        })}
      </div>
      {showPagination && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            {t('aiUsage.pagination.range', { start: startIndex, end: endIndex, total })}
          </p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('aiUsage.pagination.previous')}
            </button>
            <span className="min-w-[88px] text-center text-xs font-medium text-gray-500">
              {t('aiUsage.pagination.page', { page, totalPages })}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
            >
              {t('aiUsage.pagination.next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-800">{formatNumber(value)}</p>
    </div>
  );
}

function UsagePageHeader({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight text-gray-900 md:hidden">{t('aiUsage.title')}</h1>

      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('aiUsage.title')}</h1>
      </div>

      <p className="text-sm leading-6 text-[#6b7280]">
        {t('aiUsage.description')}
      </p>
    </div>
  );
}

export default function AIUsagePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('resume');
  const { isLoggedIn, profileLoading } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<AIUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month] = useState(currentMonth);
  const [recentPage, setRecentPage] = useState(1);

  useEffect(() => {
    if (!profileLoading && !isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate, profileLoading]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchAIUsage({ month, recentPage, recentPageSize: RECENT_PAGE_SIZE })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : t('aiUsage.loadingFailed');
        if (!cancelled) {
          setError(message);
          showToast(message, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, month, recentPage, showToast, t]);

  const hasData = (data?.total.request_count ?? 0) > 0;
  const modelMeta = useMemo(() => buildModelMeta(data?.models ?? [], data?.daily_trend ?? []), [data]);
  const trendRows = useMemo(() => buildTrendRows(month, data?.daily_trend ?? [], modelMeta), [data, modelMeta, month]);
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-[var(--bg-header)] backdrop-blur-xl">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <main className="pb-16 pt-24">
        <div className="mx-auto w-full max-w-[1360px] space-y-5 px-6">
          <UsagePageHeader
            t={t}
          />

          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('aiUsage.loadingFailed')}</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && data && !hasData && <EmptyState t={t} />}

          {!loading && data && hasData && (
            <>
              <TokenTrendSection modelMeta={modelMeta} rows={trendRows} t={t} />
              <UsageLogsTable
                records={data.recent}
                total={data.recent_total}
                page={recentPage}
                pageSize={RECENT_PAGE_SIZE}
                onPageChange={setRecentPage}
                t={t}
              />
            </>
          )}

          {!loading && isLoggedIn && !data && !error && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('aiUsage.loadingUsage')}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
