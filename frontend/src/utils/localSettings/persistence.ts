import { DEFAULT_SETTINGS, normalizeLanguage, normalizeThemeMode, type LocalSettingsPayload } from './model';

const STORAGE_KEY = 'pudding_resume_settings';
const STORAGE_MODE_KEY = 'pudding_resume_settings_storage_mode';

export function loadSettings(): LocalSettingsPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalSettingsPayload>;
    const supportedSettings = {} as Partial<LocalSettingsPayload>;
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof LocalSettingsPayload>) {
      if (key in parsed) {
        supportedSettings[key] = parsed[key] as never;
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      ...supportedSettings,
      theme_mode: normalizeThemeMode(supportedSettings.theme_mode),
      language: normalizeLanguage(supportedSettings.language),
    };
  } catch {
    return null;
  }
}

/** 合并写入 localStorage（与已有数据合并，不会丢失未传入的字段） */
export function saveSettings(partial: Partial<LocalSettingsPayload>): void {
  try {
    const existing = loadSettings();
    const merged: LocalSettingsPayload = {
      ...(existing ?? DEFAULT_SETTINGS),
      ...partial,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('pudding:settings-changed', {
      detail: {
        changedKeys: Object.keys(partial),
        partial,
      },
    }));
  } catch {
    // Silently ignore quota / parsing errors
  }
}

/** 清除本地存储的设置数据 */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── Storage Mode ──

export type StorageMode = 'local' | 'cloud';

export function getStorageMode(): StorageMode | null {
  try {
    const val = localStorage.getItem(STORAGE_MODE_KEY);
    if (val === 'local' || val === 'cloud') return val;
    return null;
  } catch {
    return null;
  }
}

export function setStorageMode(mode: StorageMode): void {
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function clearStorageMode(): void {
  try {
    localStorage.removeItem(STORAGE_MODE_KEY);
  } catch {
    // ignore
  }
}

// ── Comparison ──

