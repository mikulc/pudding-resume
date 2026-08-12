import { useTranslation } from 'react-i18next';
import { CalendarDays, Pencil, LockKeyhole, Clock3, LogOut, UserX } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

import { AvatarSection } from './AvatarSection';

export function ProfileInfo({
  profile,
  onAvatarUpdate,
  onEdit,
  onChangePassword,
  onLogout,
  onDeactivate,
}: {
  profile: UserProfile;
  onAvatarUpdate: (profile: UserProfile) => void;
  onEdit: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onDeactivate: () => void;
}) {
  const { t, i18n } = useTranslation('auth');

  return (
    <aside className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="px-5 pb-5 pt-7 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <AvatarSection profile={profile} onAvatarUpdate={onAvatarUpdate} t={t} />
          <h2 className="mt-4 max-w-full truncate text-xl font-semibold tracking-tight text-[#111827] dark:text-white">
            {profile.username}
          </h2>
          <p className="mt-1.5 max-w-full truncate text-sm text-[#64748B] dark:text-slate-400">
            {profile.email}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {i18n.language?.startsWith('en') ? 'Active' : '账号正常'}
          </span>

          <button
            onClick={onEdit}
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-accent)] px-4 py-2 text-sm font-medium text-[var(--theme-accent-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:ring-offset-2"
          >
            <Pencil className="h-4 w-4" />
            {t('profile.editProfile')}
          </button>
        </div>
      </div>

      <div className="border-t border-[#EEF1F5] px-5 py-5 dark:border-white/[0.08] sm:px-6">
        <dl className="space-y-5">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue-500" />
            <div className="min-w-0">
              <dt className="text-xs text-[#94A3B8] dark:text-slate-500">{t('profile.registeredAt')}</dt>
              <dd className="mt-1 truncate text-sm font-medium tabular-nums text-[#334155] dark:text-slate-200">{profile.created_at}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-violet-500" />
            <div className="min-w-0">
              <dt className="text-xs text-[#94A3B8] dark:text-slate-500">{t('profile.lastLogin')}</dt>
              <dd className="mt-1 truncate text-sm font-medium tabular-nums text-[#334155] dark:text-slate-200">{profile.last_login_at || t('profile.noLoginRecord')}</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="border-t border-[#EEF1F5] p-3 dark:border-white/[0.08]">
        <button onClick={onChangePassword} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#475569] transition hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-white/[0.06]">
          <LockKeyhole className="h-[18px] w-[18px]" />
          {t('profile.changePassword')}
        </button>
        <button onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#475569] transition hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-white/[0.06]">
          <LogOut className="h-[18px] w-[18px]" />
          {t('logout')}
        </button>
        <button onClick={onDeactivate} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#94A3B8] transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-300">
          <UserX className="h-[18px] w-[18px]" />
          {t('profile.deactivateAccount')}
        </button>
      </div>
    </aside>
  );
}

// ========================
// Profile Page
// ========================
