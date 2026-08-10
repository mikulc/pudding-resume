import type { SettingsPreferences } from '../useSettingsPreferences';
import { Loader2, FolderOpen, HardDrive } from 'lucide-react';
import { revokeDirectory } from '../../../utils/localStorage';
import { removeAllPreviewCaches } from '../../../utils/previewCache';
import { removeAllDiagnosisCaches } from '../../../hooks/useDiagnosis';

interface StorageSectionProps { settings: SettingsPreferences; }

export function StorageSection({ settings }: StorageSectionProps) {
  const {
    saveLocalStoragePreferences,
    handleSelectDirectory,
    localStoragePath,
    setLocalStoragePath,
    selectingDir,
    fsApiAvailable,
    showToast,
    t,
  } = settings;

  return (
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:!border-[var(--theme-accent)] hover:!bg-[var(--theme-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] transition-colors disabled:opacity-50"
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

          <div className="rounded-xl bg-[var(--theme-accent-soft)] border border-[var(--theme-accent)] p-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('localStorage.backupDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
    </section>
  );
}
