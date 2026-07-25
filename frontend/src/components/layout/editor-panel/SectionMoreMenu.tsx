import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { SectionKey } from '../../../types/resume';
import { useDismissibleLayer } from '../../../hooks/useDismissibleLayer';

export interface SectionMoreMenuProps {
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

export function SectionMoreMenu({
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
