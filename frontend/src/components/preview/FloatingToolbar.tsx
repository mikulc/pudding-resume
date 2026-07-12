import React from 'react';
import { useTranslation } from 'react-i18next';
import { SelectionState } from '../../hooks/useTextSelection';
import { Tooltip } from '../common/Tooltip';

interface FloatingToolbarProps {
  selection: SelectionState;
  containerRef: React.RefObject<HTMLElement | null>;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleOrderedList: () => void;
  onToggleUnorderedList: () => void;
  onClearFormat: () => void;
  onClose: () => void;
}

export function FloatingToolbar({
  selection,
  containerRef,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleOrderedList,
  onToggleUnorderedList,
  onClearFormat,
  onClose,
}: FloatingToolbarProps) {
  const { t } = useTranslation('editor');
  if (!selection.rect || !containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();
  const { rect } = selection;
  const scrollTop = containerRef.current.scrollTop;
  const scrollLeft = containerRef.current.scrollLeft;

  // 计算工具栏位置：选中文字上方居中
  const toolbarWidth = 264; // B I U OL UL 橡皮擦 关闭 (7×32 + 6×4 + 2×8)
  const toolbarHeight = 42;
  const gap = 8; // 与选中区域的间距

  // 相对于容器内容区域的位置（考虑滚动偏移）
  let top = rect.top - containerRect.top + scrollTop - toolbarHeight - gap;
  let left =
    rect.left - containerRect.left + scrollLeft + rect.width / 2 - toolbarWidth / 2;

  // 边界防护：顶部溢出
  if (top < scrollTop) {
    // 显示在选中区域下方
    top = rect.top - containerRect.top + scrollTop + rect.height + gap;
  }

  // 边界防护：左右溢出
  const maxLeft = containerRect.width - toolbarWidth - 4;
  if (left < 4) {
    left = 4;
  } else if (left > maxLeft) {
    left = maxLeft;
  }

  return (
    <div
      data-toolbar="true"
      className="floating-toolbar"
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1000,
      }}
    >
      <Tooltip enabled content={t('formatting.bold')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleBold();
        }}
        className="floating-toolbar-btn"
      >
        <span className="font-bold text-base">B</span>
      </button>
      </Tooltip>
      <Tooltip enabled content={t('formatting.italic')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleItalic();
        }}
        className="floating-toolbar-btn"
      >
        <span className="italic text-base">I</span>
      </button>
      </Tooltip>
      <Tooltip enabled content={t('formatting.underline')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleUnderline();
        }}
        className="floating-toolbar-btn"
      >
        <span className="underline text-base">U</span>
      </button>
      </Tooltip>
      <Tooltip enabled content={t('formatting.orderedList')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleOrderedList();
        }}
        className="floating-toolbar-btn"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <text x="2" y="7" fontSize="6" fill="currentColor" stroke="none">1</text>
          <text x="2" y="13" fontSize="6" fill="currentColor" stroke="none">2</text>
          <text x="2" y="19" fontSize="6" fill="currentColor" stroke="none">3</text>
        </svg>
      </button>
      </Tooltip>
      <Tooltip enabled content={t('formatting.unorderedList')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleUnorderedList();
        }}
        className="floating-toolbar-btn"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      </Tooltip>
      <Tooltip enabled content={t('formatting.clear')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClearFormat();
        }}
        className="floating-toolbar-btn"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
          <path d="M22 21H7" />
          <path d="m5 11 9 9" />
        </svg>
      </button>
      </Tooltip>
      <Tooltip enabled content={t('common:button.close')}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        className="floating-toolbar-btn"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      </Tooltip>
    </div>
  );
}
