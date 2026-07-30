import { useCallback, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { api } from '../../../utils/api';
import { fetchAiModels, fetchPublicModels as fetchPublicModelsApi } from '../../../api/ai';
import { getAIConfig, saveAIConfig, validateAIConfig } from '../../../utils/aiConfig';
import { saveSettings } from '../../../utils/localSettings';
import type { UserProfile } from '../../../types/auth';
import type { getInitialSettings } from '../settingsConstants';

type InitialSettings = ReturnType<typeof getInitialSettings>;
type SavePreferences = (interval: number, polish: boolean, apiUrl?: string, apiKey?: string, model?: string) => Promise<void>;

interface UseAISettingsOptions {
  initialSettings: InitialSettings;
  autoSaveInterval: number;
  aiPolishEnabled: boolean;
  savePreferences: SavePreferences;
  storageMode: 'local' | 'cloud';
  isLoggedIn: boolean;
  profile: UserProfile | null;
  setProfile: ((profile: UserProfile) => void) | undefined;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: TFunction<'settings'>;
}

export function useAISettings({
  initialSettings,
  autoSaveInterval,
  aiPolishEnabled,
  savePreferences,
  storageMode,
  isLoggedIn,
  profile,
  setProfile,
  showToast,
  t,
}: UseAISettingsOptions) {
  const [aiServiceApiUrl, setAiServiceApiUrl] = useState(initialSettings.ai_service_api_url);
  const [aiServiceApiKey, setAiServiceApiKey] = useState(initialSettings.ai_service_api_key);
  const [aiServiceModel, setAiServiceModel] = useState(initialSettings.ai_service_model);
  const [modelSource, setModelSource] = useState(initialSettings.model_source);
  const [publicModelId, setPublicModelId] = useState(initialSettings.public_model_id);
  const [publicModels, setPublicModels] = useState<Array<{ id: string; name: string; model: string; balance: number; balance_updated_at: string; sort_order: number }>>([]);
  const [publicModelsLoading, setPublicModelsLoading] = useState(false);
  const [publicModelDropdownOpen, setPublicModelDropdownOpen] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [apiUrlDropdownOpen, setApiUrlDropdownOpen] = useState(false);
  const publicModelDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const apiUrlRef = useRef<HTMLDivElement>(null);
  const aiConfigSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile || storageMode !== 'cloud') return;
    setAiServiceApiUrl(profile.ai_service_api_url ?? '');
    setAiServiceApiKey(profile.ai_service_api_key ?? '');
    setAiServiceModel(profile.ai_service_model ?? '');
    setModelSource(profile.model_source ?? 'public');
    setPublicModelId(profile.public_model_id ?? '');
  }, [profile, storageMode]);

  const scheduleAIConfigSave = useCallback((changes: { apiUrl?: string; apiKey?: string; model?: string }, delay = 800) => {
    if (aiConfigSaveTimerRef.current) clearTimeout(aiConfigSaveTimerRef.current);
    aiConfigSaveTimerRef.current = setTimeout(() => {
      void savePreferences(autoSaveInterval, aiPolishEnabled, changes.apiUrl, changes.apiKey, changes.model);
    }, delay);
  }, [aiPolishEnabled, autoSaveInterval, savePreferences]);

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
      if (res.models.length === 0) showToast(t('aiService.noModelsFetched'));
      else setModelDropdownOpen(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('aiService.fetchModelsFailed'), 'error');
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

  const fetchPublicModels = useCallback(async () => {
    setPublicModelsLoading(true);
    try {
      const res = await fetchPublicModelsApi();
      setPublicModels(res.models);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('aiService.fetchPublicModelsFailed'), 'error');
    } finally {
      setPublicModelsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (modelSource === 'public') void fetchPublicModels();
  }, [fetchPublicModels, modelSource]);

  const handleModelSourceChange = (source: string) => {
    if (!isLoggedIn && source === 'public') {
      showToast(t('aiService.publicModelLoginRequired'), 'info');
      return;
    }
    setModelSource(source);
    const latest = getAIConfig();
    saveAIConfig({ modelSource: source as 'custom' | 'public', publicModelId: source === 'public' ? latest.publicModelId : '' });
    const body = { model_source: source };
    if (storageMode === 'local') {
      saveSettings(body);
      return;
    }
    api.put('/api/user/preferences', body).then(() => {
      if (profile && setProfile) setProfile({ ...profile, model_source: source } as UserProfile);
      saveSettings(body);
    }).catch((err: unknown) => {
      showToast(err instanceof Error ? err.message : t('common:saveFailed'), 'error');
      setModelSource(initialSettings.model_source);
    });
  };

  const handleSelectPublicModel = (modelId: string, _modelName: string) => {
    setPublicModelId(modelId);
    setPublicModelDropdownOpen(false);
    saveAIConfig({ modelSource: 'public', publicModelId: modelId });
    const body = { model_source: 'public', public_model_id: modelId };
    if (storageMode === 'local') {
      saveSettings(body);
      return;
    }
    api.put('/api/user/preferences', body).then(() => {
      if (profile && setProfile) setProfile({ ...profile, model_source: 'public', public_model_id: modelId } as UserProfile);
      saveSettings(body);
    }).catch((err: unknown) => {
      showToast(err instanceof Error ? err.message : t('common:saveFailed'), 'error');
      setPublicModelId(initialSettings.public_model_id);
    });
  };

  useOutsideClick({ open: publicModelDropdownOpen, refs: [publicModelDropdownRef], onOutsideClick: () => setPublicModelDropdownOpen(false) });
  useOutsideClick({ open: modelDropdownOpen, refs: [modelDropdownRef], onOutsideClick: () => setModelDropdownOpen(false) });
  useOutsideClick({ open: apiUrlDropdownOpen, refs: [apiUrlRef], onOutsideClick: () => setApiUrlDropdownOpen(false) });

  useEffect(() => () => {
    if (aiConfigSaveTimerRef.current) clearTimeout(aiConfigSaveTimerRef.current);
  }, []);

  const resetAISettings = useCallback(() => {
    setAiServiceApiUrl(initialSettings.ai_service_api_url);
    setAiServiceApiKey(initialSettings.ai_service_api_key);
    setAiServiceModel(initialSettings.ai_service_model);
    setModelSource(initialSettings.model_source);
    setPublicModelId(initialSettings.public_model_id);
  }, [initialSettings]);

  return {
    aiServiceApiUrl, aiServiceApiKey, aiServiceModel, modelSource, publicModelId, publicModels,
    publicModelsLoading, publicModelDropdownOpen, setPublicModelDropdownOpen, fetchingModels,
    availableModels, modelDropdownOpen, apiUrlDropdownOpen, setApiUrlDropdownOpen,
    publicModelDropdownRef, modelDropdownRef, apiUrlRef,
    handleApiUrlChange, handleApiKeyChange, handleModelChange, handleFetchModels, handleSelectModel,
    fetchPublicModels, handleModelSourceChange, handleSelectPublicModel,
    resetAISettings,
    selectedPublicModel: publicModels.find((model) => model.id === publicModelId),
  };
}
