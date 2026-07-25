
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

// ========================
// Quota Card
// ========================

export function QuotaPanel({ profile }: { profile: UserProfile }) {
  const { i18n } = useTranslation('auth');
  const isEnglish = i18n.language?.startsWith('en');
  const copy = isEnglish
    ? {
      title: 'Usage & quota', desc: 'A clear overview of your current plan', updated: 'Updated', unavailable: 'Not available',
      resume: 'Resume slots', export: 'Exports', token: 'AI Tokens', used: 'Used', remaining: 'Available', unlimited: 'Unlimited',
      daily: 'Daily limit', monthly: 'Monthly limit', unlimitedNote: 'AI Token usage is unlimited on your current plan', times: 'times',
    }
    : {
      title: '用量与额度', desc: '清晰掌握当前套餐的使用情况', updated: '更新于', unavailable: '暂无记录',
      resume: '简历额度', export: '导出次数', token: 'AI Token', used: '已使用', remaining: '可用', unlimited: '不限',
      daily: '每日额度', monthly: '每月额度', unlimitedNote: '当前套餐不限制 AI Token 使用', times: '次',
    };

  const maxResumes = profile.max_resumes ?? 0;
  const usedResumes = profile.used_resumes ?? 0;
  const resumesUnlimited = maxResumes <= 0;
  const remaining = Math.max(maxResumes - usedResumes, 0);
  const resumePercent = quotaPercent(usedResumes, maxResumes);
  const dailyLimit = profile.daily_limit_tokens ?? 0;
  const monthlyLimit = profile.monthly_limit_tokens ?? 0;
  const tokensUnlimited = dailyLimit <= 0 && monthlyLimit <= 0;
  const usage = profile as UserProfile & { daily_used_tokens?: number; monthly_used_tokens?: number };

  const overview = [
    {
      label: copy.resume,
      value: resumesUnlimited ? copy.unlimited : formatQuotaNumber(remaining),
      hint: resumesUnlimited ? copy.unlimited : `${copy.used} ${formatQuotaNumber(usedResumes)} / ${formatQuotaNumber(maxResumes)}`,
      icon: FileText,
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    {
      label: copy.export,
      value: formatQuotaNumber(profile.export_count ?? 0),
      hint: copy.remaining,
      icon: Download,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      label: copy.token,
      value: tokensUnlimited ? copy.unlimited : formatQuotaNumber(Math.max(dailyLimit, monthlyLimit)),
      hint: tokensUnlimited ? copy.unlimitedNote : isEnglish ? 'Plan limit' : '套餐上限',
      icon: Sparkles,
      tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    },
  ];

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="flex flex-col gap-2 border-b border-[#EEF1F5] px-5 py-5 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">{copy.title}</h2>
          <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">{copy.desc}</p>
        </div>
        <p className="shrink-0 text-xs text-[#94A3B8] dark:text-slate-500">{copy.updated} · {profile.quota_updated_at || copy.unavailable}</p>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid gap-3 md:grid-cols-3">
          {overview.map(({ label, value, hint, icon: Icon, tone }) => (
            <div key={label} className="group rounded-2xl border border-[#E9EDF3] bg-[#FAFBFC] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D7DEE8] hover:shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.16] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-slate-400">{label}</p>
                  <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight tabular-nums text-[#111827] dark:text-white">{value}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" /></div>
              </div>
              <p className="mt-3 min-h-4 truncate text-xs text-[#94A3B8] dark:text-slate-500">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#E9EDF3] p-5 dark:border-white/[0.08] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.resume}</h3>
                <p className="mt-1 text-xs text-[#94A3B8] dark:text-slate-500">{resumesUnlimited ? copy.unlimitedNote : `${copy.used} ${formatQuotaNumber(usedResumes)} ${copy.times}`}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">{resumesUnlimited ? copy.unlimited : `${resumePercent}%`}</span>
            </div>
            {resumesUnlimited ? (
              <div className="mt-6 flex items-center gap-2 text-lg font-semibold text-blue-600 dark:text-blue-300"><InfinityIcon className="h-5 w-5" />{copy.unlimited}</div>
            ) : (
              <>
                <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-[#E9EFF7] dark:bg-white/[0.08]"><div className="h-full min-w-[3px] rounded-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${Math.max(resumePercent, usedResumes > 0 ? 0.5 : 0)}%` }} /></div>
                <div className="mt-3 flex justify-between text-xs text-[#64748B] dark:text-slate-400"><span>{copy.used} {formatQuotaNumber(usedResumes)}</span><span>{copy.remaining} {formatQuotaNumber(remaining)}</span></div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-[#E9EDF3] p-5 dark:border-white/[0.08] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{copy.token}</h3><p className="mt-1 text-xs text-[#94A3B8] dark:text-slate-500">{tokensUnlimited ? copy.unlimitedNote : isEnglish ? 'Token usage limits' : 'Token 使用上限'}</p></div>
              <Sparkles className="h-4 w-4 text-violet-500" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[[copy.daily, dailyLimit, usage.daily_used_tokens], [copy.monthly, monthlyLimit, usage.monthly_used_tokens]].map(([label, limit, used]) => (
                <div key={label as string} className="rounded-xl bg-violet-50/60 px-3.5 py-3 dark:bg-violet-500/[0.08]">
                  <p className="text-xs text-[#64748B] dark:text-slate-400">{label as string}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-base font-semibold tabular-nums text-violet-600 dark:text-violet-300">{(limit as number) <= 0 ? <><InfinityIcon className="h-4 w-4" />{copy.unlimited}</> : typeof used === 'number' ? `${formatQuotaNumber(used as number)} / ${formatQuotaNumber(limit as number)}` : formatQuotaNumber(limit as number)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

