import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  applyThemeMode,
  readStoredThemeMode,
  resolveThemeMode,
  saveThemeMode,
  type ThemeMode,
} from '../../utils/themeMode';

export function AuthThemeToggle() {
  const { t } = useTranslation('auth');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const isDark = resolveThemeMode(themeMode);

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

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    saveThemeMode(nextMode);
    applyThemeMode(nextMode, { transition: true });
  };

  return (
    <button
      className="pudding-auth-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      title={isDark ? t('theme.toLight') : t('theme.toDark')}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}
