import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { fetchDashboard } from '../../api/admin';
import type { DashboardData, ModelUsageItem } from '../../types/admin';
import {
  Users, FileText, TrendingUp,
  Activity, BarChart3, RefreshCw,
  Bot, Zap, CalendarDays, Database,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  AdminChartCard, AdminOverviewCard, AdminPage,
  AdminCard, adminTokens,
} from './adminStyles';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  adminChartTooltipStyle,
  formatDateAxisTick,
  mobileDateChartMargin,
  selectMobileDateTicks,
  useChartResizeObserver,
} from './dateChartUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ---------------------------------------------------------------------------
// Mobile model ranking list
// ---------------------------------------------------------------------------

function ModelRankingMobile({ items }: { items: ModelUsageItem[] }) {
  const { t } = useTranslation('admin');
  const maxCount = useMemo(() => Math.max(...items.map((i) => i.count), 1), [items]);
  const displayItems = useMemo(() => items.slice(0, 5), [items]);

  return (
    <div className="flex flex-col gap-[14px]">
      {displayItems.map((item, idx) => {
        const pct = (item.count / maxCount) * 100;
        const isFirst = idx === 0;

        return (
          <div key={item.name} className="flex flex-col gap-2">
            {/* Header row: rank / name / value */}
            <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2">
              <span
                className={`text-xs font-bold tabular-nums text-right ${
                  isFirst ? 'text-[var(--theme-accent)]' : 'text-slate-400'
                }`}
              >
                {idx + 1}
              </span>
              <span
                className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
                title={item.name}
              >
                {item.name}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {item.count.toLocaleString()}
                {items.length === 1 && (
                  <span className="text-[10px] text-slate-400">100%</span>
                )}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F4] dark:bg-white/10">
              <div
                className={`h-full rounded-full bg-[var(--theme-accent)] transition-[width] duration-500 ease-out ${
                  isFirst ? '' : 'opacity-60'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400">
          {t('dashboard.loadFailed')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DashboardPage
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { isLoggedIn, role } = useAuth();
  const { t } = useTranslation('admin');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const isMobile = useMediaQuery('(max-width: 767px)');

  // Chart container refs for ResizeObserver
  const lineChartRef1 = useChartResizeObserver();
  const lineChartRef2 = useChartResizeObserver();
  const barChartRef = useChartResizeObserver();

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchDashboard();
      setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isLoggedIn && role === 'admin') load();
  }, [isLoggedIn, role]);

  // ---- Derived values (MUST be before any conditional return) ----
  const newUserDates = useMemo(
    () => (data?.daily_new_users ?? []).map((item) => item.date),
    [data?.daily_new_users],
  );
  const tokenDates = useMemo(
    () => (data?.daily_tokens ?? []).map((item) => item.date),
    [data?.daily_tokens],
  );
  const newUserTicks = isMobile ? selectMobileDateTicks(newUserDates) : undefined;
  const tokenTicks = isMobile ? selectMobileDateTicks(tokenDates) : undefined;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">{t('dashboard.loadFailed')}</p>;

  // ---- Card data ----
  const overviewItems = [
    { label: t('dashboard.metrics.totalUsers'), value: data.total_users, icon: Users },
    { label: t('dashboard.metrics.todayNewUsers'), value: data.today_new_users, icon: TrendingUp },
    { label: t('dashboard.metrics.totalResumes'), value: data.total_resumes, icon: FileText },
    { label: t('dashboard.metrics.activeUsers30d'), value: data.active_users_30d, icon: Activity },
    { label: t('dashboard.tokens.todayRequests'), value: data.today_ai_requests, icon: Bot },
    { label: t('dashboard.tokens.todayTokens'), value: data.today_tokens, icon: Zap, formatValue: formatTokens },
    { label: t('dashboard.tokens.monthTokens'), value: data.month_tokens, icon: CalendarDays, formatValue: formatTokens },
    { label: t('dashboard.tokens.totalTokens'), value: data.total_tokens, icon: Database, formatValue: formatTokens },
  ];

  const lineChartHeight = isMobile ? 260 : 250;

  return (
    <AdminPage>
      <AdminOverviewCard title={t('dashboard.overview')} items={overviewItems} />

      {/* ---- Line Charts ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {/* New Users Trend */}
        <AdminChartCard title={t('dashboard.charts.newUsersTrend')}>
          <div ref={lineChartRef1}>
            <ResponsiveContainer width="100%" height={lineChartHeight}>
              <LineChart data={data.daily_new_users} margin={isMobile ? mobileDateChartMargin : undefined}>
                <CartesianGrid strokeDasharray="3 3" stroke={adminTokens.chartGrid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={isMobile ? { fontSize: 11, fill: '#94a3b8' } : { fontSize: 11 }}
                  stroke={adminTokens.chartAxis}
                  axisLine={false}
                  tickLine={false}
                  ticks={newUserTicks}
                  interval={isMobile ? 0 : undefined}
                  tickFormatter={(value: string) => formatDateAxisTick(value, isMobile)}
                  angle={0}
                  tickMargin={isMobile ? 10 : undefined}
                  minTickGap={isMobile ? 12 : 5}
                  padding={isMobile ? { left: 12, right: 18 } : undefined}
                  height={isMobile ? 34 : undefined}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke={adminTokens.chartAxis}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 36 : undefined}
                />
                <Tooltip
                  contentStyle={isMobile ? adminChartTooltipStyle : undefined}
                  labelStyle={isMobile ? { color: '#0f172a', fontWeight: 600 } : undefined}
                  itemStyle={isMobile ? { fontVariantNumeric: 'tabular-nums' } : undefined}
                  wrapperStyle={isMobile ? { maxWidth: 'calc(100vw - 24px)' } : undefined}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={adminTokens.chartBlue}
                  strokeWidth={isMobile ? 2 : 2.5}
                  dot={false}
                  name={t('dashboard.charts.newUsersLine')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCard>

        {/* Token Trend */}
        <AdminChartCard title={t('dashboard.charts.tokenTrend')}>
          <div ref={lineChartRef2}>
            <ResponsiveContainer width="100%" height={lineChartHeight}>
              <LineChart data={data.daily_tokens} margin={isMobile ? mobileDateChartMargin : undefined}>
                <CartesianGrid strokeDasharray="3 3" stroke={adminTokens.chartGrid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={isMobile ? { fontSize: 11, fill: '#94a3b8' } : { fontSize: 11 }}
                  stroke={adminTokens.chartAxis}
                  axisLine={false}
                  tickLine={false}
                  ticks={tokenTicks}
                  interval={isMobile ? 0 : undefined}
                  tickFormatter={(value: string) => formatDateAxisTick(value, isMobile)}
                  angle={0}
                  tickMargin={isMobile ? 10 : undefined}
                  minTickGap={isMobile ? 12 : 5}
                  padding={isMobile ? { left: 12, right: 18 } : undefined}
                  height={isMobile ? 34 : undefined}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke={adminTokens.chartAxis}
                  tickFormatter={formatTokens}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 42 : undefined}
                />
                <Tooltip
                  formatter={(v: number) => [formatTokens(v), t('dashboard.tokens.unit')]}
                  contentStyle={isMobile ? adminChartTooltipStyle : undefined}
                  labelStyle={isMobile ? { color: '#0f172a', fontWeight: 600 } : undefined}
                  itemStyle={isMobile ? { fontVariantNumeric: 'tabular-nums' } : undefined}
                  wrapperStyle={isMobile ? { maxWidth: 'calc(100vw - 24px)' } : undefined}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke={adminTokens.chartBlueSoft}
                  strokeWidth={isMobile ? 2 : 2.5}
                  dot={false}
                  name={t('dashboard.tokens.unit')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCard>
      </div>

      {/* ---- Model Usage Ranking ---- */}
      {data.model_usage.length > 0 && (
        <>
          {isMobile ? (
            /* Mobile: list + progress bars */
            <AdminCard className="p-4">
              <h3 className="mb-[18px] flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <span className="text-[var(--theme-accent)]"><BarChart3 size={18} /></span>
                {t('dashboard.charts.modelRanking')}
              </h3>
              <ModelRankingMobile items={data.model_usage} />
            </AdminCard>
          ) : (
            /* Desktop: horizontal bar chart */
            <AdminChartCard title={t('dashboard.charts.modelRanking')} icon={<BarChart3 size={17} />}>
              <div ref={barChartRef}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.model_usage} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={adminTokens.chartGrid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke={adminTokens.chartAxis} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke={adminTokens.chartAxis} width={80} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), t('dashboard.charts.requests')]} />
                    <Bar dataKey="count" fill={adminTokens.chartBar} radius={[0, 7, 7, 0]} name={t('dashboard.charts.requests')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AdminChartCard>
          )}
        </>
      )}
    </AdminPage>
  );
}
