import { describe, expect, it, vi } from 'vitest';
import type { AppUIState } from '../../../types/resume';
import { DEFAULT_THEME } from '../../../types/resume';

vi.mock('../../../utils/i18n', () => ({
  default: {
    t: () => 'Default watermark',
  },
}));

vi.mock('../../../registry/layouts', () => ({
  getLayoutDefaultColor: () => '#2563eb',
}));

import { appUIReducer } from './appUIReducer';

const state: AppUIState = {
  activeSection: 'personal',
  zoom: 1,
  settingsOpen: true,
  editorOpen: true,
  theme: DEFAULT_THEME,
  saveStatus: 'saved',
  saveTrigger: 0,
  lastSavedAt: null,
  drawerOpen: false,
  isSecondaryEditorOpen: false,
  resumeMeta: { id: null, name: 'Resume' },
  rightPanelTab: 'settings',
  mobileDockMode: 'edit',
};

describe('appUIReducer', () => {
  it('clamps zoom to the supported range', () => {
    expect(appUIReducer(state, { type: 'SET_ZOOM', payload: 0.1 }).zoom).toBe(0.3);
    expect(appUIReducer(state, { type: 'SET_ZOOM', payload: 2 }).zoom).toBe(2);
    expect(appUIReducer(state, { type: 'SET_ZOOM', payload: 2.5 }).zoom).toBe(2);
  });

  it('keeps the selected layout while resetting style values', () => {
    const customState: AppUIState = {
      ...state,
      theme: {
        ...DEFAULT_THEME,
        layoutId: 'classic-horizontal',
        fontSize: 22,
      },
    };

    const result = appUIReducer(customState, { type: 'RESET_STYLE' });

    expect(result.theme.layoutId).toBe('classic-horizontal');
    expect(result.theme.fontSize).toBe(DEFAULT_THEME.fontSize);
    expect(result.theme.watermark.content).toBe('Default watermark');
  });
});
