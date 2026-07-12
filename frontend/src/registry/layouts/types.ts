import type React from 'react';
import type { SectionKey } from '../../types/resume';

/**
 * 标题渲染模式
 * - 'bar': 左侧色块竖条（经典默认风格）
 * - 'icons': 圆形图标（现代卡片风格）
 * - 'underline': 底部分割线（优雅/极简风格）
 */
export type HeaderMode = 'bar' | 'icons' | 'underline';

export interface ThemeSignature {
  layout: 'single-column' | 'double-column';
  headerDecoration: 'none' | 'rings' | 'solid-bar' | 'side-block' | 'wave';
  sectionStyle: 'underline' | 'icon-line' | 'filled-title' | 'minimal';
}

/**
 * 布局定义接口
 * 每个布局模块导出一个 LayoutDefinition 对象，包含该布局的
 * CSS 片段、默认颜色、图标映射和行为声明。
 */
export interface LayoutDefinition {
  /** 布局唯一标识（如 'cyanblu'、'ordrin'），对应后端 style_library.layout_id */
  id: string;
  /** i18n key for layout display name */
  nameKey: string;
  /** 布局 CSS 片段字符串，通过 <style> 标签注入到预览 DOM */
  css: string;
  /** 布局默认主题主色（hex，如 '#3B82F6'） */
  defaultColor: string;
  /** Optional default page margin in mm when creating or applying this layout. */
  defaultPageMargin?: number;
  /** 标题渲染模式 */
  headerMode: HeaderMode;
  /** Compact visual fingerprint used in the settings panel. */
  signature: ThemeSignature;
  /** Increment when layout visuals change so generated previews can invalidate caches. */
  previewVersion: string;
  /** 各 section 的图标 SVG（headerMode='icons' 时使用） */
  iconMap?: Partial<Record<SectionKey, React.ReactNode>>;
  /** 个人资料区域额外 CSS class */
  personalInfoClass?: string;
  /** Resume content shell mode. `sidebar` renders a fixed left sidebar plus main content. */
  contentMode?: 'default' | 'sidebar';
  /** Section keys rendered in the sidebar when contentMode is `sidebar`. */
  sidebarSections?: SectionKey[];
}
