import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, Copy, Languages, Moon, RotateCw, Settings, Sun } from 'lucide-react';
import i18n from '../../utils/i18n';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { loadSettings, normalizeLanguage, saveSettings, type SupportedLanguage, type ThemeMode } from '../../utils/localSettings';
import { getLocaleFromPath, replaceLocaleInUrl } from '../../utils/localePath';
import { applyThemeMode, readStoredThemeMode, resolveThemeMode, saveThemeMode } from '../../utils/themeMode';
import type { UserProfile } from '../../types/auth';
import { useToast } from './Toast';

const MENU_WIDTH = 158;
const MENU_ESTIMATED_HEIGHT = 198;
const VIEWPORT_PADDING = 5;
const GLOBAL_CONTEXT_MENU_Z_INDEX = 10050;
const MENU_EXIT_DURATION = 100;

const zh = {
  back: '\u540e\u9000',
  forward: '\u524d\u8fdb',
  refresh: '\u5237\u65b0',
  top: '\u56de\u5230\u9876\u90e8',
  settings: '\u8bbe\u7f6e',
  switchToChinese: '\u5207\u6362\u4e2d\u6587',
  switchToEnglish: '\u5207\u6362\u82f1\u6587',
  languageSyncFailed: '\u8bed\u8a00\u504f\u597d\u540c\u6b65\u5931\u8d25',
  themeSyncFailed: '\u4e3b\u9898\u504f\u597d\u540c\u6b65\u5931\u8d25',
  copyAddress: '\u590d\u5236\u5730\u5740',
  copied: '\u5730\u5740\u5df2\u590d\u5236',
  copyFailed: '\u590d\u5236\u5931\u8d25',
  lightMode: '\u6d45\u8272\u6a21\u5f0f',
  darkMode: '\u6df1\u8272\u6a21\u5f0f',
};

interface MenuPosition {
  x: number;
  y: number;
  transformOrigin: string;
}

function shouldKeepNativeContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return Boolean(target.closest([
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[data-native-context-menu]',
  ].join(',')));
}

function getClampedPosition(clientX: number, clientY: number): MenuPosition {
  const opensLeft = clientX + MENU_WIDTH > window.innerWidth;
  const opensUp = clientY + MENU_ESTIMATED_HEIGHT > window.innerHeight;

  return {
    x: Math.max(VIEWPORT_PADDING, opensLeft ? clientX - MENU_WIDTH : clientX),
    y: Math.max(VIEWPORT_PADDING, opensUp ? clientY - MENU_ESTIMATED_HEIGHT : clientY),
    transformOrigin: `${opensUp ? 'bottom' : 'top'} ${opensLeft ? 'right' : 'left'}`,
  };
}

export function GlobalContextMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, profile, setProfile } = useAuth();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [isHiding, setIsHiding] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const [language, setLanguage] = useState<SupportedLanguage>(() => (
    normalizeLanguage(loadSettings()?.language || i18n.language)
  ));
  const isDark = resolveThemeMode(themeMode);
  const isZh = i18n.language?.startsWith('zh');
  const nextLanguage: SupportedLanguage = language === 'zh-CN' ? 'en-US' : 'zh-CN';

  const labels = useMemo(() => ({
    back: isZh ? zh.back : 'Back',
    forward: isZh ? zh.forward : 'Forward',
    refresh: isZh ? zh.refresh : 'Refresh',
    top: isZh ? zh.top : 'Back to top',
    settings: isZh ? zh.settings : 'Settings',
    language: language === 'zh-CN'
      ? (isZh ? zh.switchToEnglish : 'Switch to English')
      : (isZh ? zh.switchToChinese : 'Switch to Chinese'),
    languageSyncFailed: isZh ? zh.languageSyncFailed : 'Failed to sync language preference',
    themeSyncFailed: isZh ? zh.themeSyncFailed : 'Failed to sync theme preference',
    copyAddress: isZh ? zh.copyAddress : 'Copy address',
    copied: isZh ? zh.copied : 'Address copied',
    copyFailed: isZh ? zh.copyFailed : 'Copy failed',
    darkMode: isDark
      ? (isZh ? zh.lightMode : 'Light mode')
      : (isZh ? zh.darkMode : 'Dark mode'),
  }), [isDark, isZh, language]);

  const close = useCallback(() => {
    if (exitTimerRef.current !== null) return;

    setIsHiding(true);
    exitTimerRef.current = window.setTimeout(() => {
      setPosition(null);
      setIsHiding(false);
      exitTimerRef.current = null;
    }, MENU_EXIT_DURATION);
  }, []);

  useEffect(() => {
    const syncLanguage = () => {
      setLanguage(normalizeLanguage(loadSettings()?.language || i18n.language));
    };

    syncLanguage();
    i18n.on('languageChanged', syncLanguage);
    window.addEventListener('pudding:settings-changed', syncLanguage);
    window.addEventListener('storage', syncLanguage);

    return () => {
      i18n.off('languageChanged', syncLanguage);
      window.removeEventListener('pudding:settings-changed', syncLanguage);
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  useEffect(() => {
    const syncThemeMode = () => setThemeMode(readStoredThemeMode());
    const syncThemeModeFromSettings = (event: Event) => {
      const detail = (event as CustomEvent<{
        changedKeys?: string[];
        partial?: { theme_mode?: ThemeMode };
      }>).detail;

      if (detail?.changedKeys?.includes('theme_mode') || detail?.partial?.theme_mode) {
        syncThemeMode();
      }
    };

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', syncThemeMode);
    window.addEventListener('pudding:settings-changed', syncThemeModeFromSettings);
    window.addEventListener('storage', syncThemeMode);

    return () => {
      media.removeEventListener('change', syncThemeMode);
      window.removeEventListener('pudding:settings-changed', syncThemeModeFromSettings);
      window.removeEventListener('storage', syncThemeMode);
    };
  }, []);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented || shouldKeepNativeContextMenu(event.target)) return;

      event.preventDefault();
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setIsHiding(false);
      setPosition(getClampedPosition(event.clientX, event.clientY));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!position) return;
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [close, position]);

  useEffect(() => () => {
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
  }, []);

  if (!position) return null;

  const runAction = (action: () => void | Promise<void>) => {
    void Promise.resolve(action()).finally(close);
  };

  const toggleTheme = async () => {
    const previousMode = themeMode;
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    saveThemeMode(nextMode);
    applyThemeMode(nextMode, { transition: true });

    if (!isLoggedIn) return;

    try {
      await api.put('/api/user/preferences', { theme_mode: nextMode });
      if (profile && setProfile) {
        setProfile({ ...profile, theme_mode: nextMode } as UserProfile);
      }
    } catch {
      setThemeMode(previousMode);
      saveThemeMode(previousMode);
      applyThemeMode(previousMode, { transition: true });
      showToast(labels.themeSyncFailed, 'error');
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(labels.copied, 'success');
    } catch {
      showToast(labels.copyFailed, 'error');
    }
  };

  const toggleLanguage = async () => {
    const previous = language;
    setLanguage(nextLanguage);
    i18n.changeLanguage(nextLanguage);
    saveSettings({ language: nextLanguage });

    if (getLocaleFromPath(location.pathname)) {
      navigate(
        replaceLocaleInUrl(location.pathname, location.search, location.hash, nextLanguage),
        { replace: true },
      );
    }

    if (!isLoggedIn) return;

    try {
      await api.put('/api/user/preferences', { language: nextLanguage });
      if (profile && setProfile) {
        setProfile({ ...profile, language: nextLanguage } as UserProfile);
      }
    } catch {
      setLanguage(previous);
      i18n.changeLanguage(previous);
      saveSettings({ language: previous });
      showToast(labels.languageSyncFailed, 'error');
    }
  };

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ThemeIcon = isDark ? Sun : Moon;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        left: position.x,
        top: position.y,
        zIndex: GLOBAL_CONTEXT_MENU_Z_INDEX,
        transformOrigin: position.transformOrigin,
      }}
      className={`global-context-menu ${isHiding ? 'global-context-menu-hiding' : 'global-context-menu-visible'}`}
      role="menu"
      aria-label="Context menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="global-context-menu-group global-context-menu-small">
        <IconButton label={labels.back} onClick={() => runAction(() => window.history.back())}>
          <ArrowLeft />
        </IconButton>
        <IconButton label={labels.forward} onClick={() => runAction(() => window.history.forward())}>
          <ArrowRight />
        </IconButton>
        <IconButton label={labels.refresh} onClick={() => runAction(() => window.location.reload())}>
          <RotateCw />
        </IconButton>
        <IconButton label={labels.top} onClick={() => runAction(goTop)}>
          <ArrowUp />
        </IconButton>
      </div>

      <div className="global-context-menu-group global-context-menu-group-line">
        <MenuItem
          icon={<Settings />}
          label={labels.settings}
          onClick={() => runAction(() => navigate('/settings'))}
        />
        <MenuItem
          icon={<Languages />}
          label={labels.language}
          onClick={() => runAction(toggleLanguage)}
        />
      </div>

      <div className="global-context-menu-group global-context-menu-group-line">
        <MenuItem
          icon={<Copy />}
          label={labels.copyAddress}
          onClick={() => runAction(copyAddress)}
        />
        <MenuItem
          icon={<ThemeIcon />}
          label={labels.darkMode}
          onClick={() => runAction(toggleTheme)}
        />
      </div>
    </div>,
    document.body,
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactElement;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="global-context-menu-icon-button"
    >
      {children && (
        <span className="global-context-menu-icon-button-glyph">
          {children}
        </span>
      )}
    </button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactElement;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="global-context-menu-item"
    >
      <span className="global-context-menu-item-icon">
        {icon}
      </span>
      <span className="global-context-menu-item-label">{label}</span>
    </button>
  );
}
