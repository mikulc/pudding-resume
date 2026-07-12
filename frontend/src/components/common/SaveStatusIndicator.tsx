import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SaveStatusType } from '../../types/resume';
import { triggerRetrySave } from './SaveSync';
import { Tooltip } from './Tooltip';

interface SaveStatusIndicatorProps {
  saveStatus: SaveStatusType;
  saveTrigger: number;
  lastSavedAt: number | null;
  onManualSave?: () => void;
  compact?: boolean;
}

// ================================================================
// 各状态配置：圆点类名 + 文字 + 文字颜色
// ================================================================
interface StatusConfig {
  dotClass: string;
  textKey: string;
  textColor: string;
}

const STATUS_MAP: Record<SaveStatusType, StatusConfig> = {
  saved: {
    dotClass: 'bg-green-500 breathing-dot-saved',
    textKey: 'saveStatus.saved',
    textColor: 'text-gray-500',
  },
  unsaved: {
    dotClass: 'bg-yellow-500',
    textKey: 'saveStatus.unsaved',
    textColor: 'text-yellow-600',
  },
  saving: {
    dotClass: 'bg-blue-500 breathing-dot-saving',
    textKey: 'saveStatus.saving',
    textColor: 'text-blue-500',
  },
  error: {
    dotClass: 'bg-red-500 breathing-dot-error',
    textKey: 'saveStatus.errorRetry',
    textColor: 'text-red-500',
  },
};

// ================================================================
// SaveStatusIndicator 组件
//
// 纯 CSS 驱动的多状态呼吸灯：
//   - saved  → 绿色持续呼吸（4s 自然节奏）
//   - saving  → 蓝色快速呼吸（1.2s 脉冲）
//   - error   → 红色急促呼吸（1s 警告）
//   - unsaved → 静态黄色圆点（无动画）
//
// 保存完成时叠加短暂"确认脉冲"（0.6s）增强反馈。
// ================================================================
export function SaveStatusIndicator({ saveStatus, saveTrigger, lastSavedAt, onManualSave, compact = false }: SaveStatusIndicatorProps) {
  const { t } = useTranslation('editor');
  const [showConfirm, setShowConfirm] = useState(false);
  const prevTriggerRef = useRef(saveTrigger);

  // 保存完成瞬间 → 触发确认脉冲（短暂叠加在持续呼吸之上）
  useEffect(() => {
    if (saveStatus === 'saved' && saveTrigger > 0 && saveTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = saveTrigger;
      setShowConfirm(true);
      const timer = setTimeout(() => setShowConfirm(false), 600);
      return () => clearTimeout(timer);
    }
    prevTriggerRef.current = saveTrigger;
  }, [saveTrigger, saveStatus]);

  const baseConfig = STATUS_MAP[saveStatus] ?? STATUS_MAP.saved;
  const config = compact && saveStatus === 'error'
    ? { ...baseConfig, textKey: 'saveStatus.error' }
    : baseConfig;
  const isError = saveStatus === 'error';
  const isSaving = saveStatus === 'saving';

  // 点击行为：saving 时不响应；error 时重试；其他状态手动保存
  const handleClick = useCallback(() => {
    if (isSaving) return;
    if (isError) {
      triggerRetrySave();
    } else {
      onManualSave?.();
    }
  }, [isSaving, isError, onManualSave]);

  // 非 saving 且非 error，且提供了手动保存回调时，显示 pointer 光标
  const isManualSaveable = !isSaving && !isError && !!onManualSave;

  // 组合圆点类名：基础呼吸动画 + 确认脉冲叠加
  const dotClass = [config.dotClass, showConfirm && 'breathing-dot-confirm']
    .filter(Boolean)
    .join(' ');

  // 格式化上次保存时间
  const lastSavedText = useMemo(() => {
    if (!lastSavedAt) return null;
    const date = new Date(lastSavedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return t('saveStatus.justSaved');
    if (diffSec < 60) return t('common:date.secondsAgo', { count: diffSec });
    if (diffMin < 60) return t('common:date.minutesAgo', { count: diffMin });
    if (diffHour < 24) return t('common:date.hoursAgo', { count: diffHour });
    // 超过 24 小时显示具体日期时间
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return t('common:date.monthDayTime', { month, day, time: `${hours}:${minutes}` });
  }, [lastSavedAt, t]);

  const titleText =
        isSaving ? t('saveStatus.savingWithDots')
        : isError ? t('saveStatus.retryTooltip')
        : isManualSaveable ? t('saveStatus.manualSaveTooltip')
        : t(config.textKey);

  return (
    <Tooltip content={titleText}>
    <button
      onClick={handleClick}
      disabled={isSaving}
      className={`relative flex items-center gap-1.5 rounded-md transition-colors ${compact ? 'px-1 py-0.5' : 'px-2 py-1'} ${
        isSaving
          ? 'cursor-default'
          : isError || isManualSaveable
          ? 'cursor-pointer'
          : 'cursor-default'
      }`}
    >
      {/* 呼吸灯圆点 — 纯 CSS 动画驱动，零 JS 开销 */}
      <span
        className={`inline-block rounded-full flex-shrink-0 ${compact ? 'h-2 w-2' : 'w-2.5 h-2.5'} ${dotClass}`}
      />
      {/* 状态文字 */}
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium whitespace-nowrap ${config.textColor}`}>
        {t(config.textKey)}
      </span>
      {/* 上次保存时间 — 绝对定位，避免撑大按钮挤占缩放控件 */}
      {lastSavedText && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-0.5 text-[10px] text-gray-400 whitespace-nowrap pointer-events-none hidden md:block">
          · {lastSavedText}
        </span>
      )}
    </button>
    </Tooltip>
  );
}
