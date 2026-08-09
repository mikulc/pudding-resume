import type { UserProfile } from '../../types/auth';
import { DEFAULT_SETTINGS, normalizeLanguage, type LocalSettingsPayload } from './model';
import { loadSettings } from './persistence';

/** 将 UserProfile 转换为 LocalSettingsPayload 格式 */
export function profileToSettingsPayload(profile: UserProfile): LocalSettingsPayload {
  return {
    auto_save_interval: profile.auto_save_interval ?? 120,
    ai_polish_enabled: profile.ai_polish_enabled ?? false,
    theme_mode: loadSettings()?.theme_mode ?? DEFAULT_SETTINGS.theme_mode,
    language: normalizeLanguage(profile.language),
    ai_service_api_url: profile.ai_service_api_url ?? '',
    ai_service_api_key: loadSettings()?.ai_service_api_key ?? '',
    ai_service_model: profile.ai_service_model ?? '',
    live2d_enabled: profile.live2d_enabled ?? true,
    live2d_position: profile.live2d_position ?? 'right',
    live2d_h_offset: loadSettings()?.live2d_h_offset ?? 20,
    live2d_v_offset: loadSettings()?.live2d_v_offset ?? -40,
    live2d_width: loadSettings()?.live2d_width ?? 140,
    live2d_height: loadSettings()?.live2d_height ?? 260,
    live2d_scale: loadSettings()?.live2d_scale ?? 1,
    live2d_opacity: loadSettings()?.live2d_opacity ?? 0.8,
    live2d_show_editor: profile.live2d_show_editor ?? true,
    live2d_mobile_show: profile.live2d_mobile_show ?? false,
    live2d_enable_pointer_events_pass_through: profile.live2d_enable_pointer_events_pass_through ?? true,
    live2d_peek_visible_ratio: loadSettings()?.live2d_peek_visible_ratio ?? 0.72,
    live2d_nearby_retract_ratio: loadSettings()?.live2d_nearby_retract_ratio ?? 0.28,
    live2d_nearby_behavior: profile.live2d_nearby_behavior ?? 'retract',
    live2d_proximity_threshold: loadSettings()?.live2d_proximity_threshold ?? 120,
    live2d_restore_delay: loadSettings()?.live2d_restore_delay ?? 400,
    live2d_transition_duration: loadSettings()?.live2d_transition_duration ?? 320,
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
