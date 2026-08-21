import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pause, Play, RefreshCw, Search } from 'lucide-react';
import { fetchAdminLogs } from '../../api/admin';
import type { AdminLogEntry } from '../../types/admin';
import { getErrorMessage } from '../../utils/errors';
import {
  AdminBadge, AdminButton, AdminCard, AdminInput, AdminPage, AdminPageHeader, AdminSelect,
} from './adminStyles';

function displayLogMessage(entry: AdminLogEntry): string {
  const attrs = entry.attributes;
  if (entry.message === 'http_request' && attrs?.method && attrs.path) {
    const latency = attrs.latency ? ` · ${String(attrs.latency)}` : '';
    return `${String(attrs.method)} ${String(attrs.path)} · ${String(attrs.status ?? '')}${latency}`;
  }
  return entry.message;
}

export default function LogsPage() {
  const { t, i18n } = useTranslation('admin');
  const [entries, setEntries] = useState<AdminLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [dropped, setDropped] = useState(0);
  const [level, setLevel] = useState('');
  const [source, setSource] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestNumber = useRef(0);
  const cursor = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const followsTail = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (incremental = false) => {
    const currentRequest = ++requestNumber.current;
    if (!incremental) setLoading(true);
    try {
      const result = await fetchAdminLogs({
        limit: incremental ? 200 : 300,
        after: incremental ? cursor.current : undefined,
        level,
        source,
        query: debouncedQuery,
      });
      if (currentRequest !== requestNumber.current) return;
      const incoming = result.entries ?? [];
      const processRestarted = incremental && (result.next_cursor ?? 0) < cursor.current;
      setEntries((current) => incremental && !processRestarted ? [...current, ...incoming].slice(-500) : incoming);
      setTotal(result.total ?? 0);
      setDropped(result.dropped ?? 0);
      cursor.current = result.next_cursor ?? result.total ?? cursor.current;
      setError('');
    } catch (loadError) {
      if (currentRequest !== requestNumber.current) return;
      setError(getErrorMessage(loadError, t('logs.loadFailed')));
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, [debouncedQuery, level, source, t]);

  useEffect(() => {
    cursor.current = 0;
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void load(true), 3000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  useEffect(() => {
    if (!followsTail.current || entries.length === 0) return;
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [entries]);

  const timeFormatter = new Intl.DateTimeFormat(i18n.language, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  return (
    <AdminPage>
      <AdminPageHeader
        title={t('logs.title')}
        description={t('logs.subtitle')}
        meta={(
          <div className="flex items-center gap-2">
            <AdminBadge tone={autoRefresh ? 'success' : 'neutral'}>
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {t(autoRefresh ? 'logs.live' : 'logs.paused')}
            </AdminBadge>
            <AdminBadge tone="neutral">{t('logs.total', { count: total })}</AdminBadge>
          </div>
        )}
        actions={(
          <div className="flex gap-2">
            <AdminButton onClick={() => setAutoRefresh((value) => !value)}>
              {autoRefresh ? <Pause size={15} /> : <Play size={15} />}
              {t(autoRefresh ? 'logs.pause' : 'logs.resume')}
            </AdminButton>
            <AdminButton onClick={() => void load(false)} disabled={loading} aria-label={t('logs.refresh')}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t('logs.refresh')}</span>
            </AdminButton>
          </div>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <AdminInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('logs.search')}
            className="w-full pl-9"
          />
        </div>
        <AdminSelect
          value={level}
          onChange={setLevel}
          ariaLabel={t('logs.level.label')}
          options={['', 'debug', 'info', 'warn', 'error'].map((value) => ({
            value, label: t(`logs.level.${value || 'all'}`),
          }))}
        />
        <AdminSelect
          value={source}
          onChange={setSource}
          ariaLabel={t('logs.source.label')}
          options={['', 'app', 'http'].map((value) => ({
            value, label: t(`logs.source.${value || 'all'}`),
          }))}
        />
      </div>

      {dropped > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-300">{t('logs.dropped', { count: dropped })}</p>
      )}
      {error && (
        <AdminCard className="border-red-200 p-4 text-sm text-red-600 dark:border-red-900/50 dark:text-red-300">
          {error}
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden bg-slate-950 dark:bg-black">
        <div
          ref={viewportRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            followsTail.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
          }}
          className="max-h-[calc(100vh-330px)] min-h-[420px] overflow-auto p-3 font-mono text-xs leading-5 sm:p-4"
        >
          {!loading && entries.length === 0 && (
            <div className="flex min-h-[380px] items-center justify-center text-slate-500">{t('logs.empty')}</div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[114px_52px_44px_minmax(0,1fr)] gap-2 border-b border-white/[0.04] py-1 text-slate-300 last:border-0">
              <time className="text-slate-500" dateTime={entry.timestamp}>{timeFormatter.format(new Date(entry.timestamp))}</time>
              <span className={{ debug: 'text-slate-500', info: 'text-sky-400', warn: 'text-amber-400', error: 'text-red-400' }[entry.level]}>
                {entry.level.toUpperCase()}
              </span>
              <span className="text-violet-400">{t(`logs.source.${entry.source}`)}</span>
              <span className="min-w-0 break-words whitespace-pre-wrap">
                {displayLogMessage(entry)}
                {Object.entries(entry.attributes ?? {}).length > 0 && (
                  <details className="mt-0.5 text-[11px] text-slate-500">
                    <summary className="cursor-pointer select-none text-slate-600 hover:text-slate-400">
                      {t('logs.details', { count: Object.keys(entry.attributes ?? {}).length })}
                    </summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[11px] leading-4 text-slate-400">
                      {JSON.stringify(entry.attributes, null, 2)}
                    </pre>
                  </details>
                )}
              </span>
            </div>
          ))}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
