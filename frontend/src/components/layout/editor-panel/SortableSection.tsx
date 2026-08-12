import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { EyeOff } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppUI } from '../../../context/ResumeContext';
import { SectionKey } from '../../../types/resume';
import { Tooltip } from '../../common/Tooltip';
import { useDismissibleLayer } from '../../../hooks/useDismissibleLayer';

import { getAccentClasses } from './accent';
import { SectionMoreMenu } from './SectionMoreMenu';

export interface SortableSectionProps {
  sectionKey: SectionKey;
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  onBlockedDrag: () => void;
  /** 该模块是否处于预览隐藏状态 */
  isHidden?: boolean;
  /** 是否自定义模块 */
  isCustom?: boolean;
  /** 是否为个人信息模块 */
  isPersonal?: boolean;
  /** 是否处于编辑标题模式 */
  isEditingTitle?: boolean;
  /** 编辑中的标题值 */
  editingTitleValue?: string;
  /** 标题编辑变更回调 */
  onEditingTitleChange?: (value: string) => void;
  /** 确认编辑标题 */
  onConfirmEditTitle?: () => void;
  /** 取消编辑标题 */
  onCancelEditTitle?: () => void;
  /** 编辑标题入口（设置 editingTitleKey） */
  onEditTitle?: () => void;
  /** 重命名确认（直接传值，避免闭包捕获旧 editingTitleValue） */
  onRenameConfirm?: (key: SectionKey, newTitle: string) => void;
  /** 切换模块预览可见性 */
  onToggleHidden?: (key: SectionKey) => void;
  /** 删除模块（仅自定义模块） */
  onDeleteSection?: () => void;
  /** 是否已有自定义标题（决定是否显示"恢复默认名称"） */
  hasCustomTitle?: boolean;
  /** 恢复模块默认名称 */
  onResetTitle?: () => void;
}

export function SortableSection({ sectionKey, title, children, isExpanded, onToggle, onBlockedDrag, isHidden, isCustom = false, isPersonal = false, isEditingTitle, editingTitleValue, onEditingTitleChange, onConfirmEditTitle, onCancelEditTitle, onEditTitle, onRenameConfirm, onToggleHidden, onDeleteSection, hasCustomTitle, onResetTitle }: SortableSectionProps) {
  const { t } = useTranslation('editor');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey, disabled: isExpanded });

  const { ui, uiDispatch } = useAppUI();
  const isActive = ui.activeSection === sectionKey;
  const ref = useRef<HTMLDivElement>(null);
  // 编辑面板始终使用固定的蓝色主题，不随简历主题变化
  const accent = getAccentClasses('blue');

  // 更多菜单打开时保持模块 hover/active 视觉
  const [menuOpen, setMenuOpen] = useState(false);

  // ── 重命名浮层面板（复用 field-more-menu 样式体系）──
  const [renamePanelOpen, setRenamePanelOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const titleAnchorRef = useRef<HTMLHeadingElement>(null);
  const renamePanelRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // 重命名面板打开时自动聚焦输入框
  useEffect(() => {
    if (renamePanelOpen) renameInputRef.current?.focus();
  }, [renamePanelOpen]);

  // 关闭重命名面板（同时清除编辑状态）
  const closeRenamePanel = useCallback(() => {
    setRenamePanelOpen(false);
    onCancelEditTitle?.();
  }, [onCancelEditTitle]);

  // 重命名面板外部点击关闭 + ESC 关闭
  useDismissibleLayer({
    open: renamePanelOpen,
    refs: [ref, renamePanelRef],
    onDismiss: closeRenamePanel,
  });

  // 重命名面板定位
  const [renamePos, setRenamePos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const updateRenamePanelPosition = useCallback(() => {
    const anchor = titleAnchorRef.current || ref.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const estimatedWidth = 224;
    const estimatedHeight = 150;
    const viewportPadding = 8;
    const belowTop = rect.bottom + gap;
    const top =
      belowTop + estimatedHeight <= window.innerHeight - viewportPadding
        ? belowTop
        : Math.max(viewportPadding, rect.top - gap - estimatedHeight);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - estimatedWidth - viewportPadding),
    );
    setRenamePos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (renamePanelOpen) updateRenamePanelPosition();
  }, [renamePanelOpen, updateRenamePanelPosition]);

  const openRenamePanel = useCallback(() => {
    if (!onEditTitle) return;
    onEditTitle(); // 设置 editingTitleKey，确保 confirmRename 可通过 onConfirmEditTitle 提交
    setRenameValue(title);
    setRenameError('');
    updateRenamePanelPosition();
    setRenamePanelOpen(true);
  }, [title, onEditTitle, updateRenamePanelPosition]);

  const confirmRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError(t('sectionRename.required'));
      return;
    }
    if (trimmed.length > 12) {
      setRenameError(t('sectionRename.maxLength'));
      return;
    }
    setRenamePanelOpen(false);
    // 直接传值 dispatch，避免闭包捕获旧的 editingTitleValue
    onRenameConfirm?.(sectionKey, trimmed);
  }, [renameValue, sectionKey, onRenameConfirm, t]);

  // 展开状态禁用排序，避免 dnd-kit 在展开尺寸下计算拖拽位置
  // 标记：本次活跃变化是否需要等待展开动画（预览区点击、模块原本收起时触发）
  const expandPendingRef = useRef(false);

  // 预览区点击联动 → 自动展开对应模块
  useEffect(() => {
    if (isActive && !isExpanded) {
      expandPendingRef.current = true;
      onToggle();
    }
    // 仅在 isActive 变化时触发，避免点击头部收起时再次展开
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // 模块成为活跃且已展开时 → 滚动到容器顶部
  useEffect(() => {
    if (!isActive || !isExpanded) return;

    const element = ref.current;
    if (!element) return;

    const scrollToTop = () => {
      const el = ref.current;
      if (!el) return;
      const container = el.closest('.overflow-y-auto') as HTMLElement | null;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const elementRect = el.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + elementRect.top - containerRect.top - 12;
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    };

    if (expandPendingRef.current) {
      // 刚从收起展开：等待 CSS Grid 动画完成（280ms + 余量）再测量位置
      expandPendingRef.current = false;
      const timer = setTimeout(() => {
        requestAnimationFrame(scrollToTop);
      }, 320);
      return () => clearTimeout(timer);
    }

    // 模块本来已展开（从预览区点击其他模块再切回）→ 下一帧即可测量
    requestAnimationFrame(scrollToTop);
  }, [isActive, isExpanded]);

  const handleClick = () => {
    // 如果当前模块是折叠状态，点击后将展开，需要标记等待展开动画完成再滚动
    if (!isExpanded) {
      expandPendingRef.current = true;
    }
    onToggle();
    uiDispatch({ type: 'SET_ACTIVE_SECTION', payload: sectionKey });
  };

  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={dndStyle}
      className={`${isDragging ? '' : 'theme-color-transition'} editor-section-card flex-shrink-0 ${isExpanded ? 'bg-[color:var(--bg-panel)] dark:bg-[color:var(--bg-panel)]' : 'bg-white dark:bg-[color:var(--bg-card)]'} rounded-[22px] border overflow-hidden group ${
        isActive
          ? 'editor-section-card-active border-blue-400 dark:border-blue-400'
          : 'border-gray-200 dark:border-[#21262d] hover:border-gray-300 dark:hover:border-[#30363d]'
      } ${
        isDragging ? 'shadow-2xl ring-2 ring-blue-300/50 z-50' : ''
      }`}
    >
      {/* 头部区域：整个区域可点击展开/折叠（编辑标题时禁用） */}
      <div
        className={`w-full flex items-center p-3.5 transition-colors ${
          isEditingTitle || menuOpen || renamePanelOpen
            ? ''
            : isActive
              ? 'editor-section-header-active bg-blue-50/50 cursor-pointer'
              : 'hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer'
        }`}
        onClick={isEditingTitle || menuOpen || renamePanelOpen ? undefined : handleClick}
      >
        {/* 拖拽手柄（捕获阶段提前折叠，避免 dnd-kit 以展开尺寸计算拖拽位置） */}
        <span
          {...attributes}
          {...listeners}
          onPointerDownCapture={(e) => {
            if (isExpanded) {
              e.preventDefault();
              e.stopPropagation();
              onBlockedDrag();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: isExpanded ? 'auto' : 'none' }}
          className={`flex-shrink-0 text-gray-400 dark:text-[#656c76] hover:text-gray-600 dark:hover:text-[#9198a1] transition-colors p-0.5 rounded mr-2 ${
            isExpanded ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 22a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
        </span>
        {/* 标题和箭头区域 */}
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`editor-section-accent-bar theme-color-transition w-1 h-5 rounded-full flex-shrink-0 ${
              isActive ? accent.className.accentBar : 'bg-gray-300 dark:bg-[#30363d]'
            } ${isActive ? 'editor-section-accent-bar-active' : ''}`} style={isActive ? accent.style.accentBar : undefined} />
            {isEditingTitle && !renamePanelOpen ? (
              <input
                id="inline-section-title-editor"
                className="font-semibold text-sm text-gray-700 bg-transparent border-none rounded px-0 py-0 outline-none focus:outline-none focus:ring-0 min-w-0"
                value={editingTitleValue ?? ''}
                onChange={(e) => {
                  e.stopPropagation();
                  onEditingTitleChange?.(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onConfirmEditTitle?.();
                  }
                }}
                onBlur={() => onConfirmEditTitle?.()}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <h3 ref={titleAnchorRef} className="font-semibold text-sm truncate text-gray-700 dark:text-[#f0f6fc]">
                {title}
              </h3>
            )}
            {isHidden && (
              <span
                className="inline-flex flex-shrink-0 items-center text-gray-400 dark:text-[#656c76]"
                aria-label={t('sectionMenu.hideModule')}
              >
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              </span>
            )}

          </div>
          <div className="flex items-center gap-1 ml-2">
            {/* 编辑标题模式：重命名浮层打开时不显示内联按钮 */}
            {isEditingTitle && !renamePanelOpen ? (
              <div className="flex items-center gap-0.5 mr-1">
                <Tooltip content={t('sectionRename.saveName')}>
                <button
                  className="p-1 rounded text-green-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); onConfirmEditTitle?.(); }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                </Tooltip>
                <Tooltip content={t('sectionRename.cancelEdit')}>
                <button
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); onCancelEditTitle?.(); }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </Tooltip>
              </div>
            ) : (
              /* 更多按钮：hover 时柔和出现（opacity + transform），选中/菜单打开/隐藏状态时常显 */
              onToggleHidden && onEditTitle && (
                <div className={`flex items-center mr-1 transition-all duration-200 ${
                  isHidden || isActive || menuOpen
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'
                }`}>
                  <SectionMoreMenu
                    sectionKey={sectionKey}
                    isHidden={!!isHidden}
                    isCustom={isCustom}
                    isPersonal={isPersonal}
                    onEdit={openRenamePanel}
                    onToggleHidden={onToggleHidden}
                    onDelete={onDeleteSection}
                    hasCustomTitle={hasCustomTitle}
                    onResetTitle={onResetTitle}
                    onOpenChange={setMenuOpen}
                  />
                </div>
              )
            )}
            {!isEditingTitle && (
              <svg
                className={`w-4 h-4 text-gray-400 dark:text-[#656c76] flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </div>
      {/* 展开/收起动画（CSS Grid 0fr/1fr 实现高度过渡） */}
      <div
        className={`overflow-hidden ${
          isDragging
            ? ''
            : 'editor-panel-expand-transition'
        }`}
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          opacity: isExpanded ? 1 : 0,
          transitionTimingFunction: isDragging ? undefined : 'cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: isDragging ? undefined : 'grid-template-rows, opacity',
        }}
      >
        <div className="min-h-0">
          <div className="px-4 pt-4 pb-6 space-y-3">
            {children}
          </div>
        </div>
      </div>

      {/* 重命名浮层面板 */}
      {renamePanelOpen && createPortal(
        <div
          ref={renamePanelRef}
          style={{ position: 'fixed', top: renamePos.top, left: renamePos.left, width: 224, zIndex: 9999 }}
          className="field-more-menu-enter"
        >
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
            <label htmlFor="section-rename-input" className="block text-xs text-gray-500 mb-2.5 font-medium">{t('sectionRename.title')}</label>
            <input
              id="section-rename-input"
              ref={renameInputRef}
              type="text"
              value={renameValue}
              maxLength={12}
              onChange={(e) => {
                setRenameValue(e.target.value);
                if (renameError) setRenameError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') closeRenamePanel();
              }}
              className="field-input"
              placeholder={t('sectionRename.placeholder')}
            />
            {renameError && (
              <p className="mt-2 text-xs text-red-500">{renameError}</p>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={closeRenamePanel}
                className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common:button.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmRename}
                className="rounded-lg bg-[var(--theme-accent)] px-3 py-1.5 text-xs text-[var(--theme-accent-foreground)] transition-[filter] hover:brightness-95"
              >
                {t('common:button.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
