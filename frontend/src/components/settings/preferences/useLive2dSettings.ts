import { useCallback, useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { saveSettings, type LocalSettingsPayload } from '../../../utils/localSettings';
import type { UserProfile } from '../../../types/auth';
import type { getInitialSettings } from '../settingsConstants';

type InitialSettings = ReturnType<typeof getInitialSettings>;

interface UseLive2dSettingsOptions {
  initialSettings: InitialSettings;
  profile: UserProfile | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: TFunction<'settings'>;
}

export function useLive2dSettings({ initialSettings, profile, showToast, t }: UseLive2dSettingsOptions) {
  const [live2dPosition, setLive2dPosition] = useState(initialSettings.live2d_position);
  const [live2dShowEditor, setLive2dShowEditor] = useState(initialSettings.live2d_show_editor);
  const [live2dEnabled, setLive2dEnabled] = useState(initialSettings.live2d_enabled);
  const [live2dMobileShow, setLive2dMobileShow] = useState(initialSettings.live2d_mobile_show);
  const [live2dPointerPassThrough, setLive2dPointerPassThrough] = useState(initialSettings.live2d_enable_pointer_events_pass_through);
  const [live2dNearbyBehavior, setLive2dNearbyBehavior] = useState(initialSettings.live2d_nearby_behavior);
  const [live2dPinned, setLive2dPinned] = useState(initialSettings.live2d_pinned);
  const [live2dMoreSettingsOpen, setLive2dMoreSettingsOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setLive2dEnabled(profile.live2d_enabled ?? true);
    setLive2dPosition(profile.live2d_position ?? 'right');
    setLive2dShowEditor(profile.live2d_show_editor ?? true);
    setLive2dMobileShow(profile.live2d_mobile_show ?? false);
    setLive2dPointerPassThrough(profile.live2d_enable_pointer_events_pass_through ?? true);
    setLive2dNearbyBehavior(profile.live2d_nearby_behavior ?? 'retract');
    setLive2dPinned(profile.live2d_pinned ?? false);
  }, [profile]);

  const saveLive2dPreferences = useCallback(async (changes: Record<string, unknown>) => {
    try {
      // Layout and mascot behavior are device-specific preferences.
      saveSettings(changes as Partial<LocalSettingsPayload>);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common:saveFailed'), 'error');
      setLive2dEnabled(initialSettings.live2d_enabled);
      setLive2dPosition(initialSettings.live2d_position);
      setLive2dShowEditor(initialSettings.live2d_show_editor);
      setLive2dMobileShow(initialSettings.live2d_mobile_show);
      setLive2dPointerPassThrough(initialSettings.live2d_enable_pointer_events_pass_through);
      setLive2dNearbyBehavior(initialSettings.live2d_nearby_behavior);
      setLive2dPinned(initialSettings.live2d_pinned);
    }
  }, [initialSettings, showToast, t]);

  const handleLive2dToggle = () => {
    const next = !live2dEnabled;
    setLive2dEnabled(next);
    void saveLive2dPreferences({ live2d_enabled: next });
  };
  const handleLive2dPositionChange = (value: string) => {
    setLive2dPosition(value);
    void saveLive2dPreferences({ live2d_position: value });
  };
  const handleLive2dReset = () => {
    const defaults = {
      live2d_enabled: true, live2d_position: 'right', live2d_h_offset: 20, live2d_v_offset: -40,
      live2d_width: 140, live2d_height: 260, live2d_scale: 1, live2d_opacity: 1,
      live2d_show_editor: true, live2d_mobile_show: false,
      live2d_enable_pointer_events_pass_through: true, live2d_peek_visible_ratio: 0.72,
      live2d_nearby_retract_ratio: 0.28, live2d_nearby_behavior: 'retract', live2d_pinned: false,
      live2d_proximity_threshold: 120, live2d_restore_delay: 400, live2d_transition_duration: 320,
    };
    setLive2dEnabled(true);
    setLive2dPosition('right');
    setLive2dShowEditor(true);
    setLive2dMobileShow(false);
    setLive2dPointerPassThrough(true);
    setLive2dNearbyBehavior('retract');
    setLive2dPinned(false);
    showToast(t('live2d.resetSuccess'), 'success');
    void saveLive2dPreferences(defaults);
  };

  const resetLive2dSettings = useCallback(() => {
    setLive2dEnabled(initialSettings.live2d_enabled);
    setLive2dPosition(initialSettings.live2d_position);
    setLive2dShowEditor(initialSettings.live2d_show_editor);
    setLive2dMobileShow(initialSettings.live2d_mobile_show);
    setLive2dPointerPassThrough(initialSettings.live2d_enable_pointer_events_pass_through);
    setLive2dNearbyBehavior(initialSettings.live2d_nearby_behavior);
    setLive2dPinned(initialSettings.live2d_pinned);
  }, [initialSettings]);

  return {
    live2dPosition, live2dShowEditor, setLive2dShowEditor, live2dEnabled, live2dMobileShow,
    setLive2dMobileShow, live2dPointerPassThrough, setLive2dPointerPassThrough,
    live2dNearbyBehavior, setLive2dNearbyBehavior, live2dPinned, setLive2dPinned,
    live2dMoreSettingsOpen, setLive2dMoreSettingsOpen, saveLive2dPreferences,
    handleLive2dToggle, handleLive2dPositionChange, handleLive2dReset, resetLive2dSettings,
  };
}
