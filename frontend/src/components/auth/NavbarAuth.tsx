import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FileText, LayoutDashboard, LayoutTemplate, Settings, User, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLocaleFromPath } from '../../utils/localePath';
import { normalizeLanguage } from '../../utils/localSettings';
import { buildAuthPath } from '../../utils/authNavigation';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface NavbarSettingsShortcut {
  label: string;
  onClick: () => void;
}

interface NavbarAuthProps {
  settingsShortcut?: NavbarSettingsShortcut;
}

/**
 * Reusable navbar auth section:
 * - When logged out: shows "登录" (secondary) + "注册" (primary) buttons
 * - When logged in: shows a profile shortcut, account shortcuts, and a navigation console
 */
function ProfileAvatarButton({
  username,
  onClick,
  active,
}: {
  username: string | null | undefined;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={username || 'Account'}
      aria-current={active ? 'page' : undefined}
      style={active ? {
        backgroundColor: 'var(--theme-accent)',
        color: 'var(--theme-accent-foreground)',
      } : undefined}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] ${
        active ? '' : 'text-gray-600 dark:text-slate-300'
      }`}
    >
      <User className="h-[18px] w-[18px]" strokeWidth={3.2} />
    </button>
  );
}

function ControlCenterMenu({
  settingsShortcut,
}: {
  settingsShortcut?: NavbarSettingsShortcut;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['auth', 'resume', 'homepage']);
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: 0,
    right: 0,
    zIndex: 9999,
    visibility: 'hidden',
    pointerEvents: 'none',
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
      visibility: 'visible',
      pointerEvents: 'auto',
    });
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setExiting(true);
    window.setTimeout(() => {
      closingRef.current = false;
      setExiting(false);
      setOpen(false);
    }, 170);
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, requestClose, updatePosition]);

  useOutsideClick({
    open,
    refs: [triggerRef, portalRef],
    onOutsideClick: requestClose,
  });

  const items = [
    { path: '/resumes', label: t('resume:list.myResumes'), icon: FileText },
    { path: '/templates', label: t('homepage:footer.product.templates'), icon: LayoutTemplate },
    { path: '/settings', label: t('resume:list.settings'), icon: Settings },
  ];

  const openItem = (path: string) => {
    setOpen(false);
    if (path === '/settings' && settingsShortcut) {
      settingsShortcut.onClick();
      return;
    }
    navigate(path);
  };

  const label = t('controlCenter', { defaultValue: '中控台' });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (open) requestClose();
          else {
            updatePosition();
            setOpen(true);
          }
        }}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-gray-700 transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-slate-200 md:hidden"
      >
        <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={3.2} />
      </button>

      {open && createPortal(
        <div
          ref={portalRef}
          role="menu"
          aria-label={label}
          className="navbar-avatar-dropdown min-w-[210px] overflow-hidden rounded-[18px] border border-white/55 bg-white/75 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-[#202329]/90 md:hidden"
          style={{ ...menuStyle, animation: exiting ? 'avatar-dropdown-exit 0.16s ease-in forwards' : 'avatar-dropdown-appear 0.18s ease-out' }}
        >
          {items.map(({ path, label: itemLabel, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                type="button"
                role="menuitem"
                onClick={() => openItem(path)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-blue-500/10 hover:text-blue-600 dark:text-white/88 dark:hover:text-blue-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {itemLabel}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

export function NavbarAuth({ settingsShortcut }: NavbarAuthProps) {
  const { isLoggedIn, username, role, sessionLoading } = useAuth();
  const { t, i18n } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const authLocale = getLocaleFromPath(location.pathname)
    ?? normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const openLogin = () => {
    navigate(buildAuthPath(authLocale, 'login'), { state: { returnTo: currentPath } });
  };

  const openRegister = () => {
    navigate(buildAuthPath(authLocale, 'register'), { state: { returnTo: currentPath } });
  };

  if (sessionLoading) {
    return null;
  }

  // Logged-in state
  if (isLoggedIn) {
    const usageLabel = t('usageInfo', { defaultValue: '用量信息' });
    const adminLabel = t('admin:layout.title');
    const isProfileActive = location.pathname.startsWith('/profile');
    const isUsageActive = location.pathname.startsWith('/ai-usage');
    const isAdminActive = location.pathname.startsWith('/admin');

    return (
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ProfileAvatarButton
          username={username}
          onClick={() => navigate('/profile')}
          active={isProfileActive}
        />
        <button
          type="button"
          onClick={() => navigate('/ai-usage')}
          aria-label={usageLabel}
          aria-current={isUsageActive ? 'page' : undefined}
          style={isUsageActive ? {
            backgroundColor: 'var(--theme-accent)',
            color: 'var(--theme-accent-foreground)',
          } : undefined}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] ${
            isUsageActive ? '' : 'text-gray-600 dark:text-slate-300'
          }`}
        >
          <BarChart3 className="h-[18px] w-[18px]" strokeWidth={3.2} />
        </button>
        {role === 'admin' && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-label={adminLabel}
            aria-current={isAdminActive ? 'page' : undefined}
            style={isAdminActive ? {
              backgroundColor: 'var(--theme-accent)',
              color: 'var(--theme-accent-foreground)',
            } : undefined}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] ${
              isAdminActive ? '' : 'text-gray-600 dark:text-slate-300'
            }`}
          >
            <Shield className="h-[18px] w-[18px]" strokeWidth={3.2} />
          </button>
        )}
        <ControlCenterMenu settingsShortcut={settingsShortcut} />
      </div>
    );
  }

  // Logged-out state
  return (
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
  );
}
