import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { api } from '../../utils/api';
import { loadSettings, saveSettings, normalizeThemeMode, normalizeLanguage, type ThemeMode, type SupportedLanguage, type LocalSettingsPayload } from '../../utils/localSettings';
import i18n from '../../utils/i18n';
import { useTranslation } from 'react-i18next';
import { applyThemeMode, saveThemeMode } from '../../utils/themeMode';
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
  const storageMode: 'local' | 'cloud' = isLoggedIn ? 'cloud' : 'local';

  const saveToCloud = useCallback(
    async (changes: Record<string, unknown>) => {
      try {
        const cloudChanges = { ...changes };
        delete cloudChanges.ai_service_api_key;
        if (Object.keys(cloudChanges).length === 0) {
          saveSettings(changes as Partial<LocalSettingsPayload>);
          return;
        }
        await api.put('/api/user/preferences', cloudChanges);
        if (profile && setProfile) {
          setProfile({ ...profile, ...cloudChanges } as UserProfile);
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
  const live2dSettings = useLive2dSettings({ initialSettings, profile, showToast, t });
  const localStorageSettings = useLocalStorageSettings({ initialSettings, profile, showToast, t });
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
