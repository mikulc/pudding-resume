import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { fetchGlobalAIUsage, fetchAuditLogs } from '../../api/admin';
import type { AdminAIUsageResponse, AuditLogItem } from '../../types/admin';
import { useLocation } from 'react-router-dom';
import {
  RefreshCw, Zap, TrendingUp, BarChart3, Users,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import {
  AdminBadge, AdminChartCard, AdminMonthPicker, AdminPage,
  AdminPageHeader, AdminSelect, AdminStatCard, AdminTableCard,
  adminTableHeadClass, adminTableRowClass, adminTokens,
} from './adminStyles';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MobileAuditCardList } from './MobileAuditCardList';
import {
  adminChartTooltipStyle,
  formatDateAxisTick,
  mobileDateChartMargin,
  selectMobileDateTicks,
  useChartResizeObserver,
} from './dateChartUtils';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function UsagePage() {
  useAuth();
  const location = useLocation();
  const isAuditTab = location.pathname === '/admin/audit';

  if (isAuditTab) return <AuditLogPage />;
  return <AIUsageContent />;
}

function AIUsageContent() {
  const { isLoggedIn, role } = useAuth();
  const { t } = useTranslation('admin');
  const [data, setData] = useState<AdminAIUsageResponse | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const isMobile = useMediaQuery('(max-width: 767px)');
  const dailyChartRef = useChartResizeObserver();

  const load = useCallback(async () => {
    try {
      const d = await fetchGlobalAIUsage(month);
      setData(d);
    } catch { /* ignore */ }
  }, [month]);

  useEffect(() => {
    if (isLoggedIn && role === 'admin') load();
  }, [isLoggedIn, role, load]);

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  const dailyTrend = useMemo(
    () => aggregateDailyTrend(data?.daily_trend ?? []),
    [data?.daily_trend],
  );
  const dailyTicks = isMobile
    ? selectMobileDateTicks(dailyTrend.map((item) => item.date))
    : undefined;

  if (!data) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-gray-400" size={32} /></div>;

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('usage.title')}
        description={t('usage.subtitle')}
        actions={<AdminMonthPicker value={month} onChange={setMonth} />}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { labelKey: 'usage.metrics.todayRequests', value: data.today.request_count.toLocaleString(), icon: Zap, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
          { labelKey: 'usage.metrics.monthTokens', value: formatTokens(data.month.total_tokens), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { labelKey: 'usage.metrics.totalTokens', value: formatTokens(data.total.total_tokens), icon: BarChart3, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
        ].map((c, index) => <AdminStatCard key={c.labelKey} label={t(c.labelKey)} value={c.value} icon={c.icon} tone={index === 0 ? 'blue' : index === 1 ? 'emerald' : 'violet'} />)}
      </div>

      {/* Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminChartCard title={t('usage.charts.provider')}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.providers.filter(p => p.total_tokens > 0)} dataKey="total_tokens" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, total_tokens }: any) => `${label}: ${formatTokens(total_tokens)}`}>
                {data.providers.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [formatTokens(v), t('usage.metrics.unit')]} />
            </PieChart>
          </ResponsiveContainer>
        </AdminChartCard>

        <AdminChartCard title={t('usage.charts.modelRanking')}>
          <ModelUsageRankingChart
            models={data.models.slice(0, 10)}
            formatTokens={formatTokens}
            unitLabel={t('usage.metrics.unit')}
          />
        </AdminChartCard>
      </div>

      {/* Daily Trend */}
      <AdminChartCard title={t('usage.charts.dailyTrend')}>
        <div ref={dailyChartRef}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrend} margin={isMobile ? mobileDateChartMargin : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke={adminTokens.chartGrid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={isMobile ? { fontSize: 11, fill: '#94a3b8' } : { fontSize: 11 }}
                stroke="#9ca3af"
                axisLine={isMobile ? false : undefined}
                tickLine={isMobile ? false : undefined}
                ticks={dailyTicks}
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
                stroke="#9ca3af"
                tickFormatter={formatTokens}
                axisLine={isMobile ? false : undefined}
                tickLine={isMobile ? false : undefined}
                width={isMobile ? 42 : undefined}
              />
              <Tooltip
                formatter={(v: number) => [formatTokens(v), t('usage.metrics.unit')]}
                contentStyle={isMobile ? adminChartTooltipStyle : undefined}
                labelStyle={isMobile ? { color: '#0f172a', fontWeight: 600 } : undefined}
                itemStyle={isMobile ? { fontVariantNumeric: 'tabular-nums' } : undefined}
                wrapperStyle={isMobile ? { maxWidth: 'calc(100vw - 24px)' } : undefined}
                allowEscapeViewBox={{ x: false, y: false }}
              />
              <Line type="monotone" dataKey="total_tokens" stroke={adminTokens.chartBlue} strokeWidth={2.5} dot={false} name={t('usage.metrics.unit')} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AdminChartCard>

      {/* Top Users */}
      {data.top_users.length > 0 && (
        <AdminChartCard title={t('usage.charts.topUsers')} icon={<Users size={17} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="text-left py-2 font-medium">{t('usage.topUsersTable.rank')}</th>
                  <th className="text-left py-2 font-medium">{t('usage.topUsersTable.user')}</th>
                  <th className="text-right py-2 font-medium">{t('usage.topUsersTable.requests')}</th>
                  <th className="text-right py-2 font-medium">{t('usage.topUsersTable.tokens')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.top_users.map((u, idx) => (
                  <tr key={u.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="py-2 text-gray-400 w-8">{idx + 1}</td>
                    <td className="py-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{u.username}</span>
                      {u.email && <span className="text-xs text-gray-400 ml-2">{u.email}</span>}
                    </td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400">{u.requests.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-gray-800 dark:text-gray-200">{u.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminChartCard>
      )}
    </AdminPage>
  );
}

const MODEL_AXIS_WIDTH = 100;
const MODEL_LABEL_MAX_CHARACTERS = 16;

function truncateModelName(model: string) {
  return model.length > MODEL_LABEL_MAX_CHARACTERS
    ? `${model.slice(0, MODEL_LABEL_MAX_CHARACTERS - 1)}…`
    : model;
}

function ModelUsageRankingChart({
  models,
  formatTokens,
  unitLabel,
}: {
  models: AdminAIUsageResponse['models'];
  formatTokens: (value: number) => string;
  unitLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrame = 0;
    const updateWidth = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        setChartWidth(Math.floor(container.getBoundingClientRect().width));
      });
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="h-[250px] w-full min-w-0">
      {chartWidth > 0 && (
        <BarChart
          width={chartWidth}
          height={250}
          data={models}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 0, left: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={adminTokens.chartGrid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={formatTokens} />
          <YAxis
            type="category"
            dataKey="model"
            tick={{ fontSize: 10 }}
            tickFormatter={truncateModelName}
            tickMargin={8}
            stroke="#9ca3af"
            width={MODEL_AXIS_WIDTH}
          />
          <Tooltip
            labelFormatter={(model) => String(model)}
            formatter={(v: number) => [formatTokens(v), unitLabel]}
          />
          <Bar dataKey="total_tokens" fill={adminTokens.chartPurpleSoft} radius={[0, 7, 7, 0]} name={unitLabel} />
        </BarChart>
      )}
    </div>
  );
}

/** Aggregate daily trend by date only */
function aggregateDailyTrend(trend: Array<{ date: string; total_tokens: number }>) {
  const map: Record<string, number> = {};
  trend.forEach(t => { map[t.date] = (map[t.date] || 0) + t.total_tokens; });
  return Object.entries(map).map(([date, total_tokens]) => ({ date, total_tokens })).sort((a, b) => a.date.localeCompare(b.date));
}

// --- Audit Logs ---
const PAGE_SIZE = 20;

function AuditLogPage() {
  const { isLoggedIn, role } = useAuth();
  const { t } = useTranslation('admin');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p?: number) => {
    const currentPage = p ?? page;
    setLoading(true);
    try {
      const res = await fetchAuditLogs({ page: currentPage, size: PAGE_SIZE, action: action || undefined });
      setLogs(res.logs);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [action, page]);

  useEffect(() => {
    if (isLoggedIn && role === 'admin') load();
  }, [isLoggedIn, role, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasMore = page < totalPages;
  const hasFilter = action !== '';

  const actionKeys = [
    'user_delete', 'quota_update', 'role_update',
    'force_logout', 'password_reset',
    'model_create', 'model_update', 'model_delete', 'model_balance_refresh',
    'changelog_create', 'changelog_update', 'changelog_delete',
  ];
  const actionLabel = (key: string) => t(`usage.audit.actions.${key}`);

  // --- Desktop table ---
  const desktopTable = (
    <AdminTableCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('usage.audit.table.admin')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('usage.audit.table.action')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('usage.audit.table.target')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('usage.audit.table.ip')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('usage.audit.table.time')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map(l => (
              <tr key={l.id} className={adminTableRowClass}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{l.admin_name}</td>
                <td className="px-4 py-3">
                  <AdminBadge>{actionLabel(l.action)}</AdminBadge>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                  {l.target_name || l.target_id?.slice(0, 8) || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{l.ip}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{l.created_at}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">{t('usage.audit.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <span className="text-sm text-gray-500">{t('usage.audit.pagination', { page, totalPages })}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">{t('usage.audit.prev')}</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">{t('usage.audit.next')}</button>
          </div>
        </div>
      )}
    </AdminTableCard>
  );

  return (
    <AdminPage>
      {/* Page Header */}
      <AdminPageHeader
        title={t('usage.audit.title')}
        description={t('usage.audit.subtitle')}
        meta={<AdminBadge>{t('usage.audit.recordCount', { count: total })}</AdminBadge>}
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <AdminSelect
          value={action}
          onChange={value => { setAction(value); setPage(1); }}
          options={[
            { value: '', label: t('usage.audit.actionAll') },
            ...actionKeys.map(key => ({ value: key, label: actionLabel(key) })),
          ]}
          className="flex-1 sm:flex-none sm:min-w-[152px]"
        />
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">{desktopTable}</div>

      {/* Mobile: card list */}
      <div className="md:hidden">
        <MobileAuditCardList
          logs={logs}
          loading={loading}
          hasFilter={hasFilter}
          actionLabel={actionLabel}
          labelTarget={t('usage.audit.table.target')}
          labelIp={t('usage.audit.table.ip')}
          labelOriginalAction={t('usage.audit.originalAction')}
          emptyText={t('usage.audit.empty')}
          noResultText={t('usage.audit.noResult')}
        />

        {/* Mobile: Load More */}
        {hasMore && logs.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E6EAF2] bg-white px-5 text-sm text-slate-500 hover:bg-[#F8FAFF] hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading && <RefreshCw size={14} className="animate-spin" />}
              {t('usage.audit.loadMore')}
            </button>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
