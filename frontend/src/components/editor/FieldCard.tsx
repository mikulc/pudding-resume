import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip } from '../common/Tooltip';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';
import { getPersonalFieldLabels } from '../../types/resume';
import { Search } from 'lucide-react';
import { MoreMenu } from './MoreMenu';
import {
  FIELD_ICONS,
  DEFAULT_FIELD_ICON_KEYS,
  ICON_CATEGORIES,
  ICON_LIBRARY,
  type IconCategory,
} from './iconLibrary';
import { PINNED_PERSONAL_FIELD } from './photoStyle';

// ── 字段卡片（替换原 SortableFieldRow）──
export function FieldCard({
  field,
  displayLabel,
  value,
  onChange,
  onDelete,
  onRename,
  onResetLabel,
  hasCustomLabel,
  onChangeIcon,
  iconMap,
  hiddenFields,
  onToggleHidden,
  children,
  isCustomField,
  noCard,
}: {
  field: string;
  displayLabel?: string;
  value: string;
  onChange: (val: string) => void;
  onDelete?: () => void;
  onRename?: (oldName: string, newName: string) => string | void;
  onResetLabel?: () => void;
  hasCustomLabel?: boolean;
  onChangeIcon?: (field: string, iconKey: string) => void;
  iconMap?: Record<string, string>;
  hiddenFields: string[];
  onToggleHidden: (field: string) => void;
  children?: React.ReactNode;
  isCustomField?: boolean;
  noCard?: boolean;
}) {
  const { t } = useTranslation(['editor', 'common']);
  const fieldInputId = useId();
  const isHidden = hiddenFields.includes(field);
  const defaultFieldLabels = getPersonalFieldLabels();
  const label = displayLabel || (isCustomField ? field : (defaultFieldLabels[field] || field));

  // 重命名面板状态
  const [showRenamePanel, setShowRenamePanel] = useState(false);
  const [editNameVal, setEditNameVal] = useState(field);
  const [renameError, setRenameError] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const renamePanelRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLSpanElement>(null);

  // 图标选择面板状态
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [activeIconCategory, setActiveIconCategory] = useState<IconCategory>('all');
  const cardRef = useRef<HTMLDivElement>(null);
  const iconAnchorRef = useRef<HTMLSpanElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showRenamePanel) editInputRef.current?.focus();
  }, [showRenamePanel]);

  // 图标面板外部点击 / Esc 关闭
  useDismissibleLayer({
    open: showIconPicker,
    refs: [cardRef, pickerRef],
    onDismiss: () => setShowIconPicker(false),
  });

  // 重命名面板外部点击关闭
  useDismissibleLayer({
    open: showRenamePanel,
    refs: [cardRef, renamePanelRef],
    onDismiss: () => setShowRenamePanel(false),
  });

  const handleRenameConfirm = () => {
    const newName = editNameVal.trim();
    if (!newName) {
      setRenameError(t('fieldCard.rename.required'));
      return;
    }
    if (newName.length > 12) {
      setRenameError(t('fieldCard.rename.maxLength'));
      return;
    }
    if (onRename) {
      const error = onRename(field, newName);
      if (typeof error === 'string' && error) {
        setRenameError(error);
        return;
      }
    }
    setShowRenamePanel(false);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field, disabled: field === PINNED_PERSONAL_FIELD });

  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 图标面板定位：锚定当前字段图标，而不是整张字段卡片。
  const [iconPos, setIconPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const updateIconPickerPosition = useCallback(() => {
    const anchor = iconAnchorRef.current || cardRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const estimatedWidth = 324;
    const estimatedHeight = 430;
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

    setIconPos({ top, left });
  }, []);

  const openIconPicker = useCallback(() => {
    updateIconPickerPosition();
    setShowIconPicker(true);
  }, [updateIconPickerPosition]);

  useLayoutEffect(() => {
    if (showIconPicker) {
      updateIconPickerPosition();
    }
  }, [showIconPicker, updateIconPickerPosition]);

  // 重命名面板定位：锚定当前字段标题区域。
  const [renamePos, setRenamePos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const updateRenamePanelPosition = useCallback(() => {
    const anchor = titleAnchorRef.current || cardRef.current;
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

  const openRenamePanel = useCallback(() => {
    if (!onRename) return;
    setEditNameVal(label);
    setRenameError('');
    updateRenamePanelPosition();
    setShowRenamePanel(true);
  }, [label, onRename, updateRenamePanelPosition]);

  useLayoutEffect(() => {
    if (showRenamePanel) {
      updateRenamePanelPosition();
    }
  }, [showRenamePanel, updateRenamePanelPosition]);

  // 当前图标
  const customKey = iconMap?.[field];
  const selectedIconKey = customKey || DEFAULT_FIELD_ICON_KEYS[field] || DEFAULT_FIELD_ICON_KEYS._custom;
  const currentIcon = customKey
    ? (ICON_LIBRARY.find((i) => i.key === customKey)?.icon || FIELD_ICONS._custom)
    : (FIELD_ICONS[field] || FIELD_ICONS._custom);
  const normalizedIconSearch = iconSearch.trim().toLowerCase();
  const filteredIcons = useMemo(() => {
    return ICON_LIBRARY.filter((item) => {
      const matchesCategory = activeIconCategory === 'all' || item.category === activeIconCategory;
      if (!matchesCategory) return false;
      if (!normalizedIconSearch) return true;

      const iconLabel = t(`fieldIcon.icons.${item.key}`);
      const categoryLabel = t(`fieldIcon.categories.${item.category}`);
      const searchable = [item.key, iconLabel, categoryLabel, ...item.keywords].join(' ').toLowerCase();
      return searchable.includes(normalizedIconSearch);
    });
  }, [activeIconCategory, normalizedIconSearch, t]);

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={isDragging ? 'relative z-50 shadow-lg rounded-xl' : ''}
    >
      <div ref={cardRef} className={noCard ? 'py-2.5 px-3 field-card' : 'bg-white rounded-[22px] shadow-sm border border-gray-100 p-4 field-card'}>
        {/* 头部：拖拽手柄 + 图标 + 标签 + 更多菜单 */}
        <div className="flex min-w-0 items-center gap-2 mb-3">
          {field === PINNED_PERSONAL_FIELD ? (
          <Tooltip content={t('fieldCard.pinnedFieldTooltip')}>
          <span
            {...attributes}
            {...listeners}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-300 cursor-default hover:text-gray-300 hover:bg-transparent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" d="M4 8h16M4 12h16M4 16h16" />
            </svg>
          </span>
          </Tooltip>
          ) : (
          <span
            {...attributes}
            {...listeners}
            style={{ touchAction: 'none' }}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-50 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" d="M4 8h16M4 12h16M4 16h16" />
            </svg>
          </span>
          )}
          {/* 图标 */}
          <span
            ref={iconAnchorRef}
            onPointerDown={(e) => e.stopPropagation()}
            className="field-type-icon inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#98a2b3]"
            aria-label={t('fieldCard.iconAria', { label })}
          >
            {currentIcon}
          </span>
          {/* 标签 */}
          <span
            ref={titleAnchorRef}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 truncate text-left text-sm font-medium text-[#667085]"
          >
            {label}
          </span>
          {/* 更多菜单 */}
          <MoreMenu
            field={field}
            isHidden={isHidden}
            isCustomField={!!isCustomField}
            hasCustomLabel={hasCustomLabel}
            onRename={onRename ? openRenamePanel : undefined}
            onResetLabel={onResetLabel}
            onChangeIcon={onChangeIcon ? openIconPicker : undefined}
            onToggleHidden={onToggleHidden}
            onDelete={onDelete}
          />
        </div>
        {/* 输入区域 */}
        <div className="min-w-0 w-full" onPointerDown={(e) => e.stopPropagation()}>
          {children ? (
            children
          ) : (
            <input
              id={fieldInputId}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('fieldCard.contentPlaceholder')}
              className="field-input"
            />
          )}
        </div>
      </div>

      {/* 图标选择面板 Portal */}
      {showIconPicker && onChangeIcon && createPortal(
        <div
          ref={pickerRef}
          style={{ position: 'fixed', top: iconPos.top, left: iconPos.left, width: 324 }}
          className="z-[9999] field-more-menu-enter"
        >
          <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(0,0,0,0.38)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                id="icon-picker-search"
                type="text"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder={t('fieldIcon.searchPlaceholder')}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-gray-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700/70"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ICON_CATEGORIES.map((category) => {
                const isActive = activeIconCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveIconCategory(category)}
                    className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    }`}
                  >
                    {t(`fieldIcon.categories.${category}`)}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-4">
              <div className="hide-scrollbar max-h-[280px] overflow-y-auto pr-1">
              {filteredIcons.length > 0 ? (
                <div className="grid grid-cols-7 gap-1.5">
                  {filteredIcons.map((item) => {
                    const isActive = selectedIconKey === item.key;
                    const iconLabel = t(`fieldIcon.icons.${item.key}`);
                    return (
                      <Tooltip key={item.key} content={iconLabel}>
                      <button
                        type="button"
                        onClick={() => {
                          onChangeIcon(field, item.key);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                          isActive
                            ? 'bg-neutral-900 text-white dark:bg-slate-100 dark:text-slate-950'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                        }`}
                        aria-label={t('fieldIcon.selectAria', { label: iconLabel })}
                      >
                        {item.icon}
                      </button>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
                  {t('fieldIcon.empty')}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* 重命名面板 Portal */}
      {showRenamePanel && createPortal(
        <div
          ref={renamePanelRef}
          style={{ position: 'fixed', top: renamePos.top, left: renamePos.left, width: 224 }}
          className="z-[9999] field-more-menu-enter"
        >
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
            <label htmlFor="field-rename-input" className="block text-xs text-gray-500 mb-2.5 font-medium">{t('fieldCard.rename.title')}</label>
            <input
              id="field-rename-input"
              ref={editInputRef}
              type="text"
              value={editNameVal}
              maxLength={12}
              onChange={(e) => {
                setEditNameVal(e.target.value);
                if (renameError) setRenameError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setShowRenamePanel(false);
              }}
              className="field-input"
              placeholder={t('fieldCard.rename.placeholder')}
            />
            {renameError && (
              <p className="mt-2 text-xs text-red-500">{renameError}</p>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowRenamePanel(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common:button.cancel')}
              </button>
              <button
                type="button"
                onClick={handleRenameConfirm}
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
