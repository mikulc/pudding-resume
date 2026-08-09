import { useCallback, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { fetchAiModels } from '../../../api/ai';
import { saveAIConfig, validateAIConfig } from '../../../utils/aiConfig';
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
  profile: UserProfile | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: TFunction<'settings'>;
}

export function useAISettings({
  initialSettings,
  autoSaveInterval,
  aiPolishEnabled,
  savePreferences,
  storageMode,
  profile,
  showToast,
  t,
}: UseAISettingsOptions) {
  const [aiServiceApiUrl, setAiServiceApiUrl] = useState(initialSettings.ai_service_api_url);
  const [aiServiceApiKey, setAiServiceApiKey] = useState(initialSettings.ai_service_api_key);
  const [aiServiceModel, setAiServiceModel] = useState(initialSettings.ai_service_model);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [apiUrlDropdownOpen, setApiUrlDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const apiUrlRef = useRef<HTMLDivElement>(null);
  const aiConfigSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile || storageMode !== 'cloud') return;
    setAiServiceApiUrl(profile.ai_service_api_url ?? '');
    // API keys belong to this browser and are never hydrated from the profile.
    setAiServiceModel(profile.ai_service_model ?? '');
  }, [profile, storageMode]);

  const scheduleAIConfigSave = useCallback((changes: { apiUrl?: string; apiKey?: string; model?: string }, delay = 800) => {
    if (aiConfigSaveTimerRef.current) clearTimeout(aiConfigSaveTimerRef.current);
    aiConfigSaveTimerRef.current = setTimeout(() => {
      void savePreferences(autoSaveInterval, aiPolishEnabled, changes.apiUrl, changes.apiKey, changes.model);
    }, delay);
  }, [aiPolishEnabled, autoSaveInterval, savePreferences]);

  const handleApiUrlChange = (value: string) => {
    setAiServiceApiUrl(value);
    saveAIConfig({ baseUrl: value });
    scheduleAIConfigSave({ apiUrl: value });
  };
  const handleApiKeyChange = (value: string) => {
    setAiServiceApiKey(value);
    saveAIConfig({ apiKey: value });
  };
  const handleModelChange = (value: string) => {
    setAiServiceModel(value);
    saveAIConfig({ modelName: value });
    scheduleAIConfigSave({ model: value });
  };

  const handleFetchModels = async () => {
    const nextConfig = saveAIConfig({
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
    saveAIConfig({ modelName: model });
    scheduleAIConfigSave({ model }, 300);
  };

  useOutsideClick({ open: modelDropdownOpen, refs: [modelDropdownRef], onOutsideClick: () => setModelDropdownOpen(false) });
  useOutsideClick({ open: apiUrlDropdownOpen, refs: [apiUrlRef], onOutsideClick: () => setApiUrlDropdownOpen(false) });

  useEffect(() => () => {
    if (aiConfigSaveTimerRef.current) clearTimeout(aiConfigSaveTimerRef.current);
  }, []);

  const resetAISettings = useCallback(() => {
    setAiServiceApiUrl(initialSettings.ai_service_api_url);
    setAiServiceApiKey(initialSettings.ai_service_api_key);
    setAiServiceModel(initialSettings.ai_service_model);
  }, [initialSettings]);

  return {
    aiServiceApiUrl, aiServiceApiKey, aiServiceModel, fetchingModels,
    availableModels, modelDropdownOpen, apiUrlDropdownOpen, setApiUrlDropdownOpen,
    modelDropdownRef, apiUrlRef,
    handleApiUrlChange, handleApiKeyChange, handleModelChange, handleFetchModels, handleSelectModel,
    resetAISettings,
  };
}
