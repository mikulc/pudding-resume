import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import {
  Loader2,
  CheckCircle2,
  RotateCcw,
  Settings,
  Sparkles,
  Clock,
  ChevronDown,
  RefreshCw,
  SmilePlus,
  Move,
  Check,
  Smartphone,
  Monitor,
  FolderOpen,
  HardDrive,
  Command,
  Info,
  Braces,
  Globe,
  Pin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { api } from '../../utils/api';
import { fetchAiModels, fetchPublicModels as fetchPublicModelsApi, refreshPublicModelBalances } from '../../api/ai';
import { checkFileSystemAccess, selectDirectory, revokeDirectory } from '../../utils/localStorage';
import { removeAllPreviewCaches } from '../../utils/previewCache';
import { removeAllDiagnosisCaches } from '../../hooks/useDiagnosis';
import {
  loadSettings,
  saveSettings,
  getStorageMode,
  setStorageMode as persistStorageMode,
  compareWithProfile,
  normalizeThemeMode,
  normalizeLanguage,
  type ThemeMode,
  type SupportedLanguage,
  type LocalSettingsPayload,
} from '../../utils/localSettings';
import i18n from '../../utils/i18n';
import { useTranslation } from 'react-i18next';
import { applyThemeMode, readStoredThemeMode, saveThemeMode } from '../../utils/themeMode';
import { getAIConfig, saveAIConfig, validateAIConfig } from '../../utils/aiConfig';
import { SettingsSyncModal } from './SettingsSyncModal';
import type { UserProfile } from '../../types/auth';
import {
  LIVE2D_POSITION_OPTIONS,
  formatLive2dNearbyBehavior,
  AI_PROVIDER_OPTIONS,
  getInitialSettings,
} from './settingsConstants';

export function SettingsContent({ isLoggedIn, profile }: { isLoggedIn: boolean; profile: UserProfile | null }) {
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
  const [aiServiceApiUrl, setAiServiceApiUrl] = useState(initialSettings.ai_service_api_url);
  const [aiServiceApiKey, setAiServiceApiKey] = useState(initialSettings.ai_service_api_key);
  const [aiServiceModel, setAiServiceModel] = useState(initialSettings.ai_service_model);
  const [modelSource, setModelSource] = useState(initialSettings.model_source);
  const [publicModelId, setPublicModelId] = useState(initialSettings.public_model_id);
  const [publicModels, setPublicModels] = useState<Array<{ id: string; name: string; model: string; balance: number; balance_updated_at: string; sort_order: number }>>([]);
  const [publicModelsLoading, setPublicModelsLoading] = useState(false);
  const [publicModelDropdownOpen, setPublicModelDropdownOpen] = useState(false);
  const publicModelDropdownRef = useRef<HTMLDivElement>(null);

  const [live2dPosition, setLive2dPosition] = useState(initialSettings.live2d_position);
  const [live2dShowEditor, setLive2dShowEditor] = useState(initialSettings.live2d_show_editor);
  const [live2dEnabled, setLive2dEnabled] = useState(initialSettings.live2d_enabled);
  const [live2dMobileShow, setLive2dMobileShow] = useState(initialSettings.live2d_mobile_show);
  const [live2dPointerPassThrough, setLive2dPointerPassThrough] = useState(initialSettings.live2d_enable_pointer_events_pass_through);
  const [live2dNearbyBehavior, setLive2dNearbyBehavior] = useState(initialSettings.live2d_nearby_behavior);
  const [live2dPinned, setLive2dPinned] = useState(initialSettings.live2d_pinned);
  const [live2dMoreSettingsOpen, setLive2dMoreSettingsOpen] = useState(false);
  // 本地存储
  const [localStoragePath, setLocalStoragePath] = useState(initialSettings.local_storage_path);
  const [selectingDir, setSelectingDir] = useState(false);
  const [fsApiAvailable] = useState(() => checkFileSystemAccess());
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [savingInterval, setSavingInterval] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownDir, setDropdownDir] = useState<'up' | 'down'>('up');
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const [apiUrlDropdownOpen, setApiUrlDropdownOpen] = useState(false);
  const apiUrlRef = useRef<HTMLDivElement>(null);

  // Sync when profile reloads externally (only in cloud mode)
  useEffect(() => {
    if (!profile || storageMode !== 'cloud') return;
    setAutoSaveInterval(profile.auto_save_interval ?? 120);
    setAiPolishEnabled(profile.ai_polish_enabled ?? false);
    setLanguage(normalizeLanguage(profile.language));
    setAiServiceApiUrl(profile.ai_service_api_url ?? '');
    setAiServiceApiKey(profile.ai_service_api_key ?? '');
    setAiServiceModel(profile.ai_service_model ?? '');
    setModelSource(profile.model_source ?? 'public');
    setPublicModelId(profile.public_model_id ?? '');
    setLive2dEnabled(profile.live2d_enabled ?? true);
    setLive2dPosition(profile.live2d_position ?? 'right');
    setLive2dShowEditor(profile.live2d_show_editor ?? true);
    setLive2dMobileShow(profile.live2d_mobile_show ?? false);
    setLive2dPointerPassThrough(profile.live2d_enable_pointer_events_pass_through ?? true);
    setLive2dNearbyBehavior(profile.live2d_nearby_behavior ?? 'retract');
    setLive2dPinned(profile.live2d_pinned ?? false);
    setLocalStoragePath(profile.local_storage_path || loadSettings()?.local_storage_path || '');
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
        setAiServiceApiUrl(initialSettings.ai_service_api_url);
        setAiServiceApiKey(initialSettings.ai_service_api_key);
        setAiServiceModel(initialSettings.ai_service_model);
        setLive2dEnabled(initialSettings.live2d_enabled);
        setLive2dPosition(initialSettings.live2d_position);
        setLive2dShowEditor(initialSettings.live2d_show_editor);
        setLive2dMobileShow(initialSettings.live2d_mobile_show);
        setLive2dPointerPassThrough(initialSettings.live2d_enable_pointer_events_pass_through);
        setLive2dNearbyBehavior(initialSettings.live2d_nearby_behavior);
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

  const aiConfigSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAIConfigSave = (
    changes: { apiUrl?: string; apiKey?: string; model?: string },
    delay = 800,
  ) => {
    if (aiConfigSaveTimerRef.current) clearTimeout(aiConfigSaveTimerRef.current);
    aiConfigSaveTimerRef.current = setTimeout(() => {
      void savePreferences(
        autoSaveInterval,
        aiPolishEnabled,
        changes.apiUrl,
        changes.apiKey,
        changes.model,
      );
    }, delay);
  };

  const handleApiUrlChange = (value: string) => {
    setAiServiceApiUrl(value);
    saveAIConfig({ modelSource: 'custom', baseUrl: value });
    scheduleAIConfigSave({ apiUrl: value });
  };

  const handleApiKeyChange = (value: string) => {
    setAiServiceApiKey(value);
    saveAIConfig({ modelSource: 'custom', apiKey: value });
    scheduleAIConfigSave({ apiKey: value });
  };

  const handleModelChange = (value: string) => {
    setAiServiceModel(value);
    saveAIConfig({ modelSource: 'custom', modelName: value });
    scheduleAIConfigSave({ model: value });
  };

  // --- 本地存储 ---
  const saveLocalStoragePreferences = useCallback(
    async (path: string) => {
      try {
        if (storageMode === 'local') {
          saveSettings({ local_storage_path: path });
        } else {
          await saveToCloud({ local_storage_enabled: !!path, local_storage_path: path });
          // saveToCloud 已双写 localStorage，此处无需额外处理
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common:saveFailed');
        showToast(message, 'error');
        setLocalStoragePath(initialSettings.local_storage_path);
      }
    },
    [storageMode, initialSettings, showToast, saveToCloud, t],
  );

  const handleSelectDirectory = async () => {
    setSelectingDir(true);
    try {
      const result = await selectDirectory();
      if (result) {
        setLocalStoragePath(result.name);
        await saveLocalStoragePreferences(result.name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('localStorage.selectFailed');
      showToast(message, 'error');
    } finally {
      setSelectingDir(false);
    }
  };

  // --- Live2D preferences ---
  const saveLive2dPreferences = useCallback(
    async (changes: Record<string, unknown>) => {
      try {
        if (storageMode === 'local') {
          saveSettings(changes as Partial<LocalSettingsPayload>);
        } else {
          await saveToCloud(changes);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common:saveFailed');
        showToast(message, 'error');
        // Revert
        setLive2dEnabled(initialSettings.live2d_enabled);
        setLive2dPosition(initialSettings.live2d_position);
        setLive2dShowEditor(initialSettings.live2d_show_editor);
        setLive2dMobileShow(initialSettings.live2d_mobile_show);
        setLive2dPointerPassThrough(initialSettings.live2d_enable_pointer_events_pass_through);
        setLive2dNearbyBehavior(initialSettings.live2d_nearby_behavior);
        setLive2dPinned(initialSettings.live2d_pinned);
      }
    },
    [storageMode, initialSettings, showToast, saveToCloud, t],
  );

  const handleLive2dToggle = () => {
    const next = !live2dEnabled;
    setLive2dEnabled(next);
    saveLive2dPreferences({ live2d_enabled: next });
  };

  const handleLive2dPositionChange = (value: string) => {
    setLive2dPosition(value);
    saveLive2dPreferences({ live2d_position: value });
  };

  const handleLive2dReset = () => {
    const defaults = {
      live2d_enabled: true,
      live2d_position: 'right',
      live2d_h_offset: 20,
      live2d_v_offset: -40,
      live2d_width: 140,
      live2d_height: 260,
      live2d_scale: 1,
      live2d_opacity: 1,
      live2d_show_editor: true,
      live2d_mobile_show: false,
      live2d_enable_pointer_events_pass_through: true,
      live2d_peek_visible_ratio: 0.72,
      live2d_nearby_retract_ratio: 0.28,
      live2d_nearby_behavior: 'retract',
      live2d_pinned: false,
      live2d_proximity_threshold: 120,
      live2d_restore_delay: 400,
      live2d_transition_duration: 320,
    };
    setLive2dEnabled(true);
    setLive2dPosition('right');
    setLive2dShowEditor(true);
    setLive2dMobileShow(false);
    setLive2dPointerPassThrough(true);
    setLive2dNearbyBehavior('retract');
    setLive2dPinned(false);
    showToast(t('live2d.resetSuccess'), 'success');
    saveLive2dPreferences(defaults);
  };

  const handleFetchModels = async () => {
    const nextConfig = saveAIConfig({
      modelSource: 'custom',
      baseUrl: aiServiceApiUrl,
      apiKey: aiServiceApiKey,
      modelName: aiServiceModel,
    });
    const validation = validateAIConfig(nextConfig, { requireModelName: false });
    if (!validation.ok) {
      showToast(validation.message || t('aiService.configIncomplete'), 'error');
      return;
    }
    setFetchingModels(true);
    setModelDropdownOpen(false);
    try {
      const res = await fetchAiModels();
      setAvailableModels(res.models);
      if (res.models.length === 0) {
        showToast(t('aiService.noModelsFetched'));
      } else {
        setModelDropdownOpen(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('aiService.fetchModelsFailed');
      showToast(message, 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSelectModel = (model: string) => {
    setAiServiceModel(model);
    setModelDropdownOpen(false);
    saveAIConfig({ modelSource: 'custom', modelName: model });
    scheduleAIConfigSave({ model }, 300);
  };

  // --- Public model pool ---

  const fetchPublicModels = useCallback(async () => {
    setPublicModelsLoading(true);
    try {
      const res = await fetchPublicModelsApi();
      setPublicModels(res.models);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('aiService.fetchPublicModelsFailed');
      showToast(message, 'error');
    } finally {
      setPublicModelsLoading(false);
    }
  }, [showToast, t]);

  // Refresh balances from provider API (DeepSeek etc.) and update list
  const refreshBalances = useCallback(async () => {
    if (!publicModelId) {
      showToast(t('aiService.selectModelFirst'), 'info');
      return;
    }
    setPublicModelsLoading(true);
    try {
      const res = await refreshPublicModelBalances();
      setPublicModels(res.models);
      showToast(t('aiService.balanceRefreshed'), 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('aiService.refreshBalanceFailed');
      showToast(message, 'error');
    } finally {
      setPublicModelsLoading(false);
    }
  }, [publicModelId, showToast, t]);

  // Auto-fetch public models when model source is public
  useEffect(() => {
    if (modelSource === 'public') {
      fetchPublicModels();
    }
  }, [modelSource, fetchPublicModels]);

  const handleModelSourceChange = (source: string) => {
    // 未登录用户不能使用公共模型
    if (!isLoggedIn && source === 'public') {
      showToast(t('aiService.publicModelLoginRequired'), 'info');
      return;
    }
    setModelSource(source);
    const latest = getAIConfig();
    saveAIConfig({
      modelSource: source as 'custom' | 'public',
      publicModelId: source === 'public' ? latest.publicModelId : '',
    });
    const body = { model_source: source };
    if (storageMode === 'local') {
      saveSettings(body);
    } else {
      api.put('/api/user/preferences', body).then(() => {
        if (profile && setProfile) {
          setProfile({ ...profile, model_source: source } as UserProfile);
        }
        saveSettings(body); // 双写 localStorage
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : t('common:saveFailed');
        showToast(message, 'error');
        setModelSource(initialSettings.model_source);
      });
    }
  };

  const handleSelectPublicModel = (modelId: string, _modelName: string) => {
    setPublicModelId(modelId);
    setPublicModelDropdownOpen(false);
    saveAIConfig({ modelSource: 'public', publicModelId: modelId });
    const body = { model_source: 'public', public_model_id: modelId };
    if (storageMode === 'local') {
      saveSettings(body);
    } else {
      api.put('/api/user/preferences', body).then(() => {
        if (profile && setProfile) {
          setProfile({
            ...profile,
            model_source: 'public',
            public_model_id: modelId,
          } as UserProfile);
        }
        saveSettings(body); // 双写 localStorage
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : t('common:saveFailed');
        showToast(message, 'error');
        setPublicModelId(initialSettings.public_model_id);
      });
    }
  };

  const selectedPublicModel = publicModels.find(m => m.id === publicModelId);

  useOutsideClick({
    open: publicModelDropdownOpen,
    refs: [publicModelDropdownRef],
    onOutsideClick: () => setPublicModelDropdownOpen(false),
  });
  useOutsideClick({
    open: modelDropdownOpen,
    refs: [modelDropdownRef],
    onOutsideClick: () => setModelDropdownOpen(false),
  });
  useOutsideClick({
    open: dropdownOpen,
    refs: [dropdownRef],
    onOutsideClick: () => setDropdownOpen(false),
  });
  useOutsideClick({
    open: apiUrlDropdownOpen,
    refs: [apiUrlRef],
    onOutsideClick: () => setApiUrlDropdownOpen(false),
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (aiConfigSaveTimerRef.current) clearTimeout(aiConfigSaveTimerRef.current);
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

  return (
    <>
    {/* ======== 偏好设置 ======== */}
    <section id="preferences" className="scroll-mt-28">
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
      <h3 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-500" />
        {t('preferences.title')}
      </h3>
      <p className="text-sm text-[#6b7280] mb-6">{t('preferences.desc')}</p>

      <div className="space-y-6">
        {/* Auto-save interval */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.autoSave')}</p>
              <p className="text-xs text-gray-400">{t('preferences.autoSaveDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savingInterval && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 dark:text-[#fbbf24]" />
            )}
            <div ref={dropdownRef} className="relative flex-shrink-0">
              <button
                ref={dropdownBtnRef}
                type="button"
                onClick={() => {
                  if (!dropdownOpen && dropdownBtnRef.current) {
                    const rect = dropdownBtnRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    // 预估下拉高度：5 个选项 × 36px + padding ≈ 200px
                    setDropdownDir(spaceBelow >= 210 ? 'down' : spaceAbove >= 210 ? 'up' : 'down');
                  }
                  setDropdownOpen(!dropdownOpen);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none transition-colors min-w-[90px] justify-between dark:hover:border-[#fbbf24]/50 dark:hover:bg-[#fbbf24]/10"
              >
                <span>{intervalOptions.find((o) => o.value === autoSaveInterval)?.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className={`absolute right-0 w-full min-w-[120px] bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 animate-in fade-in zoom-in-95 duration-150 ${
                  dropdownDir === 'up'
                    ? 'bottom-full mb-1 origin-bottom-right'
                    : 'top-full mt-1 origin-top-right'
                }`}>
                  {[...intervalOptions].reverse().map((opt) => {
                    const isSelected = opt.value === autoSaveInterval;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          handleIntervalChange(opt.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'text-blue-700 bg-blue-50 font-medium dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="w-4 flex-shrink-0">
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 dark:text-[#fbbf24]" />
                          )}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Theme mode */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Monitor className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.themeMode')}</p>
              <p className="text-xs text-gray-400">{t('preferences.themeModeDesc')}</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto">
            {themeModeOptions.map((option) => {
              const selected = option.value === themeMode;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    void handleThemeModeChange(option.value);
                  }}
                  className={`min-w-[74px] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-[#fbbf24] dark:text-[#17191d]'
                      : 'text-gray-500 hover:bg-white/70 hover:text-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Language selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.language')}</p>
              <p className="text-xs text-gray-400">{t('preferences.languageDesc')}</p>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {[
              { value: 'zh-CN' as SupportedLanguage, label: t('preferences.languageZh') },
              { value: 'en-US' as SupportedLanguage, label: t('preferences.languageEn') },
            ].map((opt) => {
              const selected = opt.value === language;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleLanguageChange(opt.value)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selected
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Export JSON with settings toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Braces className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('preferences.exportJson')}</p>
              <p className="text-xs text-gray-400">{t('preferences.exportJsonDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={exportJsonWithSettings}
            onClick={handleExportJsonSettingsToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#fbbf24]/30 ${
              exportJsonWithSettings ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                exportJsonWithSettings ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
    </section>

    {/* ======== 本地存储 ======== */}
    <section id="storage" className="scroll-mt-28">
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1.5">
        <HardDrive className="w-5 h-5 text-gray-500" />
        {t('localStorage.title')}
        {!fsApiAvailable && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 border border-gray-200 leading-none">
            {t('localStorage.unsupportedBadge')}
          </span>
        )}
      </h3>
      <p className="text-sm text-[#6b7280] mb-6">{t('localStorage.locationDesc')}</p>

      <div className="space-y-6">
        <div className="border-t border-gray-100" />
        <div className="space-y-4 pt-1">
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('localStorage.folder')}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectDirectory}
                disabled={selectingDir || !fsApiAvailable}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:border-blue-300 hover:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors disabled:opacity-50 dark:hover:border-[#fbbf24]/50 dark:hover:bg-[#fbbf24]/10 dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
              >
                {selectingDir ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('localStorage.selecting')}
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    {localStoragePath ? t('localStorage.changeFolder') : t('localStorage.selectFolder')}
                  </>
                )}
              </button>
              {localStoragePath ? (
              <button
                type="button"
                onClick={() => {
                  setLocalStoragePath('');
                  revokeDirectory();
                  saveLocalStoragePreferences('');
                  // 清除所有简历预览缓存和诊断缓存
                  removeAllPreviewCaches();
                  removeAllDiagnosisCaches();
                  showToast(t('localStorage.unlinked'), 'success');
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                {t('localStorage.unlink')}
              </button>
              ) : null}
            </div>
            {localStoragePath ? (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                {t('localStorage.selectedFolder')}
                <span className="font-medium text-gray-700">{localStoragePath}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                {t('localStorage.backupHint')}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 dark:border-[#fbbf24]/20 dark:bg-[#fbbf24]/10">
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('localStorage.backupDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
    </section>

    {/* ======== AI 服务商 ======== */}
    <section id="ai-service" className="scroll-mt-28">
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1.5">
        <Sparkles className="w-5 h-5 text-gray-500" />
        {t('aiService.title')}
      </h3>
      <p className="text-sm text-[#6b7280] mb-4">{t('aiService.desc')}</p>

      <div className="space-y-6">
        <div>
          <div className="border-t border-gray-100 mb-4" />

            <div className="space-y-6">
              {/* Model source switcher */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  {t('aiService.modelSource')}
                </span>
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleModelSourceChange('public');
                        fetchPublicModels();
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        modelSource === 'public'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t('aiService.publicModel')}
                    </button>
                  ) : (
                    <Tooltip content={t('aiService.publicModelLoginRequired')}>
                    <span
                      className="px-4 py-1.5 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none"
                    >
                      {t('aiService.publicModel')}
                    </span>
                    </Tooltip>
                  )}
                  <button
                    type="button"
                    onClick={() => handleModelSourceChange('custom')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      modelSource === 'custom'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('aiService.customModel')}
                  </button>
                </div>
                {!isLoggedIn ? (
                  <p className="text-xs text-amber-500 mt-1.5">
                    {t('aiService.publicModelLoginHint')}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {modelSource === 'public'
                      ? t('aiService.publicModelDesc')
                      : t('aiService.customModelDesc')}
                  </p>
                )}
              </div>

              {/* Public model selector */}
              {modelSource === 'public' && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('aiService.selectPublicModel')}
                  </span>
                  <div className="relative" ref={publicModelDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setPublicModelDropdownOpen(!publicModelDropdownOpen);
                        if (publicModels.length === 0 && !publicModelsLoading) {
                          fetchPublicModels();
                        }
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {publicModelsLoading || (!!publicModelId && publicModels.length === 0) ? (
                          <span className="text-gray-400">{t('aiService.loadingModels')}</span>
                        ) : selectedPublicModel ? (
                          <span className="text-gray-900 font-medium truncate">{selectedPublicModel.name}</span>
                        ) : (
                          <span className="text-gray-400">{t('aiService.selectPublicModelPlaceholder')}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {selectedPublicModel && (
                          <span className="text-xs text-gray-400 font-mono">{selectedPublicModel.model}</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${publicModelDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Dropdown */}
                    {publicModelDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        {publicModels.length === 0 && !publicModelsLoading ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-gray-400">{t('aiService.noPublicModels')}</p>
                            <button
                              type="button"
                              onClick={fetchPublicModels}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium dark:text-[#fbbf24] dark:hover:text-[#f59e0b]"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {t('aiService.refreshList')}
                            </button>
                          </div>
                        ) : (
                          publicModels.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectPublicModel(m.id, m.name)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${
                                publicModelId === m.id ? 'text-blue-600 bg-blue-50/50 dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]' : 'text-gray-700'
                              }`}
                            >
                              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                {publicModelId === m.id ? <Check className="w-3.5 h-3.5" /> : null}
                              </span>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="font-medium truncate">{m.name}</div>
                                <div className="text-xs text-gray-400 font-mono">{m.model}</div>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <div className="text-sm font-semibold text-gray-700">
                                  {m.balance > 0 ? `$${m.balance.toFixed(2)}` : '-.--'}
                                </div>
                                <div className="text-[10px] text-gray-400">{t('aiService.balance')}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Refresh public models button */}
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400">
                        {selectedPublicModel
                          ? t('aiService.currentBalance', { balance: selectedPublicModel.balance > 0 ? selectedPublicModel.balance.toFixed(2) : '-.--' })
                          : t('aiService.selectPublicModelForService')}
                      </p>
                      {selectedPublicModel?.balance_updated_at && (
                        <span className="text-[10px] text-gray-300">
                          {t('aiService.lastRefreshed', { time: selectedPublicModel.balance_updated_at })}
                        </span>
                      )}
                    </div>
                    {selectedPublicModel && (
                      <button
                        type="button"
                        onClick={refreshBalances}
                        disabled={publicModelsLoading}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-all dark:hover:bg-[#fbbf24]/10 dark:hover:text-[#fbbf24]"
                      >
                        {publicModelsLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {t('aiService.refresh')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Custom API config (only shown when model source is custom) */}
              {modelSource === 'custom' && (
              <>
              {/* AI API URL input with provider dropdown */}
              <div>
                <label htmlFor="ai-api-url" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('aiService.apiUrl')}
                </label>
                <div className="relative" ref={apiUrlRef}>
                  <input
                    id="ai-api-url"
                    type="url"
                    value={aiServiceApiUrl}
                    onChange={(e) => handleApiUrlChange(e.target.value)}
                    onFocus={() => setApiUrlDropdownOpen(true)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
                  />
                  {/* Provider dropdown - 始终渲染，CSS 控制显隐以缓存图标 */}
                  <div
                    className={`absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 overflow-hidden transition-all duration-150 ${
                      apiUrlDropdownOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 pointer-events-none'
                    }`}
                  >
                    {AI_PROVIDER_OPTIONS.map((provider) => {
                      const isSelected = aiServiceApiUrl === provider.url;
                      return (
                        <button
                          key={provider.name}
                          type="button"
                          onClick={() => {
                            handleApiUrlChange(provider.url);
                            setApiUrlDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50/50 dark:bg-[#fbbf24]/10' : ''
                          }`}
                        >
                          <img
                            src={provider.icon}
                            alt={provider.name}
                            className="w-6 h-6 rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`font-medium ${isSelected ? 'text-blue-600 dark:text-[#fbbf24]' : 'text-gray-700'}`}>
                              {provider.name}
                              {provider.tagKey && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-normal bg-orange-100 text-orange-500 leading-none">
                                  {t(provider.tagKey)}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{provider.url}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0 dark:text-[#fbbf24]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('aiService.apiUrlDesc')}
                </p>
              </div>

              <div>
                <label htmlFor="ai-api-key" className="block text-sm font-medium text-gray-700 mb-1.5">
                  API Key
                </label>
                <input
                  id="ai-api-key"
                  type="password"
                  value={aiServiceApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('aiService.apiKeyDesc')}<span className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors dark:text-[#fbbf24] dark:hover:text-[#f59e0b]">{t('aiService.apiKeyHelpLink')}</span>
                </p>
              </div>

              <div>
                <label htmlFor="ai-model-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('aiService.modelName')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1" ref={modelDropdownRef}>
                    <input
                      id="ai-model-name"
                      type="text"
                      value={aiServiceModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder="gpt-3.5-turbo"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors dark:focus:ring-[#fbbf24]/30 dark:focus:border-[#fbbf24]"
                    />
                    {/* Model list dropdown */}
                    {modelDropdownOpen && availableModels.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 py-1 z-20 animate-in fade-in zoom-in-95 origin-top duration-150">
                        {availableModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSelectModel(m)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              m === aiServiceModel
                                ? 'text-blue-700 bg-blue-50 font-medium dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {fetchingModels ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {t('aiService.fetchModels')}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('aiService.fetchModelsHelp')}<a href="#" className="text-blue-500 hover:text-blue-600 ml-0.5 dark:text-[#fbbf24] dark:hover:text-[#f59e0b]">{t('aiService.officialDocs')}</a>
                </p>
              </div>

              </>
              )}
            </div>
        </div>
      </div>
    </div>
    </section>


    {/* ======== Live2D 看板娘 ======== */}
    <section id="live2d" className="scroll-mt-28">
    <div className={`mb-6 bg-white rounded-2xl border border-gray-100 ${live2dEnabled ? 'p-8' : 'py-5 px-8'}`}>
      <h3 className={`text-lg font-bold text-gray-900 flex items-center gap-2 ${live2dEnabled ? 'mb-1.5' : ''}`}>
        <SmilePlus className="w-5 h-5 text-gray-500" />
        {t('nav.live2d')}
        <button
          type="button"
          role="switch"
          aria-checked={live2dEnabled}
          onClick={handleLive2dToggle}
          className={`ml-auto relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-[#fbbf24]/30 ${
            live2dEnabled ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              live2dEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </h3>
      <p className="text-sm text-[#6b7280] mb-4">{t('live2d.desc')}</p>

      <div className="space-y-6">
        <div>
          {live2dEnabled && <div className="border-t border-gray-100 mb-4" />}

          {/* Mobile show toggle */}
          {live2dEnabled && (
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              {t('live2d.mobileShow')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={live2dMobileShow}
              onClick={() => {
                const next = !live2dMobileShow;
                setLive2dMobileShow(next);
                saveLive2dPreferences({ live2d_mobile_show: next });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                live2dMobileShow ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  live2dMobileShow ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          )}

          {/* Editor page toggle */}
          {live2dEnabled && (
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" />
              {t('live2d.showEditor')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={live2dShowEditor}
              onClick={() => {
                const next = !live2dShowEditor;
                setLive2dShowEditor(next);
                saveLive2dPreferences({ live2d_show_editor: next });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                live2dShowEditor ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  live2dShowEditor ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          )}

          {live2dEnabled && (
            <div className="space-y-4">
              {/* Position selector */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" />
                  {t('live2d.position.label')}
                </span>
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 flex-shrink-0">
                  {LIVE2D_POSITION_OPTIONS.map((opt) => {
                    const isSelected = opt.value === live2dPosition;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleLive2dPositionChange(opt.value)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {t(`live2d.position.${opt.value}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* More Settings toggle */}
              <button
                type="button"
                onClick={() => setLive2dMoreSettingsOpen(!live2dMoreSettingsOpen)}
                className="flex items-center justify-between gap-4 w-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-700">{t('live2d.advanced.title')}</p>
                    {!live2dMoreSettingsOpen && (
                      <p className="text-xs text-gray-400">{t('live2d.advanced.desc')}</p>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    live2dMoreSettingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Collapsible advanced settings */}
              {live2dMoreSettingsOpen && (
                <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                  {/* Pointer events pass-through */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {t('live2d.pointerPassThrough')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={live2dPointerPassThrough}
                      onClick={() => {
                        const next = !live2dPointerPassThrough;
                        setLive2dPointerPassThrough(next);
                        saveLive2dPreferences({ live2d_enable_pointer_events_pass_through: next });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        live2dPointerPassThrough ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          live2dPointerPassThrough ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Nearby behavior */}
                  <div className={`flex items-center justify-between gap-4 ${live2dPinned ? 'opacity-40 pointer-events-none' : ''}`}>
                    <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5" />
                      {t('live2d.nearbyBehavior.label')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20 text-right">
                        {formatLive2dNearbyBehavior(live2dNearbyBehavior, t)}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={live2dNearbyBehavior === 'expand'}
                        onClick={() => {
                          if (live2dPinned) return;
                          const next = live2dNearbyBehavior === 'expand' ? 'retract' : 'expand';
                          setLive2dNearbyBehavior(next);
                          saveLive2dPreferences({ live2d_nearby_behavior: next });
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          live2dNearbyBehavior === 'expand' ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            live2dNearbyBehavior === 'expand' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 常驻模式 */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600 flex-shrink-0 flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5" />
                      {t('live2d.pinned')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={live2dPinned}
                      onClick={() => {
                        const next = !live2dPinned;
                        setLive2dPinned(next);
                        saveLive2dPreferences({ live2d_pinned: next });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        live2dPinned ? 'bg-blue-600 dark:bg-[#fbbf24]' : 'bg-gray-300 hover:bg-gray-400 dark:bg-white/[0.12] dark:hover:bg-white/[0.18]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          live2dPinned ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reset button at bottom-right */}
      {live2dEnabled && (
        <>
          <div className="border-t border-gray-100 mt-4" />
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleLive2dReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-normal text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-300 transition-colors focus:outline-none"
            >
              <RotateCcw className="w-3 h-3" />
              {t('live2d.reset')}
            </button>
          </div>
        </>
      )}
    </div>
    </section>

    {/* ======== 快捷键 ======== */}
    <section id="shortcuts" className="scroll-mt-28">
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
          <Command className="w-5 h-5 text-gray-500" />
          {t('nav.shortcuts')}
        </h3>
        <p className="text-sm text-[#6b7280] mb-6">{t('shortcuts.desc')}</p>
        <div className="border-t border-gray-100 mb-4" />
        <div className="space-y-2">
          {[
            { key: '⌘ / Ctrl + S', desc: t('shortcuts.saveResume') },
            { key: '⌘ / Ctrl + Z', desc: t('shortcuts.undo') },
            { key: '⌘ / Ctrl + Shift + Z', desc: t('shortcuts.redo') },
            { key: '⌘ / Ctrl + P', desc: t('shortcuts.exportPdf') },
            { key: '⌘ / Ctrl + B', desc: t('shortcuts.bold') },
            { key: '⌘ / Ctrl + I', desc: t('shortcuts.italic') },
            { key: '⌘ / Ctrl + U', desc: t('shortcuts.underline') },
            { key: 'Space + 鼠标左键', desc: t('shortcuts.moveCanvas'), keyLabel: t('shortcuts.moveCanvasKey') },
            { key: 'Esc', desc: t('shortcuts.closeOrCancel') },
          ].map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-600">{shortcut.desc}</span>
              <kbd className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-mono text-gray-600 flex-shrink-0">
                {shortcut.keyLabel ?? shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ======== 关于 ======== */}
    <section id="about" className="scroll-mt-28">
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-1.5 flex items-center gap-2">
          <Info className="w-5 h-5 text-gray-500" />
          {t('nav.about')}
        </h3>
        <p className="text-sm text-[#6b7280] mb-6">{t('about.desc')}</p>
        <div className="border-t border-gray-100 mb-6" />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('about.version')}</p>
              <p className="text-xs text-gray-400">{t('about.versionDesc')}</p>
            </div>
            <span className="text-sm text-gray-500 font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">v1.0.0</span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('about.techStack')}</p>
              <p className="text-xs text-gray-400">{t('about.techStackDesc')}</p>
            </div>
            <span className="text-xs text-gray-400">React + Go</span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{t('about.live2dModel')}</p>
              <p className="text-xs text-gray-400">{t('about.live2dModelDesc')}</p>
            </div>
            <span className="text-xs text-gray-400">live2d-widget</span>
          </div>
        </div>
      </div>
    </section>

      {/* 同步确认弹窗 */}
      <SettingsSyncModal
        open={syncModalOpen}
        onConfirm={handleSyncConfirm}
        onCancel={handleSyncCancel}
      />
    </>
  );
}
