import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Clock3,
  RefreshCw,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import {
  DEFAULT_LOCALE,
  getDefaultLocalePath,
  getLocaleFromPath,
  isSupportedLocale,
} from '../utils/localePath';
import { fetchPublicChangelogs } from '../api/admin';
import type { PublicChangelogEntry } from '../types/admin';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  tone: string;
}

interface PageContent {
  title: string;
  subtitle: string;
  currentVersion: string;
  lastUpdated: string;
  changes: string;
  loading: string;
  empty: string;
}

type UpdateType = 'release' | 'feature' | 'improvement' | 'fix';

const toneStyles = {
  blue: {
    bullet: 'bg-blue-50 text-[#3155e7] dark:bg-blue-400/10 dark:text-blue-300',
  },
  emerald: {
    bullet: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  },
  amber: {
    bullet: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
  },
  violet: {
    bullet: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
  },
};

function mapAPIEntries(entries: PublicChangelogEntry[]): ChangelogEntry[] {
  return entries.map(entry => ({
    version: entry.version,
    date: entry.date,
    title: entry.title,
    summary: entry.summary || '',
    items: entry.items,
    tone: entry.tone || 'blue',
  }));
}

function getUpdateType(entry: ChangelogEntry): UpdateType {
  if (/^v?\d+(?:\.0){1,2}(?:\D|$)/i.test(entry.version)) return 'release';
  if (entry.tone === 'emerald') return 'improvement';
  if (entry.tone === 'amber') return 'fix';
  return 'feature';
}

function getTone(entry: ChangelogEntry) {
  if (getUpdateType(entry) === 'release') return toneStyles.violet;
  return toneStyles[entry.tone as keyof typeof toneStyles] || toneStyles.blue;
}

function getSummary(entry: ChangelogEntry, isEn: boolean) {
  if (entry.summary) return entry.summary;
  if (getUpdateType(entry) === 'release') {
    return isEn
      ? 'The first Pudding Resume release, with online resume creation, editing, and export.'
      : '首次发布 Pudding Resume，支持在线创建、编辑和导出简历。';
  }
  return '';
}

export default function ChangelogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const currentLocale = getLocaleFromPath(location.pathname)
    || (isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE);
  const isEn = currentLocale === 'en-US';
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const content: PageContent = isEn
    ? {
        title: 'Changelog',
        subtitle: 'Every new feature, experience improvement, and fix shipped in Pudding Resume.',
        currentVersion: 'Current version',
        lastUpdated: 'Last updated',
        changes: 'What changed',
        loading: 'Loading changelog...',
        empty: 'No updates yet',
      }
    : {
        title: '更新日志',
        subtitle: '记录每一次功能更新、体验优化和问题修复',
        currentVersion: '当前版本',
        lastUpdated: '最近更新',
        changes: '更新内容',
        loading: '加载更新日志...',
        empty: '暂无更新日志',
      };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetchPublicChangelogs();
        if (!cancelled) {
          setEntries(mapAPIEntries(response.entries ?? []));
        }
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isEn]);

  const latestEntry = entries[0];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-950 transition-colors duration-300 dark:text-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-[var(--bg-header)] backdrop-blur-xl transition-colors duration-300 dark:border-white/5">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate(getDefaultLocalePath(currentLocale))} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <main className="changelog-shell mx-auto w-full px-4 pb-14 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <section className="animate-fade-in-up border-b border-gray-200 pb-6 motion-reduce:animate-none dark:border-white/10 sm:pb-9">
          <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-gray-950 dark:text-slate-50 sm:text-[38px]">
            {content.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:mt-3 sm:text-base">
            {content.subtitle}
          </p>
          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:mt-5">
            <InlineMeta icon={Rocket} label={content.currentVersion} value={loading ? '—' : latestEntry?.version || '—'} />
            <span className="hidden h-4 w-px bg-gray-200 dark:bg-white/10 sm:block" />
            <InlineMeta icon={Clock3} label={content.lastUpdated} value={loading ? '—' : latestEntry?.date || '—'} />
          </dl>
        </section>

        <section aria-label={content.title} className="mt-7 sm:mt-12">
          {loading ? (
            <div className="flex max-w-[760px] items-center justify-center rounded-[20px] border border-gray-200 bg-white py-16 text-sm text-slate-400 shadow-[0_10px_30px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.04] sm:ml-[168px]">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {content.loading}
            </div>
          ) : entries.length === 0 ? (
            <div className="max-w-[760px] rounded-[20px] border border-dashed border-gray-300 bg-white/60 py-16 text-center text-sm text-slate-400 dark:border-white/15 dark:bg-white/[0.025] sm:ml-[168px]">{content.empty}</div>
          ) : (
            <div className="space-y-7 sm:space-y-9">
                {entries.map((entry, index) => {
                  const tone = getTone(entry);
                  const summary = getSummary(entry, isEn);
                  return (
                    <article key={`${entry.version}-${entry.date}-${index}`} className="changelog-timeline-item">
                      <time className="changelog-date hidden text-sm font-bold text-slate-600 dark:text-slate-300 sm:block sm:pt-5 sm:text-right">
                        {entry.date}
                      </time>

                      <div className="changelog-rail relative">
                        <span className={`absolute left-[7px] top-0 hidden w-px bg-gray-200 dark:bg-white/10 sm:block ${index === entries.length - 1 ? 'bottom-0' : 'bottom-0 sm:bottom-[-36px]'}`} />
                        <span
                          className="changelog-dot absolute left-0 top-0 h-[15px] w-[15px] animate-scale-in rounded-full bg-[#3155e7] ring-[5px] ring-[#e7ecff] motion-reduce:animate-none dark:ring-[#273052] sm:top-6"
                          style={{ animationDelay: `${Math.min(index, 6) * 70 + 80}ms` }}
                        />
                      </div>

                      <div
                        className="changelog-card animate-fade-in-up rounded-[20px] border border-gray-200/90 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_16px_38px_rgba(15,23,42,0.07)] motion-reduce:animate-none dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_16px_40px_rgba(0,0,0,0.14)] dark:hover:border-white/15 sm:p-7"
                        style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">{entry.version}</span>
                          <time className="ml-auto text-xs font-semibold text-slate-400 dark:text-slate-500 sm:hidden">
                            {entry.date}
                          </time>
                        </div>

                        <h3 className="mt-3 text-xl font-extrabold tracking-[-0.01em] text-gray-950 dark:text-slate-50 sm:mt-4 sm:text-2xl">{entry.title}</h3>
                        {summary && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:mt-2.5 sm:text-[15px]">{summary}</p>}

                        {entry.items.length > 0 && (
                          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/[0.07] sm:mt-6 sm:pt-5">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">{content.changes}</p>
                            <ul className="grid gap-2.5">
                            {entry.items.map((item, itemIndex) => (
                              <li key={`${item}-${itemIndex}`} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone.bullet}`}>
                                  <Check className="h-3 w-3 stroke-[2.5]" />
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function InlineMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="font-bold text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}
