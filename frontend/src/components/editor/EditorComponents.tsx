import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useResume } from '../../context/ResumeContext';
import { useLongTextEditor } from '../../context/LongTextEditorContext';
import { useToast } from '../common/Toast';
import { v4 as uuidv4 } from 'uuid';
import {
  EducationEntry,
  ProjectEntry,
  WorkEntry,
  HonorEntry,
  CertificationEntry,
  PortfolioEntry,
  DEFAULT_PERSONAL_FIELD_ORDER,
  BUILTIN_PERSONAL_FIELDS,
  getPersonalFieldLabels,
  PersonalPhotoStyle,
} from '../../types/resume';
import { useFloatingEditor } from '../../context/FloatingEditorContext';
import { LongTextFieldEntry } from './LongTextFieldEntry';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Camera } from '../icons';
import { Eye, EyeOff, Link, Unlink, X } from 'lucide-react';
import {
  PINNED_PERSONAL_FIELD,
  DEFAULT_PHOTO_STYLE,
  PHOTO_STYLE_PANEL_WIDTH,
  PHOTO_STYLE_LIMITS,
  PHOTO_ASPECT_OPTIONS,
  PHOTO_RADIUS_OPTIONS,
  type PhotoAspectKey,
  type PhotoRadiusKey,
  normalizePersonalFieldOrder,
  normalizePhotoStyle,
  clampNumber,
  parseDimensionInput,
} from './photoStyle';
import { StyledInput, StyledDateInput, StyledComboInput } from './StyledInputs';
import { FieldCard } from './FieldCard';
import { AddEntryButton, EntryCardHeader } from './EditorCommon';
import {
  computeAutoFill,
  applyAutoFillSafely,
  getDegreeDuration,
  calculateEndDate,
  calculateStartDate,
} from '../../utils/educationDateUtils';

// Personal Info Editor
export function PersonalInfoEditor() {
  const { t } = useTranslation(['editor', 'resume', 'common']);
  const { data, dispatch } = useResume();
  const { showToast } = useToast();
  const { personalInfo } = data;
  const [photoStyleOpen, setPhotoStyleOpen] = useState(false);
  const [originalPhotoRatio, setOriginalPhotoRatio] = useState<number | null>(null);
  const [selectedPhotoAspect, setSelectedPhotoAspect] = useState<PhotoAspectKey>('custom');
  const [selectedPhotoRadius, setSelectedPhotoRadius] = useState<PhotoRadiusKey>('custom');
  const [photoRatioLocked, setPhotoRatioLocked] = useState(true);
  const photoStylePanelRef = useRef<HTMLDivElement>(null);
  const photoStyleTriggerRef = useRef<HTMLButtonElement>(null);
  const [photoStylePanelPos, setPhotoStylePanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const photoStyle = useMemo(() => normalizePhotoStyle(personalInfo.photoStyle), [personalInfo.photoStyle]);

  const updatePhotoStylePanelPosition = useCallback(() => {
    if (!photoStyleTriggerRef.current) return;
    const rect = photoStyleTriggerRef.current.getBoundingClientRect();
    const gap = 10;
    const panelWidth = PHOTO_STYLE_PANEL_WIDTH;
    const estimatedHeight = photoStylePanelRef.current?.offsetHeight ?? 500;
    const viewportPadding = 8;
    const navigationSafeTop = 72;
    const rightLeft = rect.right + gap;
    const belowTop = rect.bottom + gap;
    const canOpenRight = rightLeft + panelWidth <= window.innerWidth - viewportPadding;
    const top = canOpenRight
      ? Math.min(
          Math.max(navigationSafeTop, rect.top - 18),
          Math.max(navigationSafeTop, window.innerHeight - estimatedHeight - viewportPadding),
        )
      : (belowTop + estimatedHeight <= window.innerHeight - viewportPadding
          ? belowTop
          : Math.max(navigationSafeTop, rect.top - gap - estimatedHeight));
    const left = canOpenRight
      ? rightLeft
      : Math.min(
          Math.max(viewportPadding, rect.left),
          Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding),
        );
    setPhotoStylePanelPos({ top, left });
  }, []);

  useEffect(() => {
    const matchedRadius = PHOTO_RADIUS_OPTIONS.find((option) => option.value === photoStyle.borderRadius);
    setSelectedPhotoRadius(matchedRadius?.key ?? 'custom');
  }, [photoStyle.borderRadius]);

  const applyPhotoStyle = useCallback((nextStyle: Partial<PersonalPhotoStyle>) => {
    dispatch({
      type: 'SET_PERSONAL_INFO',
      payload: { photoStyle: normalizePhotoStyle({ ...photoStyle, ...nextStyle }) },
    });
  }, [dispatch, photoStyle]);

  useDismissibleLayer({
    open: photoStyleOpen,
    refs: [photoStylePanelRef, photoStyleTriggerRef],
    onDismiss: () => setPhotoStyleOpen(false),
  });

  useLayoutEffect(() => {
    if (photoStyleOpen) updatePhotoStylePanelPosition();
  }, [photoStyleOpen, updatePhotoStylePanelPosition]);

  useEffect(() => {
    if (!photoStyleOpen) return;
    window.addEventListener('resize', updatePhotoStylePanelPosition);
    window.addEventListener('scroll', updatePhotoStylePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePhotoStylePanelPosition);
      window.removeEventListener('scroll', updatePhotoStylePanelPosition, true);
    };
  }, [photoStyleOpen, updatePhotoStylePanelPosition]);

  useEffect(() => {
    if (!personalInfo.photoUrl) {
      setOriginalPhotoRatio(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setOriginalPhotoRatio(image.naturalWidth / image.naturalHeight);
      }
    };
    image.onerror = () => setOriginalPhotoRatio(null);
    image.src = personalInfo.photoUrl;
  }, [personalInfo.photoUrl]);

  const updateField = (field: string, value: string) => {
    dispatch({ type: 'SET_PERSONAL_INFO', payload: { [field]: value } });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      showToast(t('photo.error.fileTooLarge'), 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      dispatch({
        type: 'SET_PERSONAL_INFO',
        payload: { photoUrl: ev.target?.result as string },
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoDelete = () => {
    dispatch({
      type: 'SET_PERSONAL_INFO',
      payload: { photoUrl: '' },
    });
    setPhotoStyleOpen(false);
  };

  const handlePhotoWidthChange = (value: string) => {
    const width = parseDimensionInput(value, photoStyle.width);
    setSelectedPhotoAspect('custom');
    applyPhotoStyle(photoRatioLocked
      ? { width, height: clampNumber(width / (photoStyle.width / photoStyle.height), PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize) }
      : { width });
  };

  const handlePhotoHeightChange = (value: string) => {
    const height = parseDimensionInput(value, photoStyle.height);
    setSelectedPhotoAspect('custom');
    applyPhotoStyle(photoRatioLocked
      ? { height, width: clampNumber(height * (photoStyle.width / photoStyle.height), PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize) }
      : { height });
  };

  const applyPhotoAspectRatio = (ratio: number, key: PhotoAspectKey) => {
    setSelectedPhotoAspect(key);
    applyPhotoStyle({ height: clampNumber(photoStyle.width / ratio, PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize) });
  };

  const resetPhotoStyle = () => {
    setSelectedPhotoAspect('custom');
    setSelectedPhotoRadius('custom');
    dispatch({ type: 'SET_PERSONAL_INFO', payload: { photoStyle: DEFAULT_PHOTO_STYLE } });
  };

  const hiddenFields = personalInfo.hiddenFields || [];

  const toggleHidden = (field: string) => {
    const next = hiddenFields.includes(field)
      ? hiddenFields.filter((f) => f !== field)
      : [...hiddenFields, field];
    dispatch({ type: 'SET_PERSONAL_INFO', payload: { hiddenFields: next } });
  };

  const fieldOrder = normalizePersonalFieldOrder(personalInfo.fieldOrder || DEFAULT_PERSONAL_FIELD_ORDER);
  const fieldLabels = personalInfo.fieldLabels || {};
  const defaultFieldLabels = getPersonalFieldLabels();
  const isBuiltinPersonalField = (field: string) => BUILTIN_PERSONAL_FIELDS.includes(field);
  const getFieldDisplayLabel = (field: string) => (
    isBuiltinPersonalField(field)
      ? (fieldLabels[field]?.trim() || defaultFieldLabels[field] || field)
      : field
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  const handleFieldDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      if (active.id === PINNED_PERSONAL_FIELD || over.id === PINNED_PERSONAL_FIELD) return;

      const oldIndex = fieldOrder.indexOf(active.id as string);
      const newIndex = fieldOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      if (newIndex === 0) return;

      const newOrder = normalizePersonalFieldOrder(arrayMove(fieldOrder, oldIndex, newIndex));
      dispatch({ type: 'SET_PERSONAL_INFO', payload: { fieldOrder: newOrder } });
    },
    [fieldOrder, dispatch],
  );

  // 根据 fieldOrder 查找字段数据
  const customFields = personalInfo.customFields || {};
  const getFieldValue = (field: string): string => {
    switch (field) {
      case 'fullName': return personalInfo.fullName || '';
      case 'phone': return personalInfo.phone;
      case 'email': return personalInfo.email;
      case 'jobStatus': return personalInfo.jobStatus || '';
      case 'jobTarget': return personalInfo.jobTarget || '';
      case 'location': return personalInfo.location || '';
      default: return customFields[field] || '';
    }
  };

  // 自动生成不重复的自定义字段名
  const handleAddCustomField = () => {
    let index = fieldOrder.length + 1;
    let name = t('resume:field.customFieldName', { index });
    while (fieldOrder.includes(name)) {
      index++;
      name = t('resume:field.customFieldName', { index });
    }
    dispatch({
      type: 'SET_PERSONAL_INFO',
      payload: {
        fieldOrder: [...fieldOrder, name],
        customFields: { ...customFields, [name]: '' },
      },
    });
  };

  // 更换字段图标
  const iconMap = personalInfo.iconMap || {};
  const handleChangeIcon = (field: string, iconKey: string) => {
    const next = { ...iconMap, [field]: iconKey };
    dispatch({ type: 'SET_PERSONAL_INFO', payload: { iconMap: next } });
  };

  const handleResetFieldLabel = (field: string) => {
    if (!isBuiltinPersonalField(field) || !fieldLabels[field]) return;
    const nextLabels = { ...fieldLabels };
    delete nextLabels[field];
    dispatch({ type: 'SET_PERSONAL_INFO', payload: { fieldLabels: nextLabels } });
  };

  // 重命名字段：内置字段只改显示标签，自定义字段仍改字段 key。
  const handleRenameField = (oldName: string, newName: string): string | void => {
    const nextName = newName.trim();
    const duplicated = fieldOrder.some((field) => (
      field !== oldName && getFieldDisplayLabel(field) === nextName
    ));
    if (duplicated) return t('fieldCard.rename.duplicate');

    if (isBuiltinPersonalField(oldName)) {
      const defaultLabel = defaultFieldLabels[oldName] || oldName;
      const nextLabels = { ...fieldLabels };
      if (nextName === defaultLabel) {
        delete nextLabels[oldName];
      } else {
        nextLabels[oldName] = nextName;
      }
      dispatch({ type: 'SET_PERSONAL_INFO', payload: { fieldLabels: nextLabels } });
      return;
    }

    if (oldName === nextName) return;
    if (fieldOrder.includes(nextName) || isBuiltinPersonalField(nextName)) {
      return t('fieldCard.rename.duplicate');
    }
    const nextOrder = fieldOrder.map((f) => (f === oldName ? nextName : f));
    const nextCustom = { ...customFields };
    if (nextCustom[oldName] !== undefined) {
      nextCustom[nextName] = nextCustom[oldName];
      delete nextCustom[oldName];
    }
    const nextHidden = hiddenFields.includes(oldName)
      ? hiddenFields.map((f) => (f === oldName ? nextName : f))
      : hiddenFields;
    const nextIconMap = { ...iconMap };
    if (nextIconMap[oldName] !== undefined) {
      nextIconMap[nextName] = nextIconMap[oldName];
      delete nextIconMap[oldName];
    }
    dispatch({
      type: 'SET_PERSONAL_INFO',
      payload: { fieldOrder: nextOrder, customFields: nextCustom, hiddenFields: nextHidden, iconMap: nextIconMap },
    });
  };

  const matchedAspect = PHOTO_ASPECT_OPTIONS.find((option) => {
    if (!photoStyle.height) return false;
    return Math.abs((photoStyle.width / photoStyle.height) - option.ratio) < 0.02;
  });
  const matchedOriginalAspect = originalPhotoRatio && photoStyle.height
    ? Math.abs((photoStyle.width / photoStyle.height) - originalPhotoRatio) < 0.02
    : false;
  const activePhotoAspect = selectedPhotoAspect !== 'custom'
    ? selectedPhotoAspect
    : (matchedAspect?.key ?? (matchedOriginalAspect ? 'original' : 'custom'));
  const activePhotoRadius = selectedPhotoRadius !== 'custom'
    ? selectedPhotoRadius
    : (PHOTO_RADIUS_OPTIONS.find((option) => option.value === photoStyle.borderRadius)?.key ?? 'custom');
  const compactInputClass = 'photo-size-input h-10 w-full rounded-[10px] bg-[#f7f9fc] px-3 pr-8 text-sm text-[#344054] tabular-nums outline-none hover:bg-[#f7f9fc] focus:border-transparent focus:bg-[#f7f9fc] focus:outline-none focus:ring-0 dark:bg-white/[0.04] dark:text-white/90 dark:hover:bg-white/[0.04] dark:focus:bg-white/[0.04]';
  const optionButtonClass = (active: boolean) => [
    'flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-[8px] px-1 text-[11px] font-medium whitespace-nowrap transition-colors duration-150',
    active
      ? 'bg-white text-blue-600 shadow-sm dark:bg-white/[0.10] dark:text-blue-300'
      : 'text-gray-500 hover:bg-white/60 hover:text-gray-700 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white/80',
  ].join(' ');

  return (
    <div className="space-y-4">
      {/* 证件照卡片 */}
      <div className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-2.5 min-w-0">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm font-medium text-gray-500">{t('photo.title')}</span>
          <button
            type="button"
            onClick={() => toggleHidden('photo')}
            className={`ml-auto p-0.5 rounded transition-colors ${
              hiddenFields.includes('photo') ? 'text-gray-300 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {hiddenFields.includes('photo') ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-start gap-2.5">
          {personalInfo.photoUrl ? (
            <label htmlFor="photo-upload" className="relative flex-shrink-0 cursor-pointer group/avatar w-[88px] h-[88px] rounded-2xl overflow-hidden border-2 border-blue-500 bg-gray-50">
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <img
                src={personalInfo.photoUrl}
                alt={t('photo.alt')}
                className="w-full h-full object-cover"
                onLoad={(e) => {
                  const image = e.currentTarget;
                  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                    setOriginalPhotoRatio(image.naturalWidth / image.naturalHeight);
                  }
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </label>
          ) : (
            <label htmlFor="photo-upload-empty" className="relative flex-shrink-0 cursor-pointer group/avatar">
              <input id="photo-upload-empty" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <div className="w-[88px] h-[88px] rounded-2xl bg-blue-50/60 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-1 text-blue-400 text-xs transition-colors group-hover/avatar:border-blue-400 group-hover/avatar:bg-blue-50 group-hover/avatar:text-blue-500 dark:bg-blue-500/5 dark:border-blue-500/20 dark:text-blue-400/60 dark:group-hover/avatar:border-blue-500/40 dark:group-hover/avatar:bg-blue-500/10 dark:group-hover/avatar:text-blue-400">
                <Camera className="w-5 h-5" />
                <span>{t('photo.upload')}</span>
              </div>
            </label>
          )}
          <div className="flex min-w-0 flex-col gap-1.5 pt-1">
            {personalInfo.photoUrl ? (
              <span className="text-xs text-gray-600">{t('photo.uploaded')}</span>
            ) : (
              <span className="text-xs text-gray-400">{t('photo.notUploaded')}</span>
            )}
            <span className="break-words text-xs leading-snug text-gray-400">{t('photo.hint')}</span>
            {personalInfo.photoUrl && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  ref={photoStyleTriggerRef}
                  type="button"
                  onClick={() => {
                    updatePhotoStylePanelPosition();
                    setPhotoStyleOpen((open) => !open);
                  }}
                  className="shrink-0 whitespace-nowrap px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('photo.adjust')}
                </button>
                <button
                  type="button"
                  onClick={handlePhotoDelete}
                  className="shrink-0 whitespace-nowrap px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {t('common:button.delete')}
                </button>
                {photoStyleOpen && createPortal(
                  <div
                    ref={photoStylePanelRef}
                    style={{ position: 'fixed', top: photoStylePanelPos.top, left: photoStylePanelPos.left }}
                    className="avatar-settings-popover field-more-menu-enter z-[9999] w-[312px] max-w-[calc(100vw-16px)] overflow-hidden rounded-[18px] border border-[rgba(31,45,61,0.08)] bg-white/[0.98] shadow-[0_16px_40px_rgba(15,23,42,0.14),0_3px_10px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-[rgba(20,24,32,0.72)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.34),0_3px_10px_rgba(0,0,0,0.20)] dark:backdrop-blur-[18px] dark:backdrop-saturate-[1.4]"
                  >
                    <div className="relative border-b border-gray-900/[0.05] px-[18px] pb-3.5 pt-[18px] dark:border-white/[0.07]">
                      <h3 className="pr-8 text-base font-semibold leading-5 text-gray-900 dark:text-white/90">{t('photo.adjust')}</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-white/55">{t('photo.description')}</p>
                      <button
                        type="button"
                        onClick={() => setPhotoStyleOpen(false)}
                        aria-label={t('common:close')}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-white/45 dark:hover:bg-white/[0.06] dark:hover:text-white/75"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4 px-[18px] pb-2.5 pt-4">
                      <div className="avatar-preview-grid relative flex h-[104px] items-center justify-center overflow-hidden rounded-[13px] border border-gray-900/[0.04] bg-gray-50 dark:border-white/[0.07] dark:bg-white/[0.04]">
                        <img
                          src={personalInfo.photoUrl}
                          alt={t('photo.alt')}
                          className="relative z-[1] max-h-20 max-w-[120px] object-cover"
                          style={{
                            width: `${Math.min(120, 80 * (photoStyle.width / photoStyle.height))}px`,
                            height: `${Math.min(80, 120 * (photoStyle.height / photoStyle.width))}px`,
                            borderRadius: `${Math.min(photoStyle.borderRadius, 36)}px`,
                          }}
                        />
                        <span className="absolute bottom-2 right-2 z-[1] rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-500 backdrop-blur-sm dark:bg-black/20 dark:text-white/55">
                          {photoStyle.width} × {photoStyle.height} px
                        </span>
                      </div>

                      <div>
                        <span className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('photo.size')}</span>
                        <div className="grid grid-cols-[1fr_28px_1fr] items-end gap-1.5">
                          <label htmlFor="photo-width" className="block">
                            <span className="mb-1 block text-[11px] text-gray-400">{t('photo.width')}</span>
                            <div className="relative">
                              <input
                                id="photo-width"
                                type="number"
                                min={PHOTO_STYLE_LIMITS.minSize}
                                max={PHOTO_STYLE_LIMITS.maxSize}
                                value={photoStyle.width}
                                onChange={(e) => handlePhotoWidthChange(e.target.value)}
                                className={compactInputClass}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">px</span>
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={() => setPhotoRatioLocked((locked) => !locked)}
                            aria-label={t('photo.lockRatio')}
                            title={t('photo.lockRatio')}
                            className={`mb-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${photoRatioLocked ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200/70 dark:bg-white/[0.04] dark:text-white/40 dark:hover:bg-white/[0.06]'}`}
                          >
                            {photoRatioLocked ? <Link className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
                          </button>
                          <label htmlFor="photo-height" className="block">
                            <span className="mb-1 block text-[11px] text-gray-400">{t('photo.height')}</span>
                            <div className="relative">
                              <input
                                id="photo-height"
                                type="number"
                                min={PHOTO_STYLE_LIMITS.minSize}
                                max={PHOTO_STYLE_LIMITS.maxSize}
                                value={photoStyle.height}
                                onChange={(e) => handlePhotoHeightChange(e.target.value)}
                                className={compactInputClass}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">px</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div>
                        <span className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('photo.aspectRatio')}</span>
                        <div className="flex rounded-[10px] bg-gray-100 p-1 dark:bg-white/[0.04]">
                          {PHOTO_ASPECT_OPTIONS.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => applyPhotoAspectRatio(option.ratio, option.key)}
                              className={optionButtonClass(activePhotoAspect === option.key)}
                            >
                              {option.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => originalPhotoRatio && applyPhotoAspectRatio(originalPhotoRatio, 'original')}
                            disabled={!originalPhotoRatio}
                            className={`${optionButtonClass(activePhotoAspect === 'original')} disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-white disabled:text-gray-300 dark:disabled:border-gray-700 dark:disabled:bg-gray-900 dark:disabled:text-gray-600`}
                          >
                            {t('photo.original')}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('photo.cornerRadius')}</span>
                        <div className="flex rounded-[10px] bg-gray-100 p-1 dark:bg-white/[0.04]">
                          {PHOTO_RADIUS_OPTIONS.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => {
                                setSelectedPhotoRadius(option.key);
                                applyPhotoStyle({ borderRadius: option.value });
                              }}
                              className={optionButtonClass(activePhotoRadius === option.key)}
                            >
                              {t(`photo.radius.${option.key}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-gray-900/[0.05] px-[18px] pb-4 pt-3 dark:border-white/[0.07]">
                      <button
                        type="button"
                        onClick={resetPhotoStyle}
                        className="h-9 rounded-[9px] px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white/80"
                      >
                        {t('common:button.reset')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoStyleOpen(false)}
                        className="h-9 rounded-[9px] bg-blue-500 px-3.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                      >
                        {t('common:button.done')}
                      </button>
                    </div>
                  </div>,
                  document.body,
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 可拖拽字段卡片（合并为一个卡片） */}
      <div className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFieldDragEnd}
        >
          <SortableContext
            items={fieldOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-gray-50 -mx-3">
              {fieldOrder.map((field) => {
                const isCustom = !isBuiltinPersonalField(field);
                return (
                  <FieldCard
                    key={field}
                    field={field}
                    displayLabel={getFieldDisplayLabel(field)}
                    value={getFieldValue(field)}
                    onChange={(v) => {
                      if (isCustom) {
                        dispatch({
                          type: 'SET_PERSONAL_INFO',
                          payload: { customFields: { ...customFields, [field]: v } },
                        });
                      } else {
                        updateField(field, v);
                      }
                    }}
                    onDelete={isCustom ? (() => {
                      const nextOrder = fieldOrder.filter((f) => f !== field);
                      const nextHidden = hiddenFields.filter((f) => f !== field);
                      const nextIconMap = { ...iconMap };
                      delete nextIconMap[field];
                      const nextCustom = { ...customFields };
                      delete nextCustom[field];
                      dispatch({ type: 'SET_PERSONAL_INFO', payload: { fieldOrder: nextOrder, customFields: nextCustom, hiddenFields: nextHidden, iconMap: nextIconMap } });
                    }) : undefined}
                    onRename={handleRenameField}
                    onResetLabel={!isCustom ? () => handleResetFieldLabel(field) : undefined}
                    hasCustomLabel={!isCustom && !!fieldLabels[field]}
                    onChangeIcon={handleChangeIcon}
                    iconMap={iconMap}
                    isCustomField={isCustom}
                    hiddenFields={hiddenFields}
                    onToggleHidden={toggleHidden}
                    noCard
                  >
                    {field === 'jobStatus' && !isCustom ? (
                      <StyledComboInput
                        label=""
                        value={personalInfo.jobStatus || ''}
                        onChange={(v) => updateField('jobStatus', v)}
                        options={[t('resume:status.available'), t('resume:status.employed'), t('resume:status.newGraduate')]}
                        placeholder={t('resume:placeholder.jobStatus')}
                        size="md"
                      />
                    ) : null}
                  </FieldCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* 添加自定义信息 */}
        <div className="border-t border-gray-100 mt-1 pt-3">
          <button
            type="button"
            onClick={handleAddCustomField}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('personalInfo.addCustomField')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Education Editor
export function EducationEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();

  // 追踪每条教育经历各时间字段的来源（auto / manual）
  // key: education.id, value: { startDate, endDate }
  const fieldSourcesRef = useRef<Record<string, { startDate: 'auto' | 'manual'; endDate: 'auto' | 'manual' }>>({});

  // 追踪每条教育经历的提示信息 key: education.id
  const [hints, setHints] = useState<Record<string, string | null>>({});

  // 初始化清理：确保 ref 中追踪的条目与实际数据同步
  useEffect(() => {
    const currentIds = new Set(data.education.map((e) => e.id));
    const tracked = fieldSourcesRef.current;
    for (const id of Object.keys(tracked)) {
      if (!currentIds.has(id)) delete tracked[id];
    }
    // 为新条目初始化，通过反向比对自动推算值来恢复 auto/manual 标记
    for (const edu of data.education) {
      if (!tracked[edu.id]) {
        const duration = getDegreeDuration(edu.degree);
        let startSource: 'auto' | 'manual' = edu.startDate ? 'manual' : 'auto';
        let endSource: 'auto' | 'manual' = edu.endDate ? 'manual' : 'auto';

        // 若能识别学历且两个时间都存在，检测哪个是自动推算的
        if (duration !== null && edu.startDate && edu.endDate) {
          const expectedEnd = calculateEndDate(edu.startDate, duration);
          const expectedStart = calculateStartDate(edu.endDate, duration);
          if (expectedEnd === edu.endDate) endSource = 'auto';
          if (expectedStart === edu.startDate) startSource = 'auto';
        }

        tracked[edu.id] = { startDate: startSource, endDate: endSource };
      }
    }
  }, [data.education]);

  const getSources = (id: string) => {
    if (!fieldSourcesRef.current[id]) {
      fieldSourcesRef.current[id] = { startDate: 'manual', endDate: 'manual' };
    }
    return fieldSourcesRef.current[id];
  };

  const addEducation = () => {
    const entry: EducationEntry = {
      id: uuidv4(),
      school: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
    };
    fieldSourcesRef.current[entry.id] = { startDate: 'auto', endDate: 'auto' };
    dispatch({ type: 'ADD_EDUCATION', payload: entry });
  };

  const updateEducation = useCallback((entry: EducationEntry) => {
    dispatch({ type: 'UPDATE_EDUCATION', payload: entry });
  }, [dispatch]);

  const deleteEducation = (id: string) => {
    delete fieldSourcesRef.current[id];
    setHints((prev) => { const next = { ...prev }; delete next[id]; return next; });
    dispatch({ type: 'DELETE_EDUCATION', payload: id });
  };

  /**
   * 尝试对某条教育经历执行自动推算
   * 返回推算后的 EducationEntry（若有变更），否则返回 null
   */
  const tryAutoFill = useCallback(
    (edu: EducationEntry): EducationEntry | null => {
      const sources = getSources(edu.id);
      const result = computeAutoFill(edu.degree, edu.startDate, edu.endDate, sources);
      const safe = applyAutoFillSafely(result, edu.startDate, edu.endDate, sources);

      if (safe.startDate === null && safe.endDate === null) return null;

      const updated = { ...edu };
      let changed = false;

      if (safe.startDate !== null) {
        updated.startDate = safe.startDate;
        sources.startDate = 'auto';
        changed = true;
      }
      if (safe.endDate !== null) {
        updated.endDate = safe.endDate;
        sources.endDate = 'auto';
        changed = true;
      }

      // 生成提示
      if (changed && safe.hintKey) {
        const degreeName = edu.degree || t('resume:degree.bachelor');
        setHints((prev) => ({
          ...prev,
          [edu.id]: t(`editor:${safe.hintKey}`, { degree: degreeName }),
        }));
      }

      return changed ? updated : null;
    },
    [t],
  );

  // 处理学历变化
  const handleDegreeChange = useCallback(
    (edu: EducationEntry, newDegree: string) => {
      const updated = { ...edu, degree: newDegree };
      const autoResult = tryAutoFill(updated);
      updateEducation(autoResult || updated);
    },
    [tryAutoFill, updateEducation],
  );

  // 处理开始时间变化
  const handleStartDateChange = useCallback(
    (edu: EducationEntry, newStartDate: string) => {
      // 标记为手动输入
      const sources = getSources(edu.id);
      sources.startDate = 'manual';
      // 清除该条目的提示（用户正在手动操作）
      setHints((prev) => ({ ...prev, [edu.id]: null }));

      const updated = { ...edu, startDate: newStartDate };
      const autoResult = tryAutoFill(updated);
      updateEducation(autoResult || updated);
    },
    [tryAutoFill, updateEducation],
  );

  // 处理结束时间变化
  const handleEndDateChange = useCallback(
    (edu: EducationEntry, newEndDate: string) => {
      const sources = getSources(edu.id);
      sources.endDate = 'manual';
      setHints((prev) => ({ ...prev, [edu.id]: null }));

      const updated = { ...edu, endDate: newEndDate };
      const autoResult = tryAutoFill(updated);
      updateEducation(autoResult || updated);
    },
    [tryAutoFill, updateEducation],
  );

  return (
    <div className="space-y-3">
      {data.education.map((edu, index) => {
        const hint = hints[edu.id];
        return (
          <div key={edu.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
            <EntryCardHeader index={index} onDelete={() => deleteEducation(edu.id)} />
            <StyledInput label={t('resume:field.school')} value={edu.school} onChange={(v) => updateEducation({ ...edu, school: v })} placeholder={t('resume:placeholder.schoolExample')} size="md" />
            <StyledInput label={t('resume:field.major')} value={edu.major} onChange={(v) => updateEducation({ ...edu, major: v })} placeholder={t('resume:placeholder.majorExample')} size="md" />
            <StyledComboInput
              label={t('resume:field.degree')}
              value={edu.degree}
              onChange={(v) => handleDegreeChange(edu, v)}
              options={[t('resume:degree.associate'), t('resume:degree.bachelor'), t('resume:degree.master'), t('resume:degree.mba'), t('resume:degree.phd')]}
              placeholder={t('resume:placeholder.degreeInput')}
              size="md"
            />
            <div className="grid grid-cols-2 gap-1">
              <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.startDate')} value={edu.startDate} onChange={(v) => handleStartDateChange(edu, v)} placeholder="2020.09" size="md" />
              <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.endDate')} value={edu.endDate} onChange={(v) => handleEndDateChange(edu, v)} placeholder="2024.06" size="md" />
            </div>
            {hint && (
              <div className="flex items-start gap-1.5 px-0.5">
                <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
                <span className="text-xs text-blue-500/80 leading-relaxed">{hint}</span>
              </div>
            )}
          </div>
        );
      })}
      <AddEntryButton onClick={addEducation} label={t('sectionAction.addEducation')} />
    </div>
  );
}

// Skills Editor
export function SkillsEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();
  const editorKey = 'skills:description';
  const isEditorActive = activeEditorKey === editorKey;

  // 抽屉状态
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    originalText: string;
  }>({ isOpen: false, originalText: '' });

  // 文本实时同步
  const handleDrawerTextChange = useCallback(
    (text: string) => {
      dispatch({ type: 'SET_SKILLS', payload: text });
    },
    [dispatch],
  );

  // 保存 → 更新基准文本并关闭
  const handleDrawerSave = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText, isOpen: false }));
  }, []);

  // 仅保存基准文本，不关闭（Ctrl+S）
  const handleDrawerSaveOnly = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText }));
  }, []);

  // 取消 → 恢复上次保存的文本并关闭
  const handleDrawerCancel = useCallback(() => {
    dispatch({ type: 'SET_SKILLS', payload: drawerState.originalText });
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  }, [dispatch, drawerState.originalText]);

  // 打开
  const handleOpenDrawer = useCallback(async (triggerRect: DOMRect) => {
    if (drawerState.isOpen) return;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    setDrawerState({ isOpen: true, originalText: data.skills });
    floatingEditor.open({
      editorKey,
      title: t('longText.skillsTitle'),
      text: data.skills,
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [data.skills, drawerState.isOpen, editorKey, floatingEditor, requestOpenEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    if (!drawerState.isOpen) return;
    floatingEditor.updateCallbacks({
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [floatingEditor, drawerState.isOpen, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
        <LongTextFieldEntry
          label={t('resume:field.skills')}
          value={data.skills}
          isActive={isEditorActive}
          onOpen={(rect) => void handleOpenDrawer(rect)}
          anchorKey={editorKey}
        />
      </div>
    </div>
  );
}

// Work Experience Editor
export function WorkExperienceEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();


  // 抽屉状态：key 为 workId，值为 { isOpen, originalText }
  const [drawerStates, setDrawerStates] = useState<Record<string, { isOpen: boolean; originalText: string }>>({});

  const addWork = () => {
    const entry: WorkEntry = {
      id: uuidv4(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      highlights: '',
    };
    dispatch({ type: 'ADD_WORK_EXPERIENCE', payload: entry });
  };

  const handleDrawerTextChange = useCallback(
    (workId: string, text: string) => {
      dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId, highlights: text } });
    },
    [dispatch],
  );

  const handleDrawerSave = useCallback((workId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [workId]: { ...prev[workId], originalText: savedText, isOpen: false } }));
  }, []);

  const handleDrawerSaveOnly = useCallback((workId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [workId]: { ...prev[workId], originalText: savedText } }));
  }, []);

  const handleDrawerCancel = useCallback((workId: string) => {
    const ds = drawerStates[workId];
    if (ds) {
      dispatch({ type: 'SET_WORK_HIGHLIGHTS', payload: { workId, highlights: ds.originalText } });
    }
    setDrawerStates((prev) => ({ ...prev, [workId]: { ...prev[workId], isOpen: false } }));
  }, [dispatch, drawerStates]);

  // 打开
  const handleOpenDrawer = useCallback(async (workId: string, triggerRect: DOMRect) => {
    if (drawerStates[workId]?.isOpen) return;
    const editorKey = `work:${workId}:highlights`;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    const work = data.workExperience.find((w) => w.id === workId);
    setDrawerStates((prev) => ({ ...prev, [workId]: { isOpen: true, originalText: work?.highlights ?? '' } }));
    floatingEditor.open({
      editorKey,
      title: t('longText.workTitle'),
      text: work?.highlights ?? '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: (text: string) => handleDrawerTextChange(workId, text),
      onSave: (text: string) => handleDrawerSave(workId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(workId, text),
      onCancel: () => handleDrawerCancel(workId),
    });
  }, [data.workExperience, drawerStates, requestOpenEditor, floatingEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新（基于当前打开的工作项）
  const openWorkIdRef = useRef<string | null>(null);
  useEffect(() => {
    const openWorkId = Object.keys(drawerStates).find((id) => drawerStates[id]?.isOpen) ?? null;
    if (!openWorkId) return;
    openWorkIdRef.current = openWorkId;
    floatingEditor.updateCallbacks({
      onTextChange: (text: string) => handleDrawerTextChange(openWorkId, text),
      onSave: (text: string) => handleDrawerSave(openWorkId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(openWorkId, text),
      onCancel: () => handleDrawerCancel(openWorkId),
    });
  }, [floatingEditor, drawerStates, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      {data.workExperience.map((work, i) => (
        <div key={work.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          {(() => {
            const editorKey = `work:${work.id}:highlights`;
            const isEditorActive = activeEditorKey === editorKey;
            return (
              <>
              <EntryCardHeader index={i} onDelete={() => dispatch({ type: 'DELETE_WORK_EXPERIENCE', payload: work.id })} />
          <StyledInput label={t('resume:field.company')} value={work.company} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, company: v } })} placeholder={t('resume:placeholder.companyExample')} size="md" />
          <StyledInput label={t('resume:field.position')} value={work.position} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, position: v } })} placeholder={t('resume:placeholder.positionExample')} size="md" />
          <StyledInput label={t('resume:field.location')} value={work.location} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, location: v } })} placeholder={t('resume:placeholder.workLocationExample')} size="md" />
          <div className="grid grid-cols-2 gap-1">
            <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.startDate')} value={work.startDate} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, startDate: v } })} placeholder="2020.09" size="md" />
            <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.endDate')} value={work.endDate} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, endDate: v } })} placeholder="2023.06" size="md" />
          </div>
          <LongTextFieldEntry
            label={t('resume:field.workHighlights')}
            value={work.highlights}
            isActive={isEditorActive}
            onOpen={(rect) => void handleOpenDrawer(work.id, rect)}
            anchorKey={editorKey}
          />
              </>
            );
          })()}
        </div>
      ))}
      <AddEntryButton onClick={addWork} label={t('sectionAction.addWork')} />
    </div>
  );
}

// Project Editor
export function ProjectEditor() {
  const { t } = useTranslation(['editor', 'resume', 'common']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();


  const [drawerStates, setDrawerStates] = useState<Record<string, { isOpen: boolean; originalText: string }>>({});

  const addProject = () => {
    const entry: ProjectEntry = {
      id: uuidv4(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      highlights: '',
    };
    dispatch({ type: 'ADD_PROJECT', payload: entry });
  };

  const handleDrawerTextChange = useCallback(
    (projectId: string, text: string) => {
      dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId, highlights: text } });
    },
    [dispatch],
  );

  const handleDrawerSave = useCallback((projectId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [projectId]: { ...prev[projectId], originalText: savedText, isOpen: false } }));
  }, []);

  const handleDrawerSaveOnly = useCallback((projectId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [projectId]: { ...prev[projectId], originalText: savedText } }));
  }, []);

  const handleDrawerCancel = useCallback((projectId: string) => {
    const ds = drawerStates[projectId];
    if (ds) {
      dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId, highlights: ds.originalText } });
    }
    setDrawerStates((prev) => ({ ...prev, [projectId]: { ...prev[projectId], isOpen: false } }));
  }, [dispatch, drawerStates]);

  const handleOpenDrawer = useCallback(async (projectId: string, triggerRect: DOMRect) => {
    if (drawerStates[projectId]?.isOpen) return;
    const editorKey = `project:${projectId}:highlights`;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    const project = data.projects.find((p) => p.id === projectId);
    setDrawerStates((prev) => ({ ...prev, [projectId]: { isOpen: true, originalText: project?.highlights ?? '' } }));
    floatingEditor.open({
      editorKey,
      title: t('longText.projectTitle'),
      text: project?.highlights ?? '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: (text: string) => handleDrawerTextChange(projectId, text),
      onSave: (text: string) => handleDrawerSave(projectId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(projectId, text),
      onCancel: () => handleDrawerCancel(projectId),
    });
  }, [data.projects, drawerStates, requestOpenEditor, floatingEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    const openProjectId = Object.keys(drawerStates).find((id) => drawerStates[id]?.isOpen) ?? null;
    if (!openProjectId) return;
    floatingEditor.updateCallbacks({
      onTextChange: (text: string) => handleDrawerTextChange(openProjectId, text),
      onSave: (text: string) => handleDrawerSave(openProjectId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(openProjectId, text),
      onCancel: () => handleDrawerCancel(openProjectId),
    });
  }, [floatingEditor, drawerStates, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      {data.projects.map((proj, i) => (
        <div key={proj.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          {(() => {
            const editorKey = `project:${proj.id}:highlights`;
            const isEditorActive = activeEditorKey === editorKey;
            return (
              <>
              <EntryCardHeader index={i} onDelete={() => dispatch({ type: 'DELETE_PROJECT', payload: proj.id })} />
          <StyledInput label={t('resume:field.projectName')} value={proj.name} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, name: v } })} placeholder={t('resume:placeholder.projectNameExample')} size="md" />
          <StyledInput label={t('resume:field.projectRole')} value={proj.role} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, role: v } })} placeholder={t('resume:placeholder.projectRoleExample')} size="md" />
          <div className="grid grid-cols-2 gap-1">
            <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.startDate')} value={proj.startDate} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, startDate: v } })} placeholder="2022.03" size="md" />
            <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.endDate')} value={proj.endDate} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, endDate: v } })} placeholder="2022.12" size="md" />
          </div>
          <StyledInput label={`${t('resume:field.projectLink')} (${t('common:optional')})`} value={proj.link} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, link: v } })} placeholder="https://github.com/example" size="md" />
          <LongTextFieldEntry
            label={t('resume:field.projectHighlights')}
            value={proj.highlights}
            isActive={isEditorActive}
            onOpen={(rect) => void handleOpenDrawer(proj.id, rect)}
            anchorKey={editorKey}
          />
              </>
            );
          })()}
        </div>
      ))}
      <AddEntryButton onClick={addProject} label={t('sectionAction.addProject')} />
    </div>
  );
}

// Honor Editor
export function HonorEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();


  const addHonor = () => {
    const entry: HonorEntry = {
      id: uuidv4(),
      name: '',
      date: '',
    };
    dispatch({ type: 'ADD_HONOR', payload: entry });
  };

  const updateHonor = (entry: HonorEntry) => {
    dispatch({ type: 'UPDATE_HONOR', payload: entry });
  };

  const deleteHonor = (id: string) => {
    dispatch({ type: 'DELETE_HONOR', payload: id });
  };

  return (
    <div className="space-y-3">
      {(data.honors || []).map((honor, index) => (
        <div key={honor.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          <EntryCardHeader index={index} onDelete={() => deleteHonor(honor.id)} />
          <StyledInput label={t('resume:field.honorName')} value={honor.name} onChange={(v) => updateHonor({ ...honor, name: v })} placeholder={t('resume:placeholder.honorNameExample')} size="md" />
          <StyledDateInput label={t('resume:field.awardDate')} value={honor.date} onChange={(v) => updateHonor({ ...honor, date: v })} placeholder="2023.06" size="md" />
        </div>
      ))}
      <AddEntryButton onClick={addHonor} label={t('sectionAction.addHonor')} />
    </div>
  );
}

// Certification Editor
export function CertificationEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();


  const addCertification = () => {
    const entry: CertificationEntry = {
      id: uuidv4(),
      name: '',
      date: '',
    };
    dispatch({ type: 'ADD_CERTIFICATION', payload: entry });
  };

  const updateCertification = (entry: CertificationEntry) => {
    dispatch({ type: 'UPDATE_CERTIFICATION', payload: entry });
  };

  const deleteCertification = (id: string) => {
    dispatch({ type: 'DELETE_CERTIFICATION', payload: id });
  };

  return (
    <div className="space-y-3">
      {(data.certifications || []).map((cert, index) => (
        <div key={cert.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          <EntryCardHeader index={index} onDelete={() => deleteCertification(cert.id)} />
          <StyledInput label={t('resume:field.certName')} value={cert.name} onChange={(v) => updateCertification({ ...cert, name: v })} placeholder={t('resume:placeholder.certNameExample')} size="md" />
          <StyledDateInput label={t('resume:field.certDate')} value={cert.date} onChange={(v) => updateCertification({ ...cert, date: v })} placeholder="2023.06" size="md" />
        </div>
      ))}
      <AddEntryButton onClick={addCertification} label={t('sectionAction.addCertification')} />
    </div>
  );
}

// Portfolio Editor
export function PortfolioEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();


  const [drawerStates, setDrawerStates] = useState<Record<string, { isOpen: boolean; originalText: string }>>({});

  const addPortfolio = () => {
    const entry: PortfolioEntry = {
      id: uuidv4(),
      name: '',
      link: '',
      description: '',
    };
    dispatch({ type: 'ADD_PORTFOLIO', payload: entry });
  };

  const updatePortfolio = (entry: PortfolioEntry) => {
    dispatch({ type: 'UPDATE_PORTFOLIO', payload: entry });
  };

  const deletePortfolio = (id: string) => {
    dispatch({ type: 'DELETE_PORTFOLIO', payload: id });
  };

  const handleDrawerTextChange = useCallback(
    (portfolioId: string, text: string) => {
      const item = (data.portfolio || []).find((p) => p.id === portfolioId);
      if (item) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...item, description: text } });
    },
    [dispatch, data.portfolio],
  );

  const handleDrawerSave = useCallback((portfolioId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { ...prev[portfolioId], originalText: savedText, isOpen: false } }));
  }, []);

  const handleDrawerSaveOnly = useCallback((portfolioId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { ...prev[portfolioId], originalText: savedText } }));
  }, []);

  const handleDrawerCancel = useCallback((portfolioId: string) => {
    const ds = drawerStates[portfolioId];
    if (ds) {
      const item = (data.portfolio || []).find((p) => p.id === portfolioId);
      if (item) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...item, description: ds.originalText } });
    }
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { ...prev[portfolioId], isOpen: false } }));
  }, [dispatch, data.portfolio, drawerStates]);

  const handleOpenDrawer = useCallback(async (portfolioId: string, triggerRect: DOMRect) => {
    if (drawerStates[portfolioId]?.isOpen) return;
    const editorKey = `portfolio:${portfolioId}:description`;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    const item = (data.portfolio || []).find((p) => p.id === portfolioId);
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { isOpen: true, originalText: item?.description ?? '' } }));
    floatingEditor.open({
      editorKey,
      title: t('longText.portfolioTitle'),
      text: item?.description ?? '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: (text: string) => handleDrawerTextChange(portfolioId, text),
      onSave: (text: string) => handleDrawerSave(portfolioId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(portfolioId, text),
      onCancel: () => handleDrawerCancel(portfolioId),
    });
  }, [data.portfolio, drawerStates, requestOpenEditor, floatingEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    const openId = Object.keys(drawerStates).find((id) => drawerStates[id]?.isOpen) ?? null;
    if (!openId) return;
    floatingEditor.updateCallbacks({
      onTextChange: (text: string) => handleDrawerTextChange(openId, text),
      onSave: (text: string) => handleDrawerSave(openId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(openId, text),
      onCancel: () => handleDrawerCancel(openId),
    });
  }, [floatingEditor, drawerStates, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      {(data.portfolio || []).map((item, index) => (
        <div key={item.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          {(() => {
            const editorKey = `portfolio:${item.id}:description`;
            const isEditorActive = activeEditorKey === editorKey;
            return (
              <>
          <EntryCardHeader index={index} onDelete={() => deletePortfolio(item.id)} />
          <StyledInput label={t('resume:field.portfolioName')} value={item.name} onChange={(v) => updatePortfolio({ ...item, name: v })} placeholder={t('resume:placeholder.portfolioNameExample')} size="md" />
          <StyledInput label={t('resume:field.portfolioLink')} value={item.link} onChange={(v) => updatePortfolio({ ...item, link: v })} placeholder="https://example.com" size="md" />
          <LongTextFieldEntry
            label={t('resume:field.portfolioDescription')}
            value={item.description}
            isActive={isEditorActive}
            onOpen={(rect) => void handleOpenDrawer(item.id, rect)}
            anchorKey={editorKey}
          />
              </>
            );
          })()}
        </div>
      ))}
      <AddEntryButton onClick={addPortfolio} label={t('sectionAction.addPortfolio')} />
    </div>
  );
}

// Summary Editor
export function SummaryEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();
  const editorKey = 'summary:content';
  const isEditorActive = activeEditorKey === editorKey;

  // 抽屉状态
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    originalText: string;
  }>({ isOpen: false, originalText: '' });

  const handleDrawerTextChange = useCallback(
    (text: string) => {
      dispatch({ type: 'SET_SUMMARY', payload: text });
    },
    [dispatch],
  );

  const handleDrawerSave = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText, isOpen: false }));
  }, []);

  // 仅保存基准文本，不关闭（Ctrl+S）
  const handleDrawerSaveOnly = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText }));
  }, []);

  const handleDrawerCancel = useCallback(() => {
    dispatch({ type: 'SET_SUMMARY', payload: drawerState.originalText });
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  }, [dispatch, drawerState.originalText]);

  const handleOpenDrawer = useCallback(async (triggerRect: DOMRect) => {
    if (drawerState.isOpen) return;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    setDrawerState({ isOpen: true, originalText: data.summary || '' });
    floatingEditor.open({
      editorKey,
      title: t('longText.summaryTitle'),
      text: data.summary || '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [data.summary, drawerState.isOpen, editorKey, floatingEditor, requestOpenEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    if (!drawerState.isOpen) return;
    floatingEditor.updateCallbacks({
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [floatingEditor, drawerState.isOpen, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div>
      <div className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
        <LongTextFieldEntry
          label={t('resume:field.summary')}
          value={data.summary || ''}
          isActive={isEditorActive}
          onOpen={(rect) => void handleOpenDrawer(rect)}
          anchorKey={editorKey}
        />
      </div>
    </div>
  );
}
