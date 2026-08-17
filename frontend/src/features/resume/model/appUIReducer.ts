import type { AppUIAction, AppUIState } from '../../../types/resume';
import { DEFAULT_THEME, normalizeThemeSettings } from '../../../types/resume';
import { getLayoutDefaultColor } from '../../../registry/layouts';
import i18n from '../../../utils/i18n';
import { MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM } from '../../../utils/previewZoom';

export function appUIReducer(state: AppUIState, action: AppUIAction): AppUIState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.payload };
    case 'SET_ZOOM':
      return {
        ...state,
        zoom: Math.max(MIN_PREVIEW_ZOOM, Math.min(MAX_PREVIEW_ZOOM, action.payload)),
      };
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };
    case 'SET_SETTINGS_OPEN':
      return { ...state, settingsOpen: action.payload };
    case 'TOGGLE_EDITOR':
      return { ...state, editorOpen: !state.editorOpen };
    case 'SET_EDITOR_OPEN':
      return { ...state, editorOpen: action.payload };
    case 'SET_THEME':
      return { ...state, theme: normalizeThemeSettings(action.payload, undefined, state.theme) };
    case 'SET_PERSONAL_HEADER':
      return {
        ...state,
        theme: normalizeThemeSettings({ personalHeader: action.payload }, undefined, state.theme),
      };
    case 'SET_TYPOGRAPHY':
      return {
        ...state,
        theme: normalizeThemeSettings({ typography: action.payload }, undefined, state.theme),
      };
    case 'SET_WATERMARK':
      return {
        ...state,
        theme: {
          ...state.theme,
          watermark: { ...state.theme.watermark, ...action.payload },
        },
      };
    case 'RESET_STYLE': {
      const defaultColor = getLayoutDefaultColor(state.theme.layoutId);
      return {
        ...state,
        theme: {
          ...DEFAULT_THEME,
          layoutId: state.theme.layoutId,
          themeColor: defaultColor,
          watermark: {
            ...DEFAULT_THEME.watermark,
            content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
            isCustomContent: false,
          },
        },
      };
    }
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'TRIGGER_SAVE_ANIMATION':
      return { ...state, saveStatus: 'saved', saveTrigger: state.saveTrigger + 1, lastSavedAt: Date.now() };
    case 'SET_DRAWER_OPEN':
      return { ...state, drawerOpen: action.payload, isSecondaryEditorOpen: action.payload };
    case 'SET_RESUME_META':
      return { ...state, resumeMeta: { ...state.resumeMeta, ...action.payload } };
    case 'SET_RIGHT_PANEL_TAB':
      return { ...state, rightPanelTab: action.payload };
    case 'SET_MOBILE_DOCK_MODE':
      return { ...state, mobileDockMode: action.payload };
    default:
      return state;
  }
}

