import type { UserProfile } from '../../types/auth';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  setStorageMode,
  type LocalSettingsPayload,
} from '../../utils/localSettings';

// --- Module-level preference cache (read by non-React code like SaveSync) ---
let _autoSaveInterval = 120; // default 2 min
let _aiPolishEnabled = true;
let _aiServiceApiUrl = '';
let _aiServiceApiKey = '';
let _aiServiceModel = '';
// Live2D defaults
let _live2dEnabled = false;
let _live2dPosition = 'right';
let _live2dHOffset = 20;
let _live2dVOffset = -40;
let _live2dWidth = 140;
let _live2dHeight = 260;
let _live2dScale = 1;
let _live2dOpacity = 0.8;
let _live2dShowEditor = true;
let _live2dEnablePointerEventsPassThrough = true;
let _live2dPeekVisibleRatio = 0.72;
let _live2dNearbyRetractRatio = 0.28;
let _live2dNearbyBehavior = 'retract';
let _live2dProximityThreshold = 120;
let _live2dRestoreDelay = 400;
let _live2dTransitionDuration = 320;
// 本地存储偏好
let _localStoragePath = '';
// 导出偏好
let _exportJsonWithSettings = false;

/** Get the current auto-save interval (in seconds). Returns 0 if disabled. */
export function getAutoSaveInterval(): number {
  return _autoSaveInterval;
}

/** Get whether AI polish is currently enabled. */
export function isAiPolishEnabled(): boolean {
  return _aiPolishEnabled;
}

/** Get the user-configured AI service API URL. */
export function getAiServiceApiUrl(): string {
  return _aiServiceApiUrl;
}

/** Get whether Live2D mascot is enabled. */
export function isLive2dEnabled(): boolean {
  return _live2dEnabled;
}

/** Get Live2D position. */
export function getLive2dPosition(): string {
  return _live2dPosition;
}

/** Get Live2D horizontal offset. */
export function getLive2dHOffset(): number {
  return _live2dHOffset;
}

/** Get Live2D vertical offset. */
export function getLive2dVOffset(): number {
  return _live2dVOffset;
}

/** Get Live2D canvas width. */
export function getLive2dWidth(): number {
  return _live2dWidth;
}

/** Get Live2D canvas height. */
export function getLive2dHeight(): number {
  return _live2dHeight;
}

/** Get Live2D model scale. */
export function getLive2dScale(): number {
  return _live2dScale;
}

/** Get Live2D opacity. */
export function getLive2dOpacity(): number {
  return _live2dOpacity;
}

/** Get whether Live2D should show in editor page. */
export function isLive2dShowEditor(): boolean {
  return _live2dShowEditor;
}

/** Get whether Live2D ignores pointer events. */
export function isLive2dPointerEventsPassThroughEnabled(): boolean {
  return _live2dEnablePointerEventsPassThrough;
}

/** Get the default Live2D edge-peek visible ratio. */
export function getLive2dPeekVisibleRatio(): number {
  return _live2dPeekVisibleRatio;
}

/** Get the Live2D visible ratio while the mouse is nearby. */
export function getLive2dNearbyRetractRatio(): number {
  return _live2dNearbyRetractRatio;
}

/** Get how Live2D reacts when the mouse is nearby. */
export function getLive2dNearbyBehavior(): string {
  return _live2dNearbyBehavior;
}

/** Get Live2D mouse proximity threshold in pixels. */
export function getLive2dProximityThreshold(): number {
  return _live2dProximityThreshold;
}

/** Get Live2D restore delay in milliseconds. */
export function getLive2dRestoreDelay(): number {
  return _live2dRestoreDelay;
}

/** Get Live2D transition duration in milliseconds. */
export function getLive2dTransitionDuration(): number {
  return _live2dTransitionDuration;
}

/** Get the user-configured AI service API Key (for guest-mode fallback). */
export function getAiServiceApiKey(): string {
  return _aiServiceApiKey;
}

/** Get the user-configured AI model name (for guest-mode fallback). */
export function getAiServiceModel(): string {
  return _aiServiceModel;
}

/** Get whether local file storage is enabled (i.e. a directory path has been selected).
 * Priority: backend profile cache → LocalStorageButton key → Settings page key. */
export function isLocalStorageEnabled(): boolean {
  if (_localStoragePath) return true;
  try {
    // 1) LocalStorageButton 工具栏存储的路径
    const path = localStorage.getItem('pudding_local_storage_path');
    if (path) return true;
    // 2) Settings 设置页面存储的路径（pudding_resume_settings JSON 对象中）
    const raw = localStorage.getItem('pudding_resume_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings?.local_storage_path) return true;
    }
    return false;
  } catch { return false; }
}

/** Get the local storage directory path (display name).
 * Same fallback chain as isLocalStorageEnabled. */
export function getLocalStoragePath(): string {
  if (_localStoragePath) return _localStoragePath;
  try {
    const path = localStorage.getItem('pudding_local_storage_path');
    if (path) return path;
    const raw = localStorage.getItem('pudding_resume_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings?.local_storage_path) return settings.local_storage_path;
    }
    return '';
  } catch { return ''; }
}

/** Get whether JSON export should include settings. */
export function isExportJsonWithSettingsEnabled(): boolean {
  return _exportJsonWithSettings;
}

const DEVICE_SETTING_KEYS = [
  'ai_service_api_key',
  'live2d_enabled',
  'live2d_position',
  'live2d_h_offset',
  'live2d_v_offset',
  'live2d_width',
  'live2d_height',
  'live2d_scale',
  'live2d_opacity',
  'live2d_show_editor',
  'live2d_mobile_show',
  'live2d_enable_pointer_events_pass_through',
  'live2d_peek_visible_ratio',
  'live2d_nearby_retract_ratio',
  'live2d_nearby_behavior',
  'live2d_proximity_threshold',
  'live2d_restore_delay',
  'live2d_transition_duration',
  'live2d_pinned',
  'local_storage_path',
] as const satisfies ReadonlyArray<keyof LocalSettingsPayload>;

const PORTABLE_SETTING_KEYS = [
  'theme_mode',
  'auto_save_interval',
  'ai_polish_enabled',
  'language',
  'ai_service_api_url',
  'ai_service_model',
  'export_json_with_settings',
] as const satisfies ReadonlyArray<keyof LocalSettingsPayload>;

const mergeMarkerKey = (userID: string) => `pudding_preferences_merged_${userID}`;

function hasMergedForUser(userID: string): boolean {
  try { return localStorage.getItem(mergeMarkerKey(userID)) === '1'; } catch { return false; }
}

export function markPreferencesMerged(userID: string): void {
  try { localStorage.setItem(mergeMarkerKey(userID), '1'); } catch { /* ignore */ }
}

export interface PreferenceMergeResult {
  profile: UserProfile;
  cloudUpdates: Record<string, unknown>;
}

/** Merge by field ownership without presenting a whole-document choice. */
export function syncPreferences(profile: UserProfile): PreferenceMergeResult {
  const local = loadSettings();
  const merged: Record<string, unknown> = { ...profile };
  const cloudUpdates: Record<string, unknown> = {};

  if (local) {
    for (const key of DEVICE_SETTING_KEYS) merged[key] = local[key];

    if (!hasMergedForUser(profile.id)) {
      for (const key of PORTABLE_SETTING_KEYS) {
        // Non-default values represent explicit guest customization. Defaults
        // do not replace existing account preferences on a new browser.
        if (JSON.stringify(local[key]) !== JSON.stringify(DEFAULT_SETTINGS[key])) {
          merged[key] = local[key];
          cloudUpdates[key] = local[key];
        }
      }
    }
  }

  // API secrets are local-only and are never hydrated from the server.
  merged.ai_service_api_key = local?.ai_service_api_key ?? '';
  setStorageMode('cloud');

  _autoSaveInterval = (merged.auto_save_interval as number | undefined) ?? 120;
  _aiPolishEnabled = (merged.ai_polish_enabled as boolean | undefined) ?? false;
  _aiServiceApiUrl = (merged.ai_service_api_url as string | undefined) ?? '';
  _aiServiceApiKey = (merged.ai_service_api_key as string | undefined) ?? '';
  _aiServiceModel = (merged.ai_service_model as string | undefined) ?? '';
  _live2dEnabled = (merged.live2d_enabled as boolean | undefined) ?? false;
  _live2dPosition = (merged.live2d_position as string | undefined) ?? 'right';
  _live2dHOffset = (merged.live2d_h_offset as number | undefined) ?? 20;
  _live2dVOffset = (merged.live2d_v_offset as number | undefined) ?? -40;
  _live2dWidth = (merged.live2d_width as number | undefined) ?? 140;
  _live2dHeight = (merged.live2d_height as number | undefined) ?? 260;
  _live2dScale = (merged.live2d_scale as number | undefined) ?? 1;
  _live2dOpacity = (merged.live2d_opacity as number | undefined) ?? 0.8;
  _live2dShowEditor = (merged.live2d_show_editor as boolean | undefined) ?? true;
  _live2dEnablePointerEventsPassThrough = (merged.live2d_enable_pointer_events_pass_through as boolean | undefined) ?? true;
  _live2dPeekVisibleRatio = (merged.live2d_peek_visible_ratio as number | undefined) ?? 0.72;
  _live2dNearbyRetractRatio = (merged.live2d_nearby_retract_ratio as number | undefined) ?? 0.28;
  _live2dNearbyBehavior = (merged.live2d_nearby_behavior as string | undefined) ?? 'retract';
  _live2dProximityThreshold = (merged.live2d_proximity_threshold as number | undefined) ?? 120;
  _live2dRestoreDelay = (merged.live2d_restore_delay as number | undefined) ?? 400;
  _live2dTransitionDuration = (merged.live2d_transition_duration as number | undefined) ?? 320;
  _localStoragePath = (merged.local_storage_path as string | undefined) ?? '';
  _exportJsonWithSettings = (merged.export_json_with_settings as boolean | undefined) ?? false;

  saveSettings(merged as unknown as Partial<LocalSettingsPayload>);
  return { profile: merged as unknown as UserProfile, cloudUpdates };
}
