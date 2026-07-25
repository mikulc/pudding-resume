import React,{ createContext,useCallback,useContext,useEffect,useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { appUIReducer } from '../../features/resume/model/appUIReducer';
import type { AppUIAction,AppUIState,MobileDockMode,RightPanelTab,SectionKey } from '../../types/resume';
import { DEFAULT_SECTION_ORDER,DEFAULT_THEME } from '../../types/resume';
import i18n from '../../utils/i18n';

// ---- App UI State ----

const defaultAppUI: AppUIState = {
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
  resumeMeta: { id: null, name: i18n.t('list.unnamedResume', { ns: 'resume' }) },
  rightPanelTab: 'settings',
  mobileDockMode: 'edit',
};

const LAST_ACTIVE_SECTION_STORAGE_KEY = 'resume_editor_last_expanded_section';
const RIGHT_PANEL_TAB_STORAGE_KEY = 'resume_editor_right_panel_tab';
const MOBILE_DOCK_MODE_STORAGE_KEY = 'resume_editor_mobile_dock_mode';

function getInitialActiveSection(): SectionKey {
  if (typeof window === 'undefined') return 'personal';
  const stored = window.localStorage.getItem(LAST_ACTIVE_SECTION_STORAGE_KEY);
  return DEFAULT_SECTION_ORDER.includes(stored as SectionKey) ? (stored as SectionKey) : 'personal';
}

function getInitialRightPanelTab(): RightPanelTab {
  return 'settings';
}

function getInitialMobileDockMode(): MobileDockMode {
  if (typeof window === 'undefined') return 'edit';
  const stored = window.localStorage.getItem(MOBILE_DOCK_MODE_STORAGE_KEY);
  if (stored === 'settings' || stored === 'preview') return stored;
  return 'edit';
}

interface AppUIContextType {
  ui: AppUIState;
  uiDispatch: React.Dispatch<AppUIAction>;
}

export const AppUIContext = createContext<AppUIContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ui, rawUiDispatch] = useReducer(appUIReducer, undefined, () => ({
    ...defaultAppUI,
    activeSection: getInitialActiveSection(),
    rightPanelTab: getInitialRightPanelTab(),
    mobileDockMode: getInitialMobileDockMode(),
    theme: {
      ...defaultAppUI.theme,
      watermark: {
        ...defaultAppUI.theme.watermark,
        content: i18n.t('watermark.defaultContent', { ns: 'resume' }),
        isCustomContent: false,
      },
    },
  }));

  const uiDispatch = useCallback<React.Dispatch<AppUIAction>>((action) => {
    if (action.type === 'SET_ACTIVE_SECTION') {
      if (action.payload) {
        window.localStorage.setItem(LAST_ACTIVE_SECTION_STORAGE_KEY, action.payload);
      } else {
        window.localStorage.removeItem(LAST_ACTIVE_SECTION_STORAGE_KEY);
      }
    }
    if (action.type === 'SET_RIGHT_PANEL_TAB') {
      window.localStorage.setItem(RIGHT_PANEL_TAB_STORAGE_KEY, action.payload);
    }
    if (action.type === 'SET_MOBILE_DOCK_MODE') {
      window.localStorage.setItem(MOBILE_DOCK_MODE_STORAGE_KEY, action.payload);
    }
    rawUiDispatch(action);
  }, []);

  // 语言切换时：如果水印内容未自定义，跟随语言更新默认值
  const { i18n: i18nInstance } = useTranslation();
  const isCustomContent = ui.theme.watermark.isCustomContent;

  useEffect(() => {
    if (!isCustomContent) {
      const defaultContent = i18n.t('watermark.defaultContent', { ns: 'resume' });
      if (ui.theme.watermark.content !== defaultContent) {
        rawUiDispatch({
          type: 'SET_WATERMARK',
          payload: {
            content: defaultContent,
            isCustomContent: false,
          },
        });
      }
    }
  }, [i18nInstance.language, isCustomContent, ui.theme.watermark.content]);

  return (
    <AppUIContext.Provider value={{ ui, uiDispatch }}>
      {children}
    </AppUIContext.Provider>
  );
}

export function useAppUI() {
  const context = useContext(AppUIContext);
  if (!context) {
    throw new Error('useAppUI must be used within an AppProvider');
  }
  return context;
}
