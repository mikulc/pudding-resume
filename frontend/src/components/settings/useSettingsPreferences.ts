import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { api } from '../../utils/api';
import { loadSettings, saveSettings, getStorageMode, setStorageMode as persistStorageMode, compareWithProfile, normalizeThemeMode, normalizeLanguage, type ThemeMode, type SupportedLanguage, type LocalSettingsPayload } from '../../utils/localSettings';
import i18n from '../../utils/i18n';
import { useTranslation } from 'react-i18next';
import { applyThemeMode, readStoredThemeMode, saveThemeMode } from '../../utils/themeMode';
import type { UserProfile } from '../../types/auth';
import { getInitialSettings } from './settingsConstants';
import { useAISettings } from './preferences/useAISettings';
import { useLive2dSettings } from './preferences/useLive2dSettings';
import { useLocalStorageSettings } from './preferences/useLocalStorageSettings';

export function useSettingsPreferences(isLoggedIn: boolean, profile: UserProfile | null) {
  const { showToast } = useToast();
  const { setProfile } = useAuth();
  const { t } = useTranslation('settings');
  // ── 确定初始设置来源 ──
  const initialSettings = getInitialSettings(profile, isLoggedIn);

  // ── 存储模式状态 ──
  const [storageMode, setStorageModeState] = useState<'local' | 'cloud'>(() => {
    if (!isLoggedIn) return 'local';
    const mode = getStorageMode();
    return mode === 'local' ? 'local' : 'cloud';
  });

  // 同步检测弹窗
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // 登录后首次进入设置页：检测本地与云端差异
  useEffect(() => {
    if (!isLoggedIn || !profile) return;
    if (getStorageMode() !== null) return; // 已确定 storageMode，不再弹窗

    const local = loadSettings();
    if (!local) return; // 无本地设置，无需同步

    const diffs = compareWithProfile(local, profile);
    if (diffs.length === 0) {
      // 无差异，标记为云端模式，清理本地存储
      persistStorageMode('cloud');
      setStorageModeState('cloud');
      return;
    }

    // 有差异，弹出同步确认弹窗
    setSyncModalOpen(true);
  }, [isLoggedIn, profile]);

  // 同步弹窗回调：使用云端配置，拉取云端数据覆盖本地 localStorage
  const handleSyncConfirm = () => {
    setSyncModalOpen(false);
    if (!profile) return;

    // 将 profile（云端数据）写入 localStorage，覆盖本地旧值
    saveSettings({
      auto_save_interval: profile.auto_save_interval ?? 120,
      ai_polish_enabled: profile.ai_polish_enabled ?? false,
      language: normalizeLanguage(profile.language),
      ai_service_api_url: profile.ai_service_api_url ?? '',
      ai_service_api_key: profile.ai_service_api_key ?? '',
      ai_service_model: profile.ai_service_model ?? '',
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
      local_storage_path: profile.local_storage_path ?? '',
      export_json_with_settings: profile.export_json_with_settings ?? false,
    });
    const nextThemeMode = readStoredThemeMode();
    setThemeMode(nextThemeMode);
    applyThemeMode(nextThemeMode);
    setLanguage(normalizeLanguage(profile.language));
    i18n.changeLanguage(normalizeLanguage(profile.language));
    persistStorageMode('cloud');
    setStorageModeState('cloud');
    showToast(t('page.switchedToCloud'), 'success');
  };

  const handleSyncCancel = () => {
    setSyncModalOpen(false);
    // 用户选择不覆盖云端，使用本地存储
    persistStorageMode('local');
    setStorageModeState('local');
  };

  // ── 通用保存辅助 ──
  const saveToCloud = useCallback(
    async (changes: Record<string, unknown>) => {
      try {
        await api.put('/api/user/preferences', changes);
        if (profile && setProfile) {
          setProfile({ ...profile, ...changes } as UserProfile);
        }
        // 双写 localStorage，保持本地与云端一致，避免页面刷新闪烁
        saveSettings(changes as Partial<LocalSettingsPayload>);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common:saveFailed');
        showToast(message, 'error');
        throw err;
      }
    },
    [profile, showToast, setProfile, t],
  );

  const [autoSaveInterval, setAutoSaveInterval] = useState(initialSettings.auto_save_interval);
  const [aiPolishEnabled, setAiPolishEnabled] = useState(initialSettings.ai_polish_enabled);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialSettings.theme_mode);
  const [language, setLanguage] = useState<SupportedLanguage>(normalizeLanguage(initialSettings.language));
  const [exportJsonWithSettings, setExportJsonWithSettings] = useState(initialSettings.export_json_with_settings);
  const [savingInterval, setSavingInterval] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownDir, setDropdownDir] = useState<'up' | 'down'>('up');
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const saveFailureHandlerRef = useRef<() => void>(() => undefined);

  // Sync when profile reloads externally (only in cloud mode)
  useEffect(() => {
    if (!profile || storageMode !== 'cloud') return;
    setAutoSaveInterval(profile.auto_save_interval ?? 120);
    setAiPolishEnabled(profile.ai_polish_enabled ?? false);
    setLanguage(normalizeLanguage(profile.language));
    setExportJsonWithSettings(profile.export_json_with_settings ?? false);
  }, [profile, storageMode]);

  const savePreferences = useCallback(
    async (interval: number, polish: boolean, apiUrl?: string, apiKey?: string, model?: string) => {
      setSavingInterval(true);
      try {
        const body: Record<string, unknown> = {
          auto_save_interval: interval,
          ai_polish_enabled: polish,
        };
        if (apiUrl !== undefined) body.ai_service_api_url = apiUrl;
        if (apiKey !== undefined) body.ai_service_api_key = apiKey;
        if (model !== undefined) body.ai_service_model = model;

        if (storageMode === 'local') {
          // 本地模式：写入 localStorage
          saveSettings(body as Partial<LocalSettingsPayload>);
        } else {
          // 云端模式：调用 API
          await saveToCloud(body);
        }
      } catch {
        // Revert on failure
        setAutoSaveInterval(initialSettings.auto_save_interval);
        setAiPolishEnabled(initialSettings.ai_polish_enabled);
        saveFailureHandlerRef.current();
      } finally {
        setSavingInterval(false);
      }
    },
    [storageMode, initialSettings, saveToCloud],
  );

  // Debounced save ref for auto-save interval changes
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIntervalChange = (value: number) => {
    setAutoSaveInterval(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePreferences(value, aiPolishEnabled);
    }, 600);
  };

  const handleThemeModeChange = async (mode: ThemeMode) => {
    const next = normalizeThemeMode(mode);
    if (next === themeMode) return;

    setThemeMode(next);
    saveThemeMode(next);
    applyThemeMode(next, { transition: true });
  };

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    const next = normalizeLanguage(lang);
    if (next === language) return;

    const previous = language;
    setLanguage(next);
    i18n.changeLanguage(next);

    try {
      if (storageMode === 'local' || !isLoggedIn) {
        saveSettings({ language: next });
      } else {
        await saveToCloud({ language: next });
      }
    } catch {
      setLanguage(previous);
      i18n.changeLanguage(previous);
    }
  };

  const handleExportJsonSettingsToggle = async () => {
    const next = !exportJsonWithSettings;
    setExportJsonWithSettings(next);
    try {
      if (storageMode === 'local') {
        saveSettings({ export_json_with_settings: next });
      } else {
        await saveToCloud({ export_json_with_settings: next });
      }
    } catch {
      setExportJsonWithSettings(!next);
    }
  };

  const aiSettings = useAISettings({ initialSettings, autoSaveInterval, aiPolishEnabled, savePreferences, storageMode, profile, showToast, t });
  const live2dSettings = useLive2dSettings({ initialSettings, profile, storageMode, saveToCloud, showToast, t });
  const localStorageSettings = useLocalStorageSettings({ initialSettings, profile, storageMode, saveToCloud, showToast, t });
  saveFailureHandlerRef.current = () => {
    aiSettings.resetAISettings();
    live2dSettings.resetLive2dSettings();
  };
  const { modelDropdownRef, apiUrlRef, handleApiUrlChange, handleApiKeyChange, handleModelChange, handleFetchModels, handleSelectModel, aiServiceApiUrl, aiServiceApiKey, aiServiceModel, fetchingModels, availableModels, modelDropdownOpen, apiUrlDropdownOpen, setApiUrlDropdownOpen } = aiSettings;
  const { saveLive2dPreferences, handleLive2dToggle, handleLive2dPositionChange, handleLive2dReset, live2dPosition, live2dShowEditor, setLive2dShowEditor, live2dEnabled, live2dMobileShow, setLive2dMobileShow, live2dPointerPassThrough, setLive2dPointerPassThrough, live2dNearbyBehavior, setLive2dNearbyBehavior, live2dPinned, setLive2dPinned, live2dMoreSettingsOpen, setLive2dMoreSettingsOpen } = live2dSettings;
  const { localStoragePath, setLocalStoragePath, selectingDir, fsApiAvailable, saveLocalStoragePreferences, handleSelectDirectory } = localStorageSettings;

  useOutsideClick({
    open: dropdownOpen,
    refs: [dropdownRef],
    onOutsideClick: () => setDropdownOpen(false),
  });
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Sync theme mode and language when another settings surface changes them.
  useEffect(() => {
    const syncSettings = () => {
      const latest = loadSettings();
      if (latest?.theme_mode) {
        setThemeMode(normalizeThemeMode(latest.theme_mode));
      }
      if (latest?.language) {
        setLanguage(normalizeLanguage(latest.language));
      }
    };
    window.addEventListener('pudding:settings-changed', syncSettings);
    return () => {
      window.removeEventListener('pudding:settings-changed', syncSettings);
    };
  }, []);

  const intervalOptions = useMemo(() => [
    { value: 0, label: t('preferences.autoSaveOff') },
    { value: 30, label: t('preferences.autoSave30s') },
    { value: 60, label: t('preferences.autoSave1m') },
    { value: 120, label: t('preferences.autoSave2m') },
    { value: 300, label: t('preferences.autoSave5m') },
  ], [t]);

  const themeModeOptions: Array<{ value: ThemeMode; label: string; description: string }> = useMemo(() => [
    { value: 'light', label: t('preferences.themeLight'), description: t('preferences.themeLightDesc') },
    { value: 'dark', label: t('preferences.themeDark'), description: t('preferences.themeDarkDesc') },
    { value: 'system', label: t('preferences.themeSystem'), description: t('preferences.themeSystemDesc') },
  ], [t]);


  return {
    isLoggedIn,
    handleSyncConfirm,
    handleSyncCancel,
    modelDropdownRef,
    dropdownRef,
    dropdownBtnRef,
    apiUrlRef,
    handleIntervalChange,
    handleThemeModeChange,
    handleLanguageChange,
    handleExportJsonSettingsToggle,
    handleApiUrlChange,
    handleApiKeyChange,
    handleModelChange,
    saveLocalStoragePreferences,
    handleSelectDirectory,
    saveLive2dPreferences,
    handleLive2dToggle,
    handleLive2dPositionChange,
    handleLive2dReset,
    handleFetchModels,
    handleSelectModel,
    intervalOptions,
    themeModeOptions,
    syncModalOpen,
    autoSaveInterval,
    themeMode,
    language,
    exportJsonWithSettings,
    aiServiceApiUrl,
    aiServiceApiKey,
    aiServiceModel,
    live2dPosition,
    live2dShowEditor,
    setLive2dShowEditor,
    live2dEnabled,
    live2dMobileShow,
    setLive2dMobileShow,
    live2dPointerPassThrough,
    setLive2dPointerPassThrough,
    live2dNearbyBehavior,
    setLive2dNearbyBehavior,
    live2dPinned,
    setLive2dPinned,
    live2dMoreSettingsOpen,
    setLive2dMoreSettingsOpen,
    localStoragePath,
    setLocalStoragePath,
    selectingDir,
    fsApiAvailable,
    fetchingModels,
    availableModels,
    modelDropdownOpen,
    savingInterval,
    dropdownOpen,
    setDropdownOpen,
    dropdownDir,
    setDropdownDir,
    apiUrlDropdownOpen,
    setApiUrlDropdownOpen,
    showToast,
    t,
  };
}

export type SettingsPreferences = ReturnType<typeof useSettingsPreferences>;
