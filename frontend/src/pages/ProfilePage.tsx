import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';

import { EditProfileModal } from './profile/EditProfileModal';
import { ChangePasswordModal } from './profile/ChangePasswordModal';
import { QuotaPanel } from './profile/QuotaPanel';
import { ProfileInfo } from './profile/ProfileInfo';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isLoggedIn, profile, profileLoading, sessionLoading, setProfile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation('auth');
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  // Auth guard: redirect to home if not logged in
  useEffect(() => {
    if (!sessionLoading && !isLoggedIn) {
      showToast(t('profile.pleaseLogin'), 'error');
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate, sessionLoading, showToast, t]);

  // Wait for silent session restore before deciding whether the user is logged in.
  if (sessionLoading || !isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[#111827] transition-colors duration-200 dark:text-slate-50">
      {/* ========== Header ========== */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-[var(--bg-header)] backdrop-blur-xl dark:border-white/5">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="pb-16 pt-20 sm:pt-24">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6" data-global-toolbar-content>
          {/* Page title with back button */}
          <div className="mb-7 sm:mb-8">
            {/* Back button — mobile */}
            {/* Back button + title — desktop */}
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] dark:text-slate-50 sm:text-[32px]">{i18n.language?.startsWith('en') ? 'Profile' : '个人中心'}</h1>
            <p className="mt-2 text-sm leading-6 text-[#64748B] dark:text-slate-400">{i18n.language?.startsWith('en') ? 'Manage your profile, account security, and quota in one place.' : '集中管理个人信息、账号安全和套餐用量。'}</p>
          </div>

          {/* Loading state */}
          {profileLoading && !profile && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          )}

          {/* Profile content */}
          {profile && (
            <div className="space-y-5 sm:space-y-6">
              <ProfileInfo
                profile={profile}
                onAvatarUpdate={(updatedProfile) => setProfile(updatedProfile)}
                onEdit={() => setEditOpen(true)}
                onChangePassword={() => setPasswordOpen(true)}
              />
              <QuotaPanel profile={profile} />
            </div>
          )}

          {/* Fallback: profile null but not loading (shouldn't normally happen) */}
          {!profileLoading && !profile && (
            <div className="text-center py-20">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('profile.cantLoadProfile')}</p>
              <button
                onClick={() => refreshProfile()}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {t('common:reload')}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onProfileUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
