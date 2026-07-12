import { loadSettings, normalizeThemeMode, saveSettings, type ThemeMode } from './localSettings';

export const THEME_MODE_STORAGE_KEY = 'pudding_resume_theme_mode';
const THEME_TRANSITION_CLASS = 'theme-transition';
const THEME_CHANGING_CLASS = 'theme-changing';
const THEME_TRANSITION_MS = 220;
const THEME_CHANGING_MS = 160;

let transitionTimer: number | null = null;
let changingTimer: number | null = null;

export type { ThemeMode };

export function resolveThemeMode(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
  return false;
}

export function readStoredThemeMode(): ThemeMode {
  const settingsMode = loadSettings()?.theme_mode;
  if (settingsMode) return normalizeThemeMode(settingsMode);

  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return stored ? normalizeThemeMode(stored) : 'system';
  } catch {
    return 'system';
  }
}

export function rememberThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function saveThemeMode(mode: ThemeMode): void {
  const normalized = normalizeThemeMode(mode);
  rememberThemeMode(normalized);
  saveSettings({ theme_mode: normalized });
}

function startThemeTransition(root: HTMLElement): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  if (transitionTimer !== null) {
    window.clearTimeout(transitionTimer);
  }

  root.classList.add(THEME_TRANSITION_CLASS);
  transitionTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    transitionTimer = null;
  }, THEME_TRANSITION_MS);
}

function startThemeChanging(root: HTMLElement): void {
  if (changingTimer !== null) {
    window.clearTimeout(changingTimer);
  }

  root.classList.add(THEME_CHANGING_CLASS);
  changingTimer = window.setTimeout(() => {
    root.classList.remove(THEME_CHANGING_CLASS);
    changingTimer = null;
  }, THEME_CHANGING_MS);
}

export function applyThemeMode(mode: ThemeMode, options: { transition?: boolean } = {}): void {
  const normalized = normalizeThemeMode(mode);
  const isDark = resolveThemeMode(normalized);
  const root = document.documentElement;

  if (options.transition) {
    startThemeChanging(root);
    startThemeTransition(root);
  }

  root.classList.toggle('dark', isDark);
  root.dataset.themeMode = normalized;
  root.style.colorScheme = isDark ? 'dark' : 'light';
}
