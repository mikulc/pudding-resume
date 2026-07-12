import type { LayoutDefinition } from './types';
import { skyveilLayout } from './skyveil';
import { cyanbluLayout } from './cyanblu';
import { ordrinLayout } from './ordrin';
import { leftSidebarTwoColumnLayout } from './left-sidebar-two-column';
import { centerlineLayout } from './centerline';
import { classicHorizontalLayout } from './classic-horizontal';
import { blueprintIconsLayout } from './blueprint-icons';
import { monochromeRingsLayout } from './monochrome-rings';
import { tealRibbonWaveLayout } from './teal-ribbon-wave';
import { blueBannerIconsLayout } from './blue-banner-icons';
import { azureSidebarLayout } from './azure-sidebar';
import i18n from '../../utils/i18n';

/**
 * 布局注册表 —— 所有可用布局的唯一入口
 *
 * 新增布局只需：
 * 1. 创建 `registry/layouts/creative.ts`，导出 `LayoutDefinition`
 * 2. 在此处导入并注册
 * 3. 在后端 `style_library` 表插入对应元数据记录
 */
export const layoutRegistry: Record<string, LayoutDefinition> = {
  [skyveilLayout.id]: skyveilLayout,
  [cyanbluLayout.id]: cyanbluLayout,
  [ordrinLayout.id]: ordrinLayout,
  [leftSidebarTwoColumnLayout.id]: leftSidebarTwoColumnLayout,
  [centerlineLayout.id]: centerlineLayout,
  [classicHorizontalLayout.id]: classicHorizontalLayout,
  [blueprintIconsLayout.id]: blueprintIconsLayout,
  [monochromeRingsLayout.id]: monochromeRingsLayout,
  [tealRibbonWaveLayout.id]: tealRibbonWaveLayout,
  [blueBannerIconsLayout.id]: blueBannerIconsLayout,
  [azureSidebarLayout.id]: azureSidebarLayout,
};

/**
 * 获取指定布局的 CSS 片段
 * 未知 layoutId 返回空字符串（skyveil 布局行为）
 */
export function getLayoutCSS(layoutId: string): string {
  return layoutRegistry[layoutId]?.css ?? '';
}

/**
 * 获取指定布局的展示名称
 * 未知 layoutId 返回 '未知布局'
 */
export function getLayoutName(layoutId: string): string {
  const nameKey = layoutRegistry[layoutId]?.nameKey;
  return nameKey ? i18n.t(nameKey, { ns: 'resume' }) : i18n.t('templateNames.unknownLayout', { ns: 'resume' });
}

/**
 * 获取指定布局的默认主题主色
 * 未知 layoutId 返回 '#3B82F6'（默认蓝色）
 */
export function getLayoutDefaultColor(layoutId: string): string {
  return layoutRegistry[layoutId]?.defaultColor ?? '#3B82F6';
}

export function getLayoutDefaultPageMargin(layoutId: string): number | undefined {
  return layoutRegistry[layoutId]?.defaultPageMargin;
}

/**
 * 解析布局定义，未知 layoutId 降级到 skyveil
 */
export function resolveLayout(layoutId: string): LayoutDefinition {
  return layoutRegistry[layoutId] ?? skyveilLayout;
}

export type { LayoutDefinition, HeaderMode, ThemeSignature } from './types';
