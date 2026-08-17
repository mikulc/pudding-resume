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
        typography: { ...DEFAULT_THEME.typography, bodyFontSize: 22 },
      },
    };

    const result = appUIReducer(customState, { type: 'RESET_STYLE' });

    expect(result.theme.layoutId).toBe('classic-horizontal');
    expect(result.theme.typography.bodyFontSize).toBe(DEFAULT_THEME.typography.bodyFontSize);
    expect(result.theme.watermark.content).toBe('Default watermark');
  });

  it('migrates legacy custom colors to the single themeColor field', () => {
    const legacyPayload = {
      customColors: {
        bg: '#DCFCE7',
        border: '#16A34A',
        tagBg: '#F0FDF4',
        tagText: '#15803D',
      },
      colorTheme: 'custom',
      fontFamily: 'system',
    };

    const result = appUIReducer(state, {
      type: 'SET_THEME',
      payload: legacyPayload as never,
    });
    const theme = result.theme as typeof result.theme & Record<string, unknown>;

    expect(theme.themeColor).toBe('#16A34A');
    expect(theme.customColors).toBeUndefined();
    expect(theme.colorTheme).toBeUndefined();
    expect(theme.typography.fontFamily).toBe('noto-sans-sc');
  });

  it('fills defaults when importing a compact disabled watermark', () => {
    const result = appUIReducer(state, {
      type: 'SET_THEME',
      payload: { watermark: { enabled: false } } as never,
    });

    expect(result.theme.watermark).toEqual({
      ...DEFAULT_THEME.watermark,
      enabled: false,
    });
  });

  it('deep-merges a partial personal header update', () => {
    const customState: AppUIState = {
      ...state,
      theme: {
        ...DEFAULT_THEME,
        personalHeader: {
          fieldDisplayMode: 'text',
          photoLayout: 'right',
          photoLayoutCustomized: true,
          photoStyle: { width: 80, height: 100, borderRadius: 8 },
          photoStyleCustomized: true,
        },
      },
    };

    const result = appUIReducer(customState, {
      type: 'SET_PERSONAL_HEADER',
      payload: { fieldDisplayMode: 'none' },
    });

    expect(result.theme.personalHeader).toEqual({
      ...customState.theme.personalHeader,
      fieldDisplayMode: 'none',
    });
  });

  it('deep-merges a partial typography update', () => {
    const customState: AppUIState = {
      ...state,
      theme: {
        ...DEFAULT_THEME,
        typography: {
          ...DEFAULT_THEME.typography,
          fontFamily: 'misans',
          lineSpacing: 1.8,
        },
      },
    };

    const result = appUIReducer(customState, {
      type: 'SET_TYPOGRAPHY',
      payload: { bodyFontSize: 18 },
    });

    expect(result.theme.typography).toEqual({
      ...customState.theme.typography,
      bodyFontSize: 18,
    });
  });

  it('resets personal header presentation with the rest of the style', () => {
    const result = appUIReducer({
      ...state,
      theme: {
        ...DEFAULT_THEME,
        personalHeader: {
          ...DEFAULT_THEME.personalHeader,
          fieldDisplayMode: 'text',
          photoLayoutCustomized: true,
        },
      },
    }, { type: 'RESET_STYLE' });

    expect(result.theme.personalHeader).toEqual(DEFAULT_THEME.personalHeader);
  });
});
