import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';
import { Eye, EyeOff, Trash2, RotateCcw, ArrowLeftRight } from 'lucide-react';

// ── 更多操作下拉菜单（⋯）──
export function MoreMenu({
  field,
  isHidden,
  isCustomField,
  hasCustomLabel,
  onRename,
  onResetLabel,
  onChangeIcon,
  onToggleHidden,
  onDelete,
}: {
  field: string;
  isHidden: boolean;
  isCustomField: boolean;
  hasCustomLabel?: boolean;
  onRename?: () => void;
  onResetLabel?: () => void;
  onChangeIcon?: () => void;
  onToggleHidden: (field: string) => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation(['editor', 'common']);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismissibleLayer({
    open,
    refs: [menuRef, btnRef],
    onDismiss: () => setOpen(false),
  });

  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const updateMenuPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const itemCount =
      (onRename ? 1 : 0) +
      (!isCustomField && onResetLabel && hasCustomLabel ? 1 : 0) +
      (onChangeIcon ? 1 : 0) +
      1 +
      (isCustomField && onDelete ? 1 : 0);
    const estimatedDividerHeight = isCustomField && onDelete ? 5 : 0;
    const estimatedHeight = itemCount * 36 + estimatedDividerHeight + 8;
    const belowTop = rect.bottom + gap;
    const top =
      belowTop + estimatedHeight <= window.innerHeight - viewportPadding
        ? belowTop
        : Math.max(viewportPadding, rect.top - gap - estimatedHeight);

    setPos({ top, right: window.innerWidth - rect.right });
  }, [isCustomField, onChangeIcon, onDelete, onRename, onResetLabel, hasCustomLabel]);

  useLayoutEffect(() => {
    if (open) {
      updateMenuPosition();
    }
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
            if (!current) updateMenuPosition();
            return !current;
          });
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-70 hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-[9999] field-more-menu-enter"
        >
          <div className="overflow-hidden rounded-[14px] border border-slate-200/70 bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl w-[148px] dark:bg-slate-950 dark:border-slate-800">
            {onRename && (
              <button
                type="button"
                onClick={() => { onRename(); setOpen(false); }}
                className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <svg className="field-more-menu-icon text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="field-more-menu-label">{t(isCustomField ? 'fieldMenu.renameCustomField' : 'fieldMenu.renameLabel')}</span>
              </button>
            )}
            {!isCustomField && onResetLabel && hasCustomLabel && (
              <button
                type="button"
                onClick={() => {
                  onResetLabel();
                  setOpen(false);
                }}
                className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <RotateCcw className="field-more-menu-icon text-current" />
                <span className="field-more-menu-label">{t('fieldMenu.resetLabel')}</span>
              </button>
            )}
            {onChangeIcon && (
              <button
                type="button"
                onClick={() => { onChangeIcon(); setOpen(false); }}
                className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
              >
                <ArrowLeftRight className="field-more-menu-icon text-current" />
                <span className="field-more-menu-label">{t('fieldMenu.changeIcon')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { onToggleHidden(field); setOpen(false); }}
              className="field-more-menu-item text-gray-700 hover:bg-[rgba(34,72,255,0.06)] hover:text-gray-900 rounded-[10px] dark:hover:bg-[rgba(34,72,255,0.14)]"
            >
              {isHidden ? (
                <Eye className="field-more-menu-icon text-current" />
              ) : (
                <EyeOff className="field-more-menu-icon text-current" />
              )}
              <span className="field-more-menu-label">{t(isHidden ? 'fieldMenu.showField' : 'fieldMenu.hideField')}</span>
            </button>
            {isCustomField && onDelete && (
              <>
                <div className="border-t border-gray-100 my-0.5" />
                <button
                  type="button"
                  onClick={() => { onDelete(); setOpen(false); }}
                  className="field-more-menu-item text-red-500 hover:bg-red-50 rounded-[10px] dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="field-more-menu-icon" />
                  <span className="field-more-menu-label">{t('fieldMenu.deleteField')}</span>
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
