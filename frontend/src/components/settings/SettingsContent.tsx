import type { UserProfile } from '../../types/auth';
import { SettingsSyncModal } from './SettingsSyncModal';
import { useSettingsPreferences } from './useSettingsPreferences';
import { PreferencesSection } from './sections/PreferencesSection';
import { StorageSection } from './sections/StorageSection';
import { AIServiceSection } from './sections/AIServiceSection';
import { Live2DSection } from './sections/Live2DSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';

export function SettingsContent({ isLoggedIn, profile }: { isLoggedIn: boolean; profile: UserProfile | null }) {
  const settings = useSettingsPreferences(isLoggedIn, profile);

  return (
    <>
      <PreferencesSection settings={settings} />
      <StorageSection settings={settings} />
      <AIServiceSection settings={settings} />
      <Live2DSection settings={settings} />
      <ShortcutsSection settings={settings} />
      <AboutSection settings={settings} />
      <SettingsSyncModal
        open={settings.syncModalOpen}
        onConfirm={settings.handleSyncConfirm}
        onCancel={settings.handleSyncCancel}
      />
    </>
  );
}
