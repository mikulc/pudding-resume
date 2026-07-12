/**
 * Settings page constants and initial-state helpers.
 *
 * Extracted from SettingsContent.tsx. Contains pure data (Live2D position
 * options, AI provider presets) and a state-derivation function that has no
 * React dependency.
 */
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  getStorageMode,
  normalizeLanguage,
  type LocalSettingsPayload,
} from '../../utils/localSettings';
import type { UserProfile } from '../../types/auth';

export const LIVE2D_POSITION_OPTIONS = [
  { value: 'left' },
  { value: 'right' },
];

export function formatLive2dNearbyBehavior(value: string, t: (key: string, opts?: any) => string): string {
  return value === 'expand' ? t('live2d.nearbyBehavior.expand') : t('live2d.nearbyBehavior.retract');
}

// ---- AI 接口地址预设选项 ----
export interface ProviderOption {
  name: string;
  url: string;
  icon: string;
  tagKey?: string;
}

export const AI_PROVIDER_OPTIONS: ProviderOption[] = [
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', icon: '/icons/deepseek.svg' },
  { name: 'OpenAI', url: 'https://api.openai.com/v1', icon: '/icons/openai.svg', tagKey: 'aiService.providerTag.untested' },
  { name: 'Xiaomi MiMo', url: 'https://api.xiaomimimo.com/v1', icon: '/icons/xiaomimimo.svg' },
  { name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/', icon: '/icons/gemini-color.svg', tagKey: 'aiService.providerTag.untested' },
];

export function getInitialSettings(profile: UserProfile | null, isLoggedIn: boolean): LocalSettingsPayload {
  // 已登录但 profile 还在异步加载中：从 localStorage 读取（双写策略保证是最新值，避免闪烁）
  if (isLoggedIn && !profile) {
    const local = loadSettings();
    return local ?? { ...DEFAULT_SETTINGS };
  }

  // 未登录：尝试从 localStorage 加载，无则用默认值（公共模型强制禁用以避免错误状态）
  if (!isLoggedIn) {
    const local = loadSettings();
    if (local) {
      // 未登录时强制使用自定义模型，并写回 localStorage 确保一致性
      if (local.model_source === 'public') {
        local.model_source = 'custom';
        local.public_model_id = '';
        saveSettings({ model_source: 'custom', public_model_id: '' });
      }
      return local;
    }
    return { ...DEFAULT_SETTINGS, model_source: 'custom', public_model_id: '' };
  }

  // 已登录且 profile 已加载：检查 storageMode
  // TypeScript 窄化：前两个分支已排除 (isLoggedIn && !profile) 和 (!isLoggedIn)
  if (!profile) return { ...DEFAULT_SETTINGS };
  const mode = getStorageMode();
  if (mode === 'local') {
    // 用户之前选择了不同步到云端，继续使用 localStorage
    const local = loadSettings();
    return local ?? { ...DEFAULT_SETTINGS };
  }

  // 默认云端模式：从 profile 构建
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
    local_storage_path: profile.local_storage_path || loadSettings()?.local_storage_path || '',
    export_json_with_settings: profile.export_json_with_settings ?? false,
  };
}
