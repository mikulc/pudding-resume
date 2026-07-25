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

