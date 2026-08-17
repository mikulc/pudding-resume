import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';

vi.mock('./settings/useSettingsPanelModel', () => ({
  useSettingsPanelModel: () => ({
    themeDrawerOpen: false,
    setThemeDrawerOpen: vi.fn(),
    theme: { layoutId: 'skyveil' },
    data: {},
    handleApplyTheme: vi.fn(),
  }),
}));

vi.mock('./ThemeDrawer', () => ({ ThemeDrawer: () => null }));
vi.mock('./settings/ThemeSettingsSection', () => ({ ThemeSettingsSection: () => <div data-settings-card="theme" /> }));
vi.mock('./settings/ColorSettingsSection', () => ({ ColorSettingsSection: () => <div data-settings-card="color" /> }));
vi.mock('./settings/FontSettingsSection', () => ({ FontSettingsSection: () => <div data-settings-card="typography" /> }));
vi.mock('./settings/PageSettingsSection', () => ({ PageSettingsSection: () => <div data-settings-card="page-layout" /> }));
vi.mock('./settings/LayoutSettingsSection', () => ({ LayoutSettingsSection: () => <div data-settings-card="personal-info" /> }));
vi.mock('./settings/WatermarkSettingsSection', () => ({ WatermarkSettingsSection: () => <div data-settings-card="watermark" /> }));
vi.mock('./settings/ResetSettingsSection', () => ({ ResetSettingsSection: () => <div data-settings-card="reset" /> }));

describe('SettingsPanel taxonomy', () => {
  it('keeps theme and color independent and orders cards by responsibility', () => {
    const { container } = render(<SettingsPanel />);
    const cards = Array.from(container.querySelectorAll('[data-settings-card]'))
      .map((node) => node.getAttribute('data-settings-card'));

    expect(cards).toEqual([
      'theme',
      'color',
      'typography',
      'page-layout',
      'personal-info',
      'watermark',
      'reset',
    ]);
  });
});
