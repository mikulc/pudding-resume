
import { useTranslation } from 'react-i18next';
import { Calendar, Pencil, Lock, Clock, UserX } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

import { AvatarSection } from './AvatarSection';

export function ProfileInfo({
  profile,
  onAvatarUpdate,
  onEdit,
  onChangePassword,
  onDeactivate,
}: {
  profile: UserProfile;
  onAvatarUpdate: (profile: UserProfile) => void;
  onEdit: () => void;
  onChangePassword: () => void;
  onDeactivate: () => void;
}) {
  const { t, i18n } = useTranslation('auth');
  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="relative p-5 sm:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-72 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_68%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_68%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <AvatarSection profile={profile} onAvatarUpdate={onAvatarUpdate} t={t} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight text-[#111827] dark:text-white">{profile.username}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{i18n.language?.startsWith('en') ? 'Active' : '账号正常'}</span>
            </div>
            <p className="mt-1.5 truncate text-sm text-[#64748B] dark:text-slate-400">{profile.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button onClick={onEdit} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#253044] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Pencil className="h-4 w-4" />{t('profile.editProfile')}</button>
            <button onClick={onChangePassword} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E2E7EE] bg-white px-4 py-2 text-sm font-medium text-[#475569] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"><Lock className="h-4 w-4" />{t('profile.changePassword')}</button>
            <button onClick={onDeactivate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-white/[0.04] dark:text-red-300 dark:hover:bg-red-500/10"><UserX className="h-4 w-4" />{t('profile.deactivateAccount')}</button>
          </div>
        </div>
      </div>
      <div className="grid border-t border-[#EEF1F5] bg-[#FAFBFC] dark:border-white/[0.08] dark:bg-white/[0.02] sm:grid-cols-2">
        <div className="flex items-center gap-3 border-b border-[#EEF1F5] px-5 py-4 dark:border-white/[0.08] sm:border-b-0 sm:border-r sm:px-7"><Calendar className="h-[18px] w-[18px] shrink-0 text-blue-500" /><div><p className="text-xs text-[#94A3B8] dark:text-slate-500">{t('profile.registeredAt')}</p><p className="mt-1 text-sm font-medium tabular-nums text-[#334155] dark:text-slate-200">{profile.created_at}</p></div></div>
        <div className="flex items-center gap-3 border-b border-[#EEF1F5] px-5 py-4 dark:border-white/[0.08] sm:border-b-0 sm:px-7"><Clock className="h-[18px] w-[18px] shrink-0 text-violet-500" /><div><p className="text-xs text-[#94A3B8] dark:text-slate-500">{t('profile.lastLogin')}</p><p className="mt-1 text-sm font-medium tabular-nums text-[#334155] dark:text-slate-200">{profile.last_login_at || t('profile.noLoginRecord')}</p></div></div>
      </div>
    </section>
  );
}

// ========================
// Profile Page
// ========================
