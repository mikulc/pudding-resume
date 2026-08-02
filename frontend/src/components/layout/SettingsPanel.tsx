import { ThemeDrawer } from './ThemeDrawer';
import { ColorSettingsSection } from './settings/ColorSettingsSection';
import { FontSettingsSection } from './settings/FontSettingsSection';
import { LayoutSettingsSection } from './settings/LayoutSettingsSection';
import { PageSettingsSection } from './settings/PageSettingsSection';
import { ResetSettingsSection } from './settings/ResetSettingsSection';
import { ThemeSettingsSection } from './settings/ThemeSettingsSection';
import { WatermarkSettingsSection } from './settings/WatermarkSettingsSection';
import { useSettingsPanelModel } from './settings/useSettingsPanelModel';

export function SettingsPanel() {
  const model = useSettingsPanelModel();
  return (
    <div className="theme-transition-target h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar mobile-scroll-dock-space">
        <ThemeSettingsSection model={model} />
        <ColorSettingsSection model={model} />
        <PageSettingsSection model={model} />
        <FontSettingsSection model={model} />
        <LayoutSettingsSection model={model} />
        <WatermarkSettingsSection model={model} />
        <ResetSettingsSection model={model} />
      </div>
      <ThemeDrawer
        open={model.themeDrawerOpen}
        onClose={() => model.setThemeDrawerOpen(false)}
        currentLayoutId={model.theme.layoutId}
        content={model.data}
        onApply={model.handleApplyTheme}
      />
    </div>
  );
}
