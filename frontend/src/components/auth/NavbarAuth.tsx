import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FileText, LayoutTemplate, Settings, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLocaleFromPath } from '../../utils/localePath';
import { normalizeLanguage } from '../../utils/localSettings';
import { buildAuthPath } from '../../utils/authNavigation';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useToast } from '../common/Toast';

interface NavbarSettingsShortcut {
  label: string;
  onClick: () => void;
}

interface NavbarAuthProps {
  settingsShortcut?: NavbarSettingsShortcut;
}

function ControlCenterGlyph({ open }: { open: boolean }) {
  return (
    <span className="control-center-glyph" data-open={open || undefined} aria-hidden="true">
      <i className="control-center-glyph__block control-center-glyph__block--left" />
      <i className="control-center-glyph__block control-center-glyph__block--center" />
      <i className="control-center-glyph__block control-center-glyph__block--right" />
    </span>
  );
}

/**
 * Reusable navbar account section:
 * - Always renders the icon-based navigation
 * - Opens login from the profile icon for signed-out visitors
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
        active ? '' : 'text-gray-600 dark:!text-white'
      }`}
    >
      <User className="h-5 w-5" strokeWidth={3.6} />
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
        className="control-center-trigger inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-gray-700 transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-slate-200 md:hidden"
      >
        <ControlCenterGlyph open={open} />
      </button>

      {open && createPortal(
        <div
          ref={portalRef}
          role="menu"
          aria-label={label}
          className="anheyu-glass-popover navbar-avatar-dropdown min-w-[210px] overflow-hidden rounded-[18px] p-1.5 md:hidden"
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
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:!bg-[rgba(66,90,239,0.10)] hover:!text-[rgb(66,90,239)] dark:hover:!bg-[rgba(255,200,72,0.12)] dark:hover:!text-[rgb(255,200,72)] ${
                  active
                    ? 'bg-[rgba(66,90,239,0.10)] text-[rgb(66,90,239)] dark:bg-[rgba(255,200,72,0.12)] dark:text-[rgb(255,200,72)]'
                    : 'text-gray-700 dark:text-white/88'
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
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const authLocale = getLocaleFromPath(location.pathname)
    ?? normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const openLogin = () => {
    navigate(buildAuthPath(authLocale, 'login'), { state: { returnTo: currentPath } });
  };

  const openUsage = () => {
    if (!isLoggedIn) {
      showToast(t('notLoggedIn'), 'info');
      openLogin();
      return;
    }
    navigate('/ai-usage');
  };

  if (sessionLoading) {
    return null;
  }

  const usageLabel = t('usageInfo', { defaultValue: '用量信息' });
  const adminLabel = t('admin:layout.title');
  const isProfileActive = isLoggedIn && location.pathname.startsWith('/profile');
  const isUsageActive = location.pathname.startsWith('/ai-usage');
  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <ProfileAvatarButton
        username={username || t('login.title')}
        onClick={isLoggedIn ? () => navigate('/profile') : openLogin}
        active={isProfileActive}
      />
      <button
        type="button"
        onClick={openUsage}
        aria-label={usageLabel}
        aria-current={isUsageActive ? 'page' : undefined}
        style={isUsageActive ? {
          backgroundColor: 'var(--theme-accent)',
          color: 'var(--theme-accent-foreground)',
        } : undefined}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] ${
          isUsageActive ? '' : 'text-gray-600 dark:!text-white'
        }`}
      >
        <BarChart3 className="h-5 w-5" strokeWidth={3.6} />
      </button>
      {isLoggedIn && role === 'admin' && (
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
            isAdminActive ? '' : 'text-gray-600 dark:!text-white'
          }`}
        >
          <Shield className="h-5 w-5" strokeWidth={3.6} />
        </button>
      )}
      <ControlCenterMenu settingsShortcut={settingsShortcut} />
    </div>
  );
}
