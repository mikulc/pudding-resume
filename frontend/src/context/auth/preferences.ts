import type { UserProfile } from '../../types/auth';
import { saveSettings } from '../../utils/localSettings';

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

export function syncPreferences(profile: UserProfile) {
  _autoSaveInterval = profile.auto_save_interval ?? 120;
  _aiPolishEnabled = profile.ai_polish_enabled ?? false;
  _aiServiceApiUrl = profile.ai_service_api_url ?? '';
  _aiServiceApiKey = profile.ai_service_api_key ?? '';
  _aiServiceModel = profile.ai_service_model ?? '';

  // 同步 AI 配置到 localStorage，确保 getAIConfig() 能读到最新值
  saveSettings({
    ai_service_api_url: _aiServiceApiUrl,
    ai_service_api_key: _aiServiceApiKey,
    ai_service_model: _aiServiceModel,
  });
  _live2dEnabled = profile.live2d_enabled ?? false;
  _live2dPosition = profile.live2d_position ?? 'right';
  _live2dHOffset = profile.live2d_h_offset ?? 20;
  _live2dVOffset = profile.live2d_v_offset ?? -40;
  _live2dWidth = profile.live2d_width ?? 140;
  _live2dHeight = profile.live2d_height ?? 260;
  _live2dScale = profile.live2d_scale ?? 1;
  _live2dOpacity = profile.live2d_opacity ?? 0.8;
  _live2dShowEditor = profile.live2d_show_editor ?? true;
  _live2dEnablePointerEventsPassThrough = profile.live2d_enable_pointer_events_pass_through ?? true;
  _live2dPeekVisibleRatio = profile.live2d_peek_visible_ratio ?? 0.72;
  _live2dNearbyRetractRatio = profile.live2d_nearby_retract_ratio ?? 0.28;
  _live2dNearbyBehavior = profile.live2d_nearby_behavior ?? 'retract';
  _live2dProximityThreshold = profile.live2d_proximity_threshold ?? 120;
  _live2dRestoreDelay = profile.live2d_restore_delay ?? 400;
  _live2dTransitionDuration = profile.live2d_transition_duration ?? 320;
  _localStoragePath = profile.local_storage_path ?? '';
  _exportJsonWithSettings = profile.export_json_with_settings ?? false;
}

