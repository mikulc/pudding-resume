export const SETTINGS_SECTION_IDS = [
  'preferences',
  'storage',
  'ai-service',
  'live2d',
  'shortcuts',
  'about',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export function getSettingsSectionFromHash(hash: string): SettingsSectionId | null {
  const section = decodeURIComponent(hash.replace(/^#/, ''));
  return SETTINGS_SECTION_IDS.includes(section as SettingsSectionId)
    ? section as SettingsSectionId
    : null;
}
