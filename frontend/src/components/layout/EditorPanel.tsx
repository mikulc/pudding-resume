import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, PanelLeft, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PersonalInfoEditor, EducationEditor, SkillsEditor, WorkExperienceEditor, ProjectEditor, HonorEditor, CertificationEditor, PortfolioEditor, SummaryEditor } from '../editor/EditorComponents';
import { CustomModuleEditor } from '../editor/CustomModuleEditor';
import { FloatingContentEditor } from '../editor/FloatingContentEditor';
import { useResume, useAppUI } from '../../context/ResumeContext';
import { SectionKey, ThemeSettings, CustomThemeColors, DEFAULT_CUSTOM_COLORS, DEFAULT_SECTION_ORDER, getSystemModuleDefaultTitles } from '../../types/resume';
import { useToast } from '../common/Toast';
import { Tooltip } from '../common/Tooltip';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';

// 主题色映射：根据 colorTheme 返回编辑器面板的 accent 样式（className + style 双路径）
interface AccentResult {
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

function getAccentClasses(colorTheme: ThemeSettings['colorTheme'], customColors?: CustomThemeColors): AccentResult {
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

// 模块编辑器映射表（key → Editor）
const EDITOR_MAP: Record<SectionKey, { Editor: React.ComponentType }> = {
  personal: { Editor: PersonalInfoEditor },
  summary: { Editor: SummaryEditor },
  education: { Editor: EducationEditor },
  skills: { Editor: SkillsEditor },
  work: { Editor: WorkExperienceEditor },
  projects: { Editor: ProjectEditor },
  honors: { Editor: HonorEditor },
  certifications: { Editor: CertificationEditor },
  portfolio: { Editor: PortfolioEditor },
};

const LAST_EXPANDED_SECTION_STORAGE_KEY = 'resume_editor_last_expanded_section';

// ── 模块更多操作下拉菜单（复用 field-more-menu 样式体系）──
interface SectionMoreMenuProps {
  sectionKey: SectionKey;
  isHidden: boolean;
  isCustom: boolean;
  isPersonal: boolean;
  onEdit: () => void;
  onToggleHidden: (key: SectionKey) => void;
  onDelete?: () => void;
  hasCustomTitle?: boolean;
  onResetTitle?: () => void;
  /** 菜单打开/关闭状态回调，用于保持模块 hover 视觉 */
  onOpenChange?: (open: boolean) => void;
}

function SectionMoreMenu({
  sectionKey,
  isHidden,
  isCustom,
  isPersonal,
  onEdit,
  onToggleHidden,
  onDelete,
  hasCustomTitle = false,
  onResetTitle,
  onOpenChange,
}: SectionMoreMenuProps) {
  const { t } = useTranslation('editor');
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Sync open state to parent, avoiding setState-in-render on another component
  useEffect(() => {
    onOpenChange?.(open);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useDismissibleLayer({ open, refs: [menuRef, btnRef], onDismiss: close });

  // 滚动时关闭菜单（向上查找最近的 overflow 容器监听滚动）
  useEffect(() => {
    if (!open) return;
    const container = btnRef.current?.closest('.overflow-y-auto') as HTMLElement | null;
    if (!container) return;
    const handleScroll = () => close();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [open, close]);

  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const updateMenuPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const renameItem = isPersonal ? 0 : 1;
    const resetItem = hasCustomTitle ? 1 : 0;
    const dividerCount = (hasCustomTitle ? 1 : 0) + (isCustom && onDelete ? 1 : 0);
    const itemCount = renameItem + resetItem + 1 + (isCustom && onDelete ? 1 : 0);
    const estimatedDividerHeight = dividerCount * 5;
    const estimatedHeight = itemCount * 36 + estimatedDividerHeight + 8;
    const belowTop = rect.bottom + gap;
    const top =
      belowTop + estimatedHeight <= window.innerHeight - viewportPadding
        ? belowTop
        : Math.max(viewportPadding, rect.top - gap - estimatedHeight);
    setPos({ top, right: window.innerWidth - rect.right });
  }, [isPersonal, hasCustomTitle, isCustom, onDelete]);

  useLayoutEffect(() => {
    if (open) updateMenuPosition();
  }, [open, updateMenuPosition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((current) => {
            const next = !current;
            if (next) updateMenuPosition();
            return next;
          });
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="field-more-menu-enter"
        >
          <div className="overflow-hidden rounded-[14px] border border-slate-200/70 bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl w-[148px] dark:bg-slate-950 dark:border-slate-800">
            {/* 重命名标签 */}
            {!isPersonal && (
              <button
                type="button"
                onClick={() => { onEdit(); close(); }}
                className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <Pencil className="field-more-menu-icon text-current" />
                <span className="field-more-menu-label">{t('sectionMenu.renameLabel')}</span>
              </button>
            )}
            {/* 恢复默认名称 — 仅非个人信息、非自定义的内置模块且有自定义标题时显示 */}
            {hasCustomTitle && onResetTitle && (
              <>
                <div className="border-t border-gray-100 my-0.5" />
                <button
                  type="button"
                  onClick={() => { onResetTitle(); close(); }}
                  className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
                >
                  <RotateCcw className="field-more-menu-icon text-current" />
                  <span className="field-more-menu-label">{t('fieldMenu.resetLabel')}</span>
                </button>
              </>
            )}
            {/* 隐藏 / 显示模块 */}
            <button
              type="button"
              onClick={() => { onToggleHidden(sectionKey); close(); }}
              className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
            >
              {isHidden ? (
                <Eye className="field-more-menu-icon text-current" />
              ) : (
                <EyeOff className="field-more-menu-icon text-current" />
              )}
              <span className="field-more-menu-label">{isHidden ? t('sectionMenu.showModule') : t('sectionMenu.hideModule')}</span>
            </button>
            {/* 删除模块（仅自定义模块） */}
            {isCustom && onDelete && (
              <>
                <div className="border-t border-gray-100 my-0.5" />
                <button
                  type="button"
                  onClick={() => { onDelete(); close(); }}
                  className="field-more-menu-item text-red-500 hover:bg-red-50 rounded-[10px] dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="field-more-menu-icon" />
                  <span className="field-more-menu-label">{t('deleteModule')}</span>
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function getStoredExpandedSection(): SectionKey {
  if (typeof window === 'undefined') return 'personal';
  const stored = window.localStorage.getItem(LAST_EXPANDED_SECTION_STORAGE_KEY);
  return DEFAULT_SECTION_ORDER.includes(stored as SectionKey) ? (stored as SectionKey) : 'personal';
}

interface SortableSectionProps {
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

function SortableSection({ sectionKey, title, children, isExpanded, onToggle, onBlockedDrag, isHidden, isCustom = false, isPersonal = false, isEditingTitle, editingTitleValue, onEditingTitleChange, onConfirmEditTitle, onCancelEditTitle, onEditTitle, onRenameConfirm, onToggleHidden, onDeleteSection, hasCustomTitle, onResetTitle }: SortableSectionProps) {
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
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm placeholder:text-gray-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-blue-400/30 focus:border-blue-400/60 transition-shadow"
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
                className="px-3 py-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
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

interface EditorPanelProps {
  isMobile?: boolean;
}

export function EditorPanel({ isMobile = false }: EditorPanelProps) {
  const { data, dispatch } = useResume();
  const { uiDispatch } = useAppUI();
  const { showToast } = useToast();
  const { t } = useTranslation('editor');
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(() => getStoredExpandedSection());
  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 点击即拖拽（无需长按）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
  );

  const sectionOrder = data.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const customSections = useMemo(() => data.customSections ?? [], [data.customSections]);
  const sectionTitles = useMemo(() => data.sectionTitles ?? {}, [data.sectionTitles]);
  const hiddenSections = data.hiddenSections ?? [];
  const defaultModuleTitles = getSystemModuleDefaultTitles();

  // 新增自定义模块后自动滚动到底部
  const prevCustomCountRef = useRef(0);
  const customCount = customSections.length;
  useEffect(() => {
    if (customCount > prevCustomCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevCustomCountRef.current = customCount;
  }, [customCount]);

  // 按 sectionOrder 动态生成模块列表（内置 + 自定义）
  const sectionList = useMemo(() => {
    return sectionOrder
      .filter((key) => EDITOR_MAP[key] || customSections.some((cs) => cs.id === key))
      .map((key) => {
        const builtin = EDITOR_MAP[key];
        if (builtin) return { key, title: sectionTitles[key] ?? defaultModuleTitles[key] ?? key, Editor: builtin.Editor, isCustom: false as const };
        const cs = customSections.find((c) => c.id === key);
        return { key, title: cs?.name ?? t('customModule.defaultName'), Editor: CustomModuleEditor as React.ComponentType<any>, isCustom: true as const };
      });
  }, [sectionOrder, customSections, sectionTitles, defaultModuleTitles, t]);

  const handleToggleSection = useCallback((sectionKey: SectionKey) => {
    window.localStorage.setItem(LAST_EXPANDED_SECTION_STORAGE_KEY, sectionKey);
    setExpandedSection((prev) => {
      return prev === sectionKey ? null : sectionKey;
    });
  }, []);

  const handleBlockedDrag = useCallback(() => {
    showToast(t('sectionSort.collapseBeforeDrag'));
  }, [showToast, t]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sectionOrder.indexOf(active.id as SectionKey);
      const newIndex = sectionOrder.indexOf(over.id as SectionKey);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      dispatch({ type: 'REORDER_SECTIONS', payload: newOrder });
    },
    [sectionOrder, dispatch],
  );

  return (
    <div className="theme-transition-target h-full min-h-0 flex flex-col">
      {/* 单一共享浮动编辑器实例，通过 FloatingEditorContext 驱动内容与位置 */}
      <FloatingContentEditor />

      {/* Panel Header */}
      {!isMobile && (
        <div
          className="theme-transition-target editor-sub-header justify-between px-4"
          data-editor-sub-header="left"
        >
          <div className="flex items-center gap-2">
            <PanelLeft className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="text-gray-800 font-semibold text-sm">{t('panel.title')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => uiDispatch({ type: 'SET_EDITOR_OPEN', payload: false })}
              className="theme-color-transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Section List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sectionOrder}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={scrollContainerRef}
            className={[
              'flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3.5 scroll-smooth hide-scrollbar',
              isMobile ? 'mobile-scroll-dock-space' : '',
            ].join(' ')}
          >
            {sectionList.map(({ key, title, Editor, isCustom }) => {
              return (
                <SortableSection
                  key={key}
                  sectionKey={key}
                  title={title}
                  isExpanded={expandedSection === key}
                  onToggle={() => handleToggleSection(key)}
                  onBlockedDrag={handleBlockedDrag}
                  isHidden={hiddenSections.includes(key)}
                  isCustom={isCustom}
                  isPersonal={key === 'personal'}
                  isEditingTitle={editingTitleKey === key}
                  editingTitleValue={editingTitleKey === key ? editingTitleValue : undefined}
                  onEditingTitleChange={setEditingTitleValue}
                  onEditTitle={() => {
                    setEditingTitleKey(key);
                    setEditingTitleValue(isCustom
                      ? (customSections.find((c) => c.id === key)?.name ?? '')
                      : (sectionTitles[key] ?? title));
                  }}
                  onRenameConfirm={(_key, newTitle) => {
                    if (isCustom) {
                      dispatch({
                        type: 'UPDATE_CUSTOM_SECTION',
                        payload: { id: _key, updates: { name: newTitle } },
                      });
                    } else {
                      dispatch({
                        type: 'UPDATE_SECTION_TITLE',
                        payload: { key: _key, title: newTitle },
                      });
                    }
                    setEditingTitleKey(null);
                  }}
                  onToggleHidden={(sectionKey) => {
                    dispatch({ type: 'TOGGLE_SECTION_VISIBILITY', payload: sectionKey });
                  }}
                  onDeleteSection={
                    isCustom
                      ? () => {
                          dispatch({ type: 'DELETE_CUSTOM_SECTION', payload: key });
                          if (expandedSection === key) setExpandedSection(null);
                        }
                      : undefined
                  }
                  hasCustomTitle={!isCustom && key !== 'personal' && key in sectionTitles}
                  onResetTitle={
                    !isCustom && key !== 'personal'
                      ? () => dispatch({ type: 'RESET_SECTION_TITLE', payload: key })
                      : undefined
                  }
                  onConfirmEditTitle={() => {
                    if (editingTitleKey === key) {
                      const newTitle = editingTitleValue || title;
                      if (isCustom) {
                        dispatch({
                          type: 'UPDATE_CUSTOM_SECTION',
                          payload: { id: key, updates: { name: newTitle } },
                        });
                      } else {
                        dispatch({
                          type: 'UPDATE_SECTION_TITLE',
                          payload: { key, title: newTitle },
                        });
                      }
                      setEditingTitleKey(null);
                    }
                  }}
                  onCancelEditTitle={() => {
                    setEditingTitleKey(null);
                    setEditingTitleValue('');
                  }}
                >
                  {isCustom ? <Editor sectionKey={key} /> : <Editor />}
                </SortableSection>
              );
            })}
            {/* 添加自定义模块按钮 */}
            <button
              onClick={() => {
                const id = `custom-${Date.now()}`;
                dispatch({ type: 'ADD_CUSTOM_SECTION', payload: { id, name: t('customModule.defaultName') } });
                uiDispatch({ type: 'SET_ACTIVE_SECTION', payload: id });
                setExpandedSection(id);
                window.localStorage.setItem(LAST_EXPANDED_SECTION_STORAGE_KEY, id);
              }}
              className="theme-color-transition w-full flex items-center justify-center gap-2 rounded-[22px] border border-dashed border-blue-300 bg-transparent text-blue-400 hover:bg-blue-50/40 hover:border-blue-400 hover:text-blue-500 px-4 py-3.5 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('customModule.add')}
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
