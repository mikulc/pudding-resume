/**
 * localStorage 设置工具模块
 *
 * 未登录用户在此存储设置，登录后可选择同步到云端。
 * - STORAGE_KEY: 设置数据
 * - STORAGE_MODE_KEY: 当前存储模式标记 ("local" | "cloud")
 */

import type { UserProfile } from '../types/auth';

// ── Keys ──
const STORAGE_KEY = 'pudding_resume_settings';
const STORAGE_MODE_KEY = 'pudding_resume_settings_storage_mode';

// ── Types ──

export type ThemeMode = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'zh-CN' | 'en-US';

/** 本地可持久化的设置字段（不含用户身份信息） */
export interface LocalSettingsPayload {
  auto_save_interval: number;
  ai_polish_enabled: boolean;
  theme_mode: ThemeMode;
  language: SupportedLanguage;
  ai_service_api_url: string;
  ai_service_api_key: string;
  ai_service_model: string;
  model_source: string;
  public_model_id: string;
  live2d_enabled: boolean;
  live2d_position: string;
  live2d_h_offset: number;
  live2d_v_offset: number;
  live2d_width: number;
  live2d_height: number;
  live2d_scale: number;
  live2d_opacity: number;
  live2d_show_editor: boolean;
  live2d_mobile_show: boolean;
  live2d_enable_pointer_events_pass_through: boolean;
  live2d_peek_visible_ratio: number;
  live2d_nearby_retract_ratio: number;
  live2d_nearby_behavior: string;
  live2d_proximity_threshold: number;
  live2d_restore_delay: number;
  live2d_transition_duration: number;
  live2d_pinned: boolean;
  local_storage_path: string;
  export_json_with_settings: boolean;
}

/** 默认设置值（与后端 UserPreference 默认值保持一致） */
export const DEFAULT_SETTINGS: LocalSettingsPayload = {
  auto_save_interval: 120,
  ai_polish_enabled: false,
  theme_mode: 'system',
  language: 'zh-CN',
  ai_service_api_url: '',
  ai_service_api_key: '',
  ai_service_model: '',
  model_source: 'public',
  public_model_id: '',
  live2d_enabled: false,
  live2d_position: 'right',
  live2d_h_offset: 20,
  live2d_v_offset: -40,
  live2d_width: 140,
  live2d_height: 260,
  live2d_scale: 1,
  live2d_opacity: 0.8,
  live2d_show_editor: true,
  live2d_mobile_show: false,
  live2d_enable_pointer_events_pass_through: true,
  live2d_peek_visible_ratio: 0.72,
  live2d_nearby_retract_ratio: 0.28,
  live2d_nearby_behavior: 'retract',
  live2d_proximity_threshold: 120,
  live2d_restore_delay: 400,
  live2d_transition_duration: 320,
  live2d_pinned: false,
  local_storage_path: '',
  export_json_with_settings: false,
};

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function normalizeLanguage(value: unknown): SupportedLanguage {
  return value === 'zh-CN' || value === 'en-US' ? value : 'zh-CN';
}

// ── Load / Save / Clear ──

/** 从 localStorage 读取设置，若无则返回 null */
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

/** 将 UserProfile 转换为 LocalSettingsPayload 格式 */
function profileToSettingsPayload(profile: UserProfile): LocalSettingsPayload {
  return {
    auto_save_interval: profile.auto_save_interval ?? 120,
    ai_polish_enabled: profile.ai_polish_enabled ?? false,
    theme_mode: loadSettings()?.theme_mode ?? DEFAULT_SETTINGS.theme_mode,
    language: normalizeLanguage(profile.language),
    ai_service_api_url: profile.ai_service_api_url ?? '',
    ai_service_api_key: profile.ai_service_api_key ?? '',
    ai_service_model: profile.ai_service_model ?? '',
    model_source: profile.model_source ?? 'public',
    public_model_id: profile.public_model_id ?? '',
    live2d_enabled: profile.live2d_enabled ?? true,
    live2d_position: profile.live2d_position ?? 'right',
    live2d_h_offset: profile.live2d_h_offset ?? 20,
    live2d_v_offset: profile.live2d_v_offset ?? -40,
    live2d_width: profile.live2d_width ?? 140,
    live2d_height: profile.live2d_height ?? 260,
    live2d_scale: profile.live2d_scale ?? 1,
    live2d_opacity: profile.live2d_opacity ?? 0.8,
    live2d_show_editor: profile.live2d_show_editor ?? true,
    live2d_mobile_show: profile.live2d_mobile_show ?? false,
    live2d_enable_pointer_events_pass_through: profile.live2d_enable_pointer_events_pass_through ?? true,
    live2d_peek_visible_ratio: profile.live2d_peek_visible_ratio ?? 0.72,
    live2d_nearby_retract_ratio: profile.live2d_nearby_retract_ratio ?? 0.28,
    live2d_nearby_behavior: profile.live2d_nearby_behavior ?? 'retract',
    live2d_proximity_threshold: profile.live2d_proximity_threshold ?? 120,
    live2d_restore_delay: profile.live2d_restore_delay ?? 400,
    live2d_transition_duration: profile.live2d_transition_duration ?? 320,
    live2d_pinned: profile.live2d_pinned ?? false,
    local_storage_path: profile.local_storage_path ?? '',
    export_json_with_settings: profile.export_json_with_settings ?? false,
  };
}

/** Compare local settings with cloud profile and return changed field identifiers. */
export function compareWithProfile(
  local: LocalSettingsPayload,
  profile: UserProfile,
): string[] {
  const cloud = profileToSettingsPayload(profile);
  const diffs: string[] = [];

  // The current caller only checks whether differences exist; keep these
  // as stable field identifiers instead of UI copy.
  const fieldLabels: Record<string, string> = {
    auto_save_interval: 'autoSaveInterval',
    ai_polish_enabled: 'aiPolishEnabled',
    language: 'language',
    ai_service_api_url: 'aiApiUrl',
    ai_service_api_key: 'AI API Key',
    ai_service_model: 'aiModelName',
    model_source: 'modelSource',
    public_model_id: 'publicModel',
    live2d_enabled: 'live2dEnabled',
    live2d_position: 'live2dPosition',
    live2d_h_offset: 'live2dHorizontalOffset',
    live2d_v_offset: 'live2dVerticalOffset',
    live2d_width: 'live2dCanvasWidth',
    live2d_height: 'live2dCanvasHeight',
    live2d_scale: 'live2dScale',
    live2d_opacity: 'live2dOpacity',
    live2d_show_editor: 'live2dShowEditor',
    live2d_mobile_show: 'live2dMobileShow',
    live2d_enable_pointer_events_pass_through: 'live2dPointerPassThrough',
    live2d_peek_visible_ratio: 'live2dPeekVisibleRatio',
    live2d_nearby_retract_ratio: 'live2dNearbyRetractRatio',
    live2d_nearby_behavior: 'live2dNearbyBehavior',
    live2d_proximity_threshold: 'live2dProximityThreshold',
    live2d_restore_delay: 'live2dRestoreDelay',
    live2d_transition_duration: 'live2dTransitionDuration',
    live2d_pinned: 'live2dPinned',
    local_storage_path: 'localStoragePath',
    export_json_with_settings: 'exportJsonWithSettings',
  };

  for (const key of Object.keys(local) as Array<keyof LocalSettingsPayload>) {
    if (key === 'theme_mode') continue;

    const localVal = local[key as keyof LocalSettingsPayload];
    const cloudVal = cloud[key as keyof LocalSettingsPayload];
    if (JSON.stringify(localVal) !== JSON.stringify(cloudVal)) {
      diffs.push(fieldLabels[key as string] || key);
    }
  }

  return diffs;
}
