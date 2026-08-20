import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FileText, LayoutTemplate, Moon, Settings, Shield, Sun, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLocaleFromPath } from '../../utils/localePath';
import { normalizeLanguage } from '../../utils/localSettings';
import { buildAuthPath } from '../../utils/authNavigation';
import { useToast } from '../common/Toast';
import {
  applyThemeMode,
  readStoredThemeMode,
  resolveThemeMode,
  saveThemeMode,
  type ThemeMode,
} from '../../utils/themeMode';

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
  const { t, i18n } = useTranslation(['auth', 'resume', 'homepage']);
  const { isLoggedIn, profile, profileLoading, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const isDark = resolveThemeMode(themeMode);

  const requestClose = useCallback((onClosed?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setExiting(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      closingRef.current = false;
      setExiting(false);
      setOpen(false);
      onClosed?.();
    }, 500);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [open, requestClose]);

  useEffect(() => {
    if (open && isLoggedIn) {
      void refreshProfile();
    }
  }, [isLoggedIn, open, refreshProfile]);

  useEffect(() => {
    const syncTheme = () => setThemeMode(readStoredThemeMode());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', syncTheme);
    window.addEventListener('pudding:settings-changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      media?.removeEventListener('change', syncTheme);
      window.removeEventListener('pudding:settings-changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const items = [
    { path: '/resumes', label: t('resume:list.myResumes'), icon: FileText },
    { path: '/templates', label: t('homepage:footer.product.templates'), icon: LayoutTemplate },
    { path: '/settings', label: t('resume:list.settings'), icon: Settings },
  ];

  const metricLocale = i18n.resolvedLanguage || i18n.language || 'zh-CN';
  const formatMetric = (value: number) => new Intl.NumberFormat(metricLocale, {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
  const metricFallback = '\u2014';
  const hasMetrics = isLoggedIn && !!profile && !profileLoading;
  const maxResumes = profile?.max_resumes ?? 0;
  const usedResumes = profile?.used_resumes ?? 0;
  const dailyAiQuota = profile?.daily_limit_tokens ?? 0;
  const monthlyAiQuota = profile?.monthly_limit_tokens ?? 0;
  const unlimitedLabel = t('auth:controlCenterStats.unlimited', { defaultValue: '不限' });
  const metrics = [
    {
      label: t('auth:controlCenterStats.resumeCount', { defaultValue: '我的简历' }),
      value: hasMetrics ? formatMetric(usedResumes) : metricFallback,
    },
    {
      label: t('auth:controlCenterStats.resumeRemaining', { defaultValue: '剩余名额' }),
      value: hasMetrics
        ? (maxResumes <= 0 ? unlimitedLabel : formatMetric(Math.max(maxResumes - usedResumes, 0)))
        : metricFallback,
    },
    {
      label: t('auth:controlCenterStats.exportRemaining', { defaultValue: '剩余导出' }),
      value: hasMetrics ? formatMetric(profile?.export_count ?? 0) : metricFallback,
    },
    {
      label: t('auth:controlCenterStats.aiQuota', { defaultValue: 'AI 额度' }),
      value: hasMetrics
        ? (dailyAiQuota <= 0 && monthlyAiQuota <= 0
          ? unlimitedLabel
          : formatMetric(Math.max(dailyAiQuota, monthlyAiQuota)))
        : metricFallback,
    },
  ];

  const openItem = (path: string) => {
    requestClose(() => {
      if (path === '/settings' && settingsShortcut) {
        settingsShortcut.onClick();
        return;
      }
      navigate(path);
    });
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    saveThemeMode(nextMode);
    applyThemeMode(nextMode, { transition: true });
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
            closingRef.current = false;
            setExiting(false);
            setOpen(true);
          }
        }}
        className="control-center-trigger inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-gray-700 transition-colors hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-slate-200 md:hidden"
      >
        <ControlCenterGlyph open={open} />
      </button>

      {open && createPortal(
        <div
          className={`mobile-control-center md:hidden ${exiting ? 'is-closing' : 'is-open'}`}
        >
          <button
            type="button"
            className="mobile-control-center__mask"
            aria-label={t('auth:controlCenterClose', { defaultValue: '关闭中控台' })}
            onClick={() => requestClose()}
          />
          <aside
            role="menu"
            aria-label={label}
            className="mobile-control-center__panel"
          >
            <div className="mobile-control-center__stats" aria-label={t('auth:controlCenterStats.label', { defaultValue: '账户用量' })}>
              {metrics.map((metric) => (
                <div key={metric.label} className="mobile-control-center__stat">
                  <span>{metric.label}</span>
                  <strong className={!hasMetrics ? 'is-loading' : undefined}>{metric.value}</strong>
                </div>
              ))}
            </div>

            <section className="mobile-control-center__section">
              <p className="mobile-control-center__heading">
                {t('auth:controlCenterFeatures', { defaultValue: '功能' })}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={toggleTheme}
                className={`mobile-control-center__theme ${isDark ? 'is-dark' : ''}`}
              >
                {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                <span>{isDark
                  ? t('auth:lightMode', { defaultValue: '浅色模式' })
                  : t('auth:darkMode', { defaultValue: '深色模式' })}</span>
              </button>
            </section>

            <section className="mobile-control-center__section">
              <p className="mobile-control-center__heading">
                {t('auth:controlCenterPages', { defaultValue: '页面' })}
              </p>
              <div className="mobile-control-center__grid">
                {items.map(({ path, label: itemLabel, icon: Icon }) => {
                  const active = location.pathname.startsWith(path);
                  return (
                    <button
                      key={path}
                      type="button"
                      role="menuitem"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => openItem(path)}
                      className={`mobile-control-center__item ${active ? 'is-active' : ''}`}
                    >
                      <Icon aria-hidden="true" />
                      <span>{itemLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
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
