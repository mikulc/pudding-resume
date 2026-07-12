import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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

const MENU_WIDTH = 157.6;
const MENU_ESTIMATED_HEIGHT = 210;
const VIEWPORT_PADDING = 12;

const zh = {
  back: '\u540e\u9000',
  forward: '\u524d\u8fdb',
  refresh: '\u5237\u65b0',
  top: '\u56de\u5230\u9876\u90e8',
  settings: '\u8bbe\u7f6e',
  switchToChinese: '\u5207\u6362\u4e2d\u6587',
  switchToEnglish: '\u5207\u6362\u82f1\u6587',
  languageSyncFailed: '\u8bed\u8a00\u504f\u597d\u540c\u6b65\u5931\u8d25',
  copyAddress: '\u590d\u5236\u5730\u5740',
  copied: '\u5730\u5740\u5df2\u590d\u5236',
  copyFailed: '\u590d\u5236\u5931\u8d25',
  lightMode: '\u6d45\u8272\u6a21\u5f0f',
  darkMode: '\u6df1\u8272\u6a21\u5f0f',
};

interface MenuPosition {
  x: number;
  y: number;
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
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING);
  const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - MENU_ESTIMATED_HEIGHT - VIEWPORT_PADDING);

  return {
    x: Math.min(Math.max(VIEWPORT_PADDING, clientX), maxX),
    y: Math.min(Math.max(VIEWPORT_PADDING, clientY), maxY),
  };
}

export function GlobalContextMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, profile, setProfile } = useAuth();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
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
    copyAddress: isZh ? zh.copyAddress : 'Copy address',
    copied: isZh ? zh.copied : 'Address copied',
    copyFailed: isZh ? zh.copyFailed : 'Copy failed',
    darkMode: isDark
      ? (isZh ? zh.lightMode : 'Light mode')
      : (isZh ? zh.darkMode : 'Dark mode'),
  }), [isDark, isZh, language]);

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
    const close = () => setPosition(null);

    const handleContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented || shouldKeepNativeContextMenu(event.target)) return;

      event.preventDefault();
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
  }, [position]);

  if (!position) return null;

  const close = () => setPosition(null);

  const runAction = (action: () => void | Promise<void>) => {
    void Promise.resolve(action()).finally(close);
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    saveThemeMode(nextMode);
    applyThemeMode(nextMode, { transition: true });
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
      style={{ left: position.x, top: position.y }}
      className="global-context-menu fixed z-[9999] w-[157.6px] overflow-hidden rounded-[12px] border border-slate-300/20 bg-white/70 px-1.5 py-1 text-[#2f343b] shadow-[0_24px_58px_rgba(15,23,42,0.18),inset_0_0_0_1px_rgba(255,255,255,0.26)] backdrop-blur-[36px] backdrop-saturate-[1.65] context-menu-enter dark:border-slate-300/10 dark:bg-[#18181b]/72 dark:text-white dark:shadow-[0_24px_58px_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(148,163,184,0.07)]"
      role="menu"
      aria-label="Context menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="grid h-8 grid-cols-4 items-center gap-1 px-1">
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

      <MenuDivider />

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

      <MenuDivider />

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
      title={label}
      onClick={onClick}
      className="global-context-menu-icon-button inline-flex h-7 w-7 items-center justify-center justify-self-center rounded-[8px] text-[#2f343b] transition-colors duration-150 hover:bg-[#1f4af7] hover:text-white active:bg-[#183fdd] dark:text-white dark:hover:bg-[#fbbf24] dark:hover:text-white dark:active:bg-[#f59e0b]"
    >
      {children && (
        <span className="[&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:stroke-[2.45]">
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
      className="global-context-menu-item group flex h-[38px] w-full items-center gap-2 rounded-[8px] px-2 text-left text-[15px] leading-none text-[#3d3d3d] transition-colors duration-150 hover:bg-[#2135f5] hover:text-white dark:text-white dark:hover:bg-[#fbbf24] dark:hover:text-white dark:active:bg-[#f59e0b]"
    >
      <span className="global-context-menu-item-icon flex h-5 w-5 shrink-0 items-center justify-center text-[#383d42] transition-colors duration-150 group-hover:text-[#1f4af7] dark:text-white dark:group-hover:text-white [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2.35]">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function MenuDivider() {
  return <div className="global-context-menu-divider mx-1 my-1 border-t border-dashed border-[#c7d2fe] dark:border-slate-400/15" />;
}
