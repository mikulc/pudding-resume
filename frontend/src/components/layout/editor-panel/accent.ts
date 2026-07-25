import React from 'react';
import { ThemeSettings, CustomThemeColors, DEFAULT_CUSTOM_COLORS } from '../../../types/resume';


// 主题色映射：根据 colorTheme 返回编辑器面板的 accent 样式（className + style 双路径）
export interface AccentResult {
  className: {
    activeBorder: string;
    activeRing: string;
    activeShadow: string;
    badgeBg: string;
    badgeText: string;
    accentBar: string;
    accentBarShadow: string;
    activeTitle: string;
  };
  style: {
    activeBorder?: React.CSSProperties;
    badgeBg?: React.CSSProperties;
    badgeText?: React.CSSProperties;
    accentBar?: React.CSSProperties;
    activeTitle?: React.CSSProperties;
  };
}

export function getAccentClasses(colorTheme: ThemeSettings['colorTheme'], customColors?: CustomThemeColors): AccentResult {
  const presetMap: Record<string, AccentResult['className']> = {
    blue: {
      activeBorder: 'border-blue-400/60',
      activeRing: 'ring-blue-400/30',
      activeShadow: 'shadow-blue-500/10',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-600',
      accentBar: 'bg-blue-500',
      accentBarShadow: 'shadow-blue-400/40',
      activeTitle: 'text-blue-600',
    },
    gray: {
      activeBorder: 'border-gray-400/60',
      activeRing: 'ring-gray-400/30',
      activeShadow: 'shadow-gray-500/10',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-600',
      accentBar: 'bg-gray-500',
      accentBarShadow: 'shadow-gray-400/40',
      activeTitle: 'text-gray-600',
    },
    black: {
      activeBorder: 'border-gray-500/60',
      activeRing: 'ring-gray-500/30',
      activeShadow: 'shadow-gray-600/10',
      badgeBg: 'bg-gray-200',
      badgeText: 'text-gray-700',
      accentBar: 'bg-gray-700',
      accentBarShadow: 'shadow-gray-600/40',
      activeTitle: 'text-gray-700',
    },
  };

  if (colorTheme === 'custom') {
    const cc = customColors || DEFAULT_CUSTOM_COLORS;
    return {
      className: {
        activeBorder: '',
        activeRing: '',
        activeShadow: '',
        badgeBg: '',
        badgeText: '',
        accentBar: '',
        accentBarShadow: '',
        activeTitle: '',
      },
      style: {
        activeBorder: { borderColor: cc.border + '99' },
        badgeBg: { backgroundColor: cc.tagBg },
        badgeText: { color: cc.tagText },
        accentBar: { backgroundColor: cc.border },
        activeTitle: { color: cc.border },
      },
    };
  }

  const className = presetMap[colorTheme] || presetMap.blue;
  return { className, style: {} };
}
