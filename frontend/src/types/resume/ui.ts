import type { SectionKey } from './core';
import type { SaveStatusType } from './library';
import type { PersonalHeaderSettings, ThemeSettings, TypographySettings, WatermarkSettings } from './theme';

export interface ResumeMeta {
  id: string | null;
  name: string;
}

export type RightPanelTab = 'settings' | 'ats';
export type MobileDockMode = 'edit' | 'settings' | 'preview';

export interface AppUIState {
  activeSection: SectionKey | null;
  zoom: number;
  settingsOpen: boolean;
  editorOpen: boolean;
  theme: ThemeSettings;
  saveStatus: SaveStatusType;
  saveTrigger: number; // incremented on save complete, drives breathing animation
  lastSavedAt: number | null; // 上次保存成功的时间戳（ms）
  drawerOpen: boolean; // 抽屉是否打开（用于快捷键隔离）
  isSecondaryEditorOpen: boolean; // 二级长文本编辑面板是否打开（用于拦截预览区点击）
  resumeMeta: ResumeMeta; // 当前编辑的简历元信息
  rightPanelTab: RightPanelTab; // 右侧面板当前激活的 Tab
  mobileDockMode: MobileDockMode; // 移动端底部 Dock 当前模式
}

export type AppUIAction =
  | { type: 'SET_ACTIVE_SECTION'; payload: SectionKey | null }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_SETTINGS_OPEN'; payload: boolean }
  | { type: 'TOGGLE_EDITOR' }
  | { type: 'SET_EDITOR_OPEN'; payload: boolean }
  | { type: 'SET_THEME'; payload: Partial<ThemeSettings> }
  | { type: 'SET_TYPOGRAPHY'; payload: Partial<TypographySettings> }
  | { type: 'SET_PERSONAL_HEADER'; payload: Partial<PersonalHeaderSettings> }
  | { type: 'SET_WATERMARK'; payload: Partial<WatermarkSettings> }
  | { type: 'RESET_STYLE' }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatusType }
  | { type: 'TRIGGER_SAVE_ANIMATION' }
  | { type: 'SET_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_RESUME_META'; payload: Partial<ResumeMeta> }
  | { type: 'SET_RIGHT_PANEL_TAB'; payload: RightPanelTab }
  | { type: 'SET_MOBILE_DOCK_MODE'; payload: MobileDockMode };
