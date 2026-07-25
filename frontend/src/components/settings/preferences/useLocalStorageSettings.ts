import { useCallback, useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { checkFileSystemAccess, selectDirectory } from '../../../utils/localStorage';
import { loadSettings, saveSettings } from '../../../utils/localSettings';
import type { UserProfile } from '../../../types/auth';
import type { getInitialSettings } from '../settingsConstants';

type InitialSettings = ReturnType<typeof getInitialSettings>;

interface UseLocalStorageSettingsOptions {
  initialSettings: InitialSettings;
  profile: UserProfile | null;
  storageMode: 'local' | 'cloud';
  saveToCloud: (changes: Record<string, unknown>) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: TFunction<'settings'>;
}

export function useLocalStorageSettings({ initialSettings, profile, storageMode, saveToCloud, showToast, t }: UseLocalStorageSettingsOptions) {
  const [localStoragePath, setLocalStoragePath] = useState(initialSettings.local_storage_path);
  const [selectingDir, setSelectingDir] = useState(false);
  const [fsApiAvailable] = useState(() => checkFileSystemAccess());

  useEffect(() => {
    if (!profile || storageMode !== 'cloud') return;
    setLocalStoragePath(profile.local_storage_path || loadSettings()?.local_storage_path || '');
  }, [profile, storageMode]);

  const saveLocalStoragePreferences = useCallback(async (path: string) => {
    try {
      if (storageMode === 'local') saveSettings({ local_storage_path: path });
      else await saveToCloud({ local_storage_enabled: !!path, local_storage_path: path });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common:saveFailed'), 'error');
      setLocalStoragePath(initialSettings.local_storage_path);
    }
  }, [initialSettings.local_storage_path, saveToCloud, showToast, storageMode, t]);

  const handleSelectDirectory = async () => {
    setSelectingDir(true);
    try {
      const result = await selectDirectory();
      if (result) {
        setLocalStoragePath(result.name);
        await saveLocalStoragePreferences(result.name);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('localStorage.selectFailed'), 'error');
    } finally {
      setSelectingDir(false);
    }
  };

  return {
    localStoragePath, setLocalStoragePath, selectingDir, fsApiAvailable,
    saveLocalStoragePreferences, handleSelectDirectory,
  };
}
