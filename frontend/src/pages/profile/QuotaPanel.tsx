import { useTranslation } from 'react-i18next';
import { Download, FileText, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

function formatQuotaNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0);
}

function quotaPercent(used: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export function QuotaPanel({ profile }: { profile: UserProfile }) {
  const { i18n } = useTranslation('auth');
  const isEnglish = i18n.language?.startsWith('en');
  const copy = isEnglish
    ? {
      title: 'Usage & quota',
      resume: 'Resumes',
      resumeQuota: 'Resume quota',
      export: 'Exports',
      token: 'AI',
      used: 'Used',
      remaining: 'Remaining',
      unlimited: 'Unlimited',
    }
    : {
      title: '用量与额度',
      resume: '简历',
      resumeQuota: '简历额度',
      export: '导出',
      token: 'AI',
      used: '已使用',
      remaining: '剩余',
      unlimited: '不限',
    };

  const maxResumes = profile.max_resumes ?? 0;
  const usedResumes = profile.used_resumes ?? 0;
  const resumesUnlimited = maxResumes <= 0;
  const remaining = Math.max(maxResumes - usedResumes, 0);
  const resumePercent = quotaPercent(usedResumes, maxResumes);
  const dailyLimit = profile.daily_limit_tokens ?? 0;
  const monthlyLimit = profile.monthly_limit_tokens ?? 0;
  const tokensUnlimited = dailyLimit <= 0 && monthlyLimit <= 0;

  const overview = [
    {
      label: copy.resume,
      value: resumesUnlimited ? copy.unlimited : formatQuotaNumber(remaining),
      icon: FileText,
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    {
      label: copy.export,
      value: formatQuotaNumber(profile.export_count ?? 0),
      icon: Download,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      label: copy.token,
      value: tokensUnlimited ? copy.unlimited : formatQuotaNumber(Math.max(dailyLimit, monthlyLimit)),
      icon: Sparkles,
      tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-[#EEF1F5] px-5 py-5 dark:border-white/[0.08] sm:px-7">
        <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">{copy.title}</h2>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {overview.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="group rounded-2xl border border-[#E9EDF3] bg-[#FAFBFC] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D7DEE8] hover:shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.16] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#64748B] dark:text-slate-400">{label}</p>
                  <p className="mt-2 truncate text-[24px] font-semibold leading-none tracking-tight tabular-nums text-[#111827] dark:text-white">{value}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.resumeQuota}</h3>
            <span className="text-xs font-semibold tabular-nums text-blue-600 dark:text-blue-300">
              {resumesUnlimited ? copy.unlimited : `${resumePercent}%`}
            </span>
          </div>
          {resumesUnlimited ? (
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
              <InfinityIcon className="h-5 w-5" />
              {copy.unlimited}
            </div>
          ) : (
            <>
              <div
                className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#E9EFF7] dark:bg-white/[0.08]"
                role="progressbar"
                aria-label={copy.resumeQuota}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={resumePercent}
              >
                <div
                  className="h-full min-w-[3px] rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-[width] duration-500"
                  style={{ width: `${Math.max(resumePercent, usedResumes > 0 ? 0.5 : 0)}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-[#64748B] dark:text-slate-400">
                <span>{copy.used} {formatQuotaNumber(usedResumes)}</span>
                <span>{copy.remaining} {formatQuotaNumber(remaining)}</span>
              </div>
            </>
          )}
        </div>

        {!tokensUnlimited && (
          <div className="mt-7 border-t border-[#EEF1F5] pt-5 text-xs text-[#94A3B8] dark:border-white/[0.08] dark:text-slate-500">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {dailyLimit > 0 && <span>{isEnglish ? 'Daily AI quota' : 'AI 每日额度'} · {formatQuotaNumber(dailyLimit)}</span>}
              {monthlyLimit > 0 && <span>{isEnglish ? 'Monthly AI quota' : 'AI 每月额度'} · {formatQuotaNumber(monthlyLimit)}</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
