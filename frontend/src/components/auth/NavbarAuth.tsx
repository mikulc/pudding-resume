import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FileText, LayoutTemplate, LogOut, Settings, User, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmModal';
import { getLocaleFromPath } from '../../utils/localePath';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface NavbarSettingsShortcut {
  label: string;
  onClick: () => void;
}

interface NavbarAuthProps {
  compact?: boolean;
  hideUsernameOnMobile?: boolean;
  settingsShortcut?: NavbarSettingsShortcut;
}

/**
 * Reusable navbar auth section:
 * - When logged out: shows "登录" (secondary) + "注册" (primary) buttons
 * - When logged in: shows avatar + name dropdown with user info and logout
 */
const API_BASE = import.meta.env.VITE_API_BASE || '';

function getAvatarSrc(avatar: string): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${API_BASE}${avatar}`;
}

/** Renders dropdown via portal so it escapes header stacking context */
function LoggedInNavbar({
  avatarSrc,
  username,
  isOnNavPage,
  profileDropdownOpen,
  setProfileDropdownOpen,
  profileDropdownRef,
  dropdownMenu,
  compact = false,
  hideUsernameOnMobile = false,
}: {
  avatarSrc: string | null;
  username: string | null | undefined;
  isOnNavPage: boolean;
  profileDropdownOpen: boolean;
  setProfileDropdownOpen: (open: boolean) => void;
  profileDropdownRef: React.RefObject<HTMLDivElement>;
  dropdownMenu: React.ReactNode;
  compact?: boolean;
  hideUsernameOnMobile?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  const closingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setExiting(true);
    window.setTimeout(() => {
      closingRef.current = false;
      setExiting(false);
      setProfileDropdownOpen(false);
    }, 170);
  }, [setProfileDropdownOpen]);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: 0,
    right: 0,
    zIndex: 9999,
    visibility: 'hidden',
    pointerEvents: 'none',
  });

  // Calculate portal dropdown position based on trigger button rect
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
      visibility: 'visible',
      pointerEvents: 'auto',
    });
  }, []);

  // Position before paint so the portal never briefly participates in body layout.
  useLayoutEffect(() => {
    if (!profileDropdownOpen) return;
    updatePosition();
  }, [profileDropdownOpen, updatePosition]);

  // Update position when dropdown opens and on scroll/resize
  useEffect(() => {
    if (!profileDropdownOpen) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [profileDropdownOpen, updatePosition]);

  useOutsideClick({
    open: profileDropdownOpen,
    refs: [profileDropdownRef, portalRef],
    onOutsideClick: requestClose,
  });

  // Close dropdown on Escape
  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [profileDropdownOpen, requestClose]);

  return (
    <div className="relative shrink-0" ref={profileDropdownRef}>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          ref={triggerRef}
          onClick={() => {
            if (profileDropdownOpen) {
              requestClose();
            } else {
              updatePosition();
              setProfileDropdownOpen(true);
            }
          }}
          className={`flex shrink-0 items-center gap-2 text-sm transition-colors ${
            isOnNavPage ? 'text-[#2563eb] dark:text-[#fbbf24]' : 'text-gray-600 hover:text-[#2563eb] dark:text-slate-300 dark:hover:text-[#fbbf24]'
          }`}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={username || ''}
              className={`rounded-full object-cover border border-gray-200 dark:border-white/[0.12] ${compact ? 'w-8 h-8' : 'w-7 h-7'}`}
            />
          ) : (
            <div className={`rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-gray-200 flex items-center justify-center dark:border-white/[0.12] dark:from-blue-500/20 dark:to-indigo-500/20 ${compact ? 'w-8 h-8' : 'w-7 h-7'}`}>
              <User className={compact ? 'w-4 h-4 text-gray-400 dark:text-slate-400' : 'w-3.5 h-3.5 text-gray-400 dark:text-slate-400'} />
            </div>
          )}
          {!compact && (
            <span className={`max-w-[140px] truncate font-medium ${hideUsernameOnMobile ? 'hidden md:inline' : ''}`}>
              {username}
            </span>
          )}
        </button>
      </div>
      {profileDropdownOpen &&
        createPortal(
          <div
            ref={portalRef}
            className="navbar-avatar-dropdown min-w-[220px] overflow-hidden rounded-[20px] border border-white/55 bg-white/70 py-1 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-2xl backdrop-saturate-150"
            style={{ ...dropdownStyle, animation: exiting ? 'avatar-dropdown-exit 0.16s ease-in forwards' : 'avatar-dropdown-appear 0.18s ease-out' }}
          >
            {dropdownMenu}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function NavbarAuth({ compact = false, hideUsernameOnMobile = true, settingsShortcut }: NavbarAuthProps) {
  const { isLoggedIn, username, profile, role, logout, sessionLoading } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('auth');
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  void settingsShortcut;

  // Switch between modals
  const switchToRegister = () => {
    const locale = getLocaleFromPath(location.pathname);
    if (locale) {
      navigate(`/${locale}/register`, { replace: true });
      return;
    }
    setShowLogin(false);
    setShowRegister(true);
  };
  const switchToLogin = () => {
    const locale = getLocaleFromPath(location.pathname);
    if (locale) {
      navigate(`/${locale}/login`, { replace: true });
      return;
    }
    setShowRegister(false);
    setShowLogin(true);
  };

  const openLogin = () => {
    const locale = getLocaleFromPath(location.pathname);
    if (locale) {
      navigate(`/${locale}/login`);
      return;
    }
    setShowLogin(true);
  };

  const openRegister = () => {
    const locale = getLocaleFromPath(location.pathname);
    if (locale) {
      navigate(`/${locale}/register`);
      return;
    }
    setShowRegister(true);
  };

  // Logout with confirmation
  const handleLogout = async () => {
    const confirmed = await confirm({
      title: t('common:dialog.logout.title'),
      message: t('common:dialog.logout.message'),
      confirmText: t('common:dialog.logout.confirm'),
      confirmVariant: 'danger',
    });
    if (confirmed) {
      logout();
      showToast(t('logoutSuccess'), 'info');
    }
  };

  if (sessionLoading) {
    return null;
  }

  // Logged-in state
  if (isLoggedIn) {
    const avatarSrc = getAvatarSrc(profile?.avatar || '');
    const currentPath = location.pathname;

    // Dropdown trigger active state: blue when on any nav page
    const isOnNavPage = ['/profile', '/settings', '/ai-usage'].some(p => currentPath.startsWith(p));

    // Shared user info header for dropdowns
    const userInfoHeader = (
      <div className="border-b border-white/40 bg-white/20 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={username || ''}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0 dark:border-white/[0.12]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-gray-200 flex items-center justify-center flex-shrink-0 dark:border-white/[0.12] dark:from-blue-500/20 dark:to-indigo-500/20">
              <User className="w-5 h-5 text-gray-400 dark:text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate dark:text-white/92">{username}</p>
            {profile?.email && (
              <p className="text-xs text-gray-400 truncate dark:text-white/62">{profile.email}</p>
            )}
          </div>
        </div>
      </div>
    );

    const closeDropdown = () => setProfileDropdownOpen(false);

    const dropdownMenu = (
      <>
        {userInfoHeader}
        <div className="px-1.5 pb-0.5">
          <div className="md:hidden">
            <button
              onClick={() => { closeDropdown(); navigate('/resumes'); }}
              className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:text-white/88 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
            >
              <FileText className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
              {t('resume:list.myResumes')}
            </button>
            <button
              onClick={() => { closeDropdown(); navigate('/templates'); }}
              className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:text-white/88 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
            >
              <LayoutTemplate className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
              {t('homepage:footer.product.templates')}
            </button>
            <button
              onClick={() => { closeDropdown(); navigate('/settings'); }}
              className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:text-white/88 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
            >
              <Settings className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
              {t('resume:list.settings')}
            </button>
            <div className="mx-1.5 my-1 border-t border-gray-200/70 dark:border-white/[0.08]" />
          </div>
          <button
            onClick={() => { closeDropdown(); navigate('/profile'); }}
            className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:text-white/88 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            <User className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
            {t('profile.personalInfo')}
          </button>
          <button
            onClick={() => { closeDropdown(); navigate('/ai-usage'); }}
            className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-500/10 hover:text-blue-600 dark:text-white/88 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            <BarChart3 className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
            {t('usageInfo', { defaultValue: '用量信息' })}
          </button>
          {role === 'admin' && (
            <button
              onClick={() => { closeDropdown(); navigate('/admin'); }}
              className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-purple-500/10 hover:text-purple-600 dark:text-white/88 dark:hover:bg-purple-500/10 dark:hover:text-purple-300"
            >
              <Shield className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
              后台管理
            </button>
          )}
          <button
            onClick={() => { closeDropdown(); handleLogout(); }}
            className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-500 dark:text-white/88 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <LogOut className="w-4 h-4 transition-colors duration-150 dark:text-white/55" />
            {t('logout')}
          </button>
        </div>
      </>
    );

    return (
      <LoggedInNavbar
        avatarSrc={avatarSrc}
        username={username}
        isOnNavPage={isOnNavPage}
        profileDropdownOpen={profileDropdownOpen}
        setProfileDropdownOpen={setProfileDropdownOpen}
        profileDropdownRef={profileDropdownRef}
        dropdownMenu={dropdownMenu}
        compact={compact}
        hideUsernameOnMobile={hideUsernameOnMobile}
      />
    );
  }

  // Logged-out state
  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={openLogin}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/[0.16] dark:hover:bg-white/[0.06] sm:h-9 sm:rounded-xl sm:px-4"
        >
          {t('login.title')}
        </button>
        <button
          onClick={openRegister}
          className="navbar-register-btn inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-gray-900 px-3 text-sm font-medium text-white transition-all hover:bg-gray-800 sm:h-9 sm:rounded-xl sm:px-4"
        >
          {t('register.title')}
          <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
        </button>
      </div>

      {/* Modals */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={switchToRegister}
      />
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={switchToLogin}
      />
    </>
  );
}
