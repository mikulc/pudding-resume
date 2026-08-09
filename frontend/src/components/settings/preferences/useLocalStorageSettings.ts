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
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: TFunction<'settings'>;
}

export function useLocalStorageSettings({ initialSettings, profile, showToast, t }: UseLocalStorageSettingsOptions) {
  const [localStoragePath, setLocalStoragePath] = useState(initialSettings.local_storage_path);
  const [selectingDir, setSelectingDir] = useState(false);
  const [fsApiAvailable] = useState(() => checkFileSystemAccess());

  useEffect(() => {
    if (!profile) return;
    setLocalStoragePath(profile.local_storage_path || loadSettings()?.local_storage_path || '');
  }, [profile]);

  const saveLocalStoragePreferences = useCallback(async (path: string) => {
    try {
      // Directory handles and display paths only make sense on this device.
      saveSettings({ local_storage_path: path });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common:saveFailed'), 'error');
      setLocalStoragePath(initialSettings.local_storage_path);
    }
  }, [initialSettings.local_storage_path, showToast, t]);

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
