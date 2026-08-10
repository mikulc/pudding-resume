import { closestCenter,DndContext,DragEndEvent,PointerSensor,TouchSensor,useSensor,useSensors } from '@dnd-kit/core';
import { arrayMove,SortableContext,verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Eye,EyeOff,Link,RotateCcw,Unlink,X } from 'lucide-react';
import React,{ useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAppUI,useResume } from '../../../context/ResumeContext';
import { useDismissibleLayer } from '../../../hooks/useDismissibleLayer';
import { getLayoutDefaultPhotoStyle,resolvePhotoStyle } from '../../../registry/layouts';
import {
BUILTIN_PERSONAL_FIELDS,
DEFAULT_PERSONAL_FIELD_ORDER,
getPersonalFieldLabels,
PersonalPhotoStyle
} from '../../../types/resume';
import { useToast } from '../../common/Toast';
import { FieldCard } from '../FieldCard';
import { Camera } from '../../icons';
import {
clampNumber,
normalizePersonalFieldOrder,
normalizePhotoStyle,
parseDimensionInput,
PHOTO_ASPECT_OPTIONS,
PHOTO_RADIUS_OPTIONS,
PHOTO_STYLE_LIMITS,
PHOTO_STYLE_PANEL_WIDTH,
PINNED_PERSONAL_FIELD,
type PhotoAspectKey,
type PhotoRadiusKey,
} from '../photoStyle';
import { StyledComboInput } from '../StyledInputs';


// Personal Info Editor
export function PersonalInfoEditor() {
  const { t } = useTranslation(['editor', 'resume', 'common']);
  const { data, dispatch } = useResume();
  const { ui } = useAppUI();
  const { showToast } = useToast();
  const { personalInfo } = data;
  const defaultPhotoStyle = useMemo(
    () => normalizePhotoStyle(getLayoutDefaultPhotoStyle(ui.theme.layoutId)),
    [ui.theme.layoutId],
  );
  const photoStyle = useMemo(() => normalizePhotoStyle(resolvePhotoStyle(
    ui.theme.layoutId,
    personalInfo.photoStyle,
    personalInfo.photoStyleCustomized,
  )), [personalInfo.photoStyle, personalInfo.photoStyleCustomized, ui.theme.layoutId]);
  const [photoStyleOpen, setPhotoStyleOpen] = useState(false);
  const [originalPhotoRatio, setOriginalPhotoRatio] = useState<number | null>(null);
  const [selectedPhotoAspect, setSelectedPhotoAspect] = useState<PhotoAspectKey>('custom');
  const [selectedPhotoRadius, setSelectedPhotoRadius] = useState<PhotoRadiusKey>('custom');
  const [photoRatioLocked, setPhotoRatioLocked] = useState(true);
  const [photoWidthInput, setPhotoWidthInput] = useState(() => String(photoStyle.width));
  const [photoHeightInput, setPhotoHeightInput] = useState(() => String(photoStyle.height));
  const photoStylePanelRef = useRef<HTMLDivElement>(null);
  const photoStyleTriggerRef = useRef<HTMLButtonElement>(null);
  const [photoStylePanelPos, setPhotoStylePanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

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

  useEffect(() => {
    setPhotoWidthInput(String(photoStyle.width));
  }, [photoStyle.width]);

  useEffect(() => {
    setPhotoHeightInput(String(photoStyle.height));
  }, [photoStyle.height]);

  const applyPhotoStyle = useCallback((nextStyle: Partial<PersonalPhotoStyle>) => {
    dispatch({
      type: 'SET_PERSONAL_INFO',
      payload: {
        photoStyle: normalizePhotoStyle({ ...photoStyle, ...nextStyle }),
        photoStyleCustomized: true,
      },
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
    setPhotoWidthInput(value);
    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed) || parsed < PHOTO_STYLE_LIMITS.minSize) return;
    const width = parseDimensionInput(value, photoStyle.width);
    setSelectedPhotoAspect('custom');
    applyPhotoStyle(photoRatioLocked
      ? { width, height: clampNumber(width / (photoStyle.width / photoStyle.height), PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize) }
      : { width });
  };

  const handlePhotoHeightChange = (value: string) => {
    setPhotoHeightInput(value);
    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed) || parsed < PHOTO_STYLE_LIMITS.minSize) return;
    const height = parseDimensionInput(value, photoStyle.height);
    setSelectedPhotoAspect('custom');
    applyPhotoStyle(photoRatioLocked
      ? { height, width: clampNumber(height * (photoStyle.width / photoStyle.height), PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize) }
      : { height });
  };

  const commitPhotoWidth = () => {
    if (photoWidthInput.trim() === '' || !Number.isFinite(Number(photoWidthInput))) {
      setPhotoWidthInput(String(photoStyle.width));
      return;
    }
    handlePhotoWidthChange(String(parseDimensionInput(photoWidthInput, photoStyle.width)));
  };

  const commitPhotoHeight = () => {
    if (photoHeightInput.trim() === '' || !Number.isFinite(Number(photoHeightInput))) {
      setPhotoHeightInput(String(photoStyle.height));
      return;
    }
    handlePhotoHeightChange(String(parseDimensionInput(photoHeightInput, photoStyle.height)));
  };

  const applyPhotoAspectRatio = (ratio: number, key: PhotoAspectKey) => {
    setSelectedPhotoAspect(key);
    applyPhotoStyle({ height: clampNumber(photoStyle.width / ratio, PHOTO_STYLE_LIMITS.minSize, PHOTO_STYLE_LIMITS.maxSize) });
  };

  const resetPhotoStyle = () => {
    setSelectedPhotoAspect('custom');
    setSelectedPhotoRadius('custom');
    dispatch({
      type: 'SET_PERSONAL_INFO',
      payload: { photoStyle: defaultPhotoStyle, photoStyleCustomized: false },
    });
  };

  const isPhotoStyleDefault = !personalInfo.photoStyleCustomized
    && photoStyle.width === defaultPhotoStyle.width
    && photoStyle.height === defaultPhotoStyle.height
    && photoStyle.borderRadius === defaultPhotoStyle.borderRadius;

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
                      <h3 className="pr-24 text-base font-semibold leading-5 text-gray-900 dark:text-white/90">{t('photo.adjust')}</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-white/55">{t('photo.description')}</p>
                      <button
                        type="button"
                        onClick={resetPhotoStyle}
                        disabled={isPhotoStyleDefault}
                        className="absolute right-11 top-3 flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white/80 dark:disabled:text-white/25 dark:disabled:hover:bg-transparent"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('common:button.reset')}
                      </button>
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
                            borderRadius: `${photoStyle.borderRadius}px`,
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
                                value={photoWidthInput}
                                onChange={(e) => handlePhotoWidthChange(e.target.value)}
                                onBlur={commitPhotoWidth}
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
                                value={photoHeightInput}
                                onChange={(e) => handlePhotoHeightChange(e.target.value)}
                                onBlur={commitPhotoHeight}
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
                                if (option.key === 'circle') {
                                  setSelectedPhotoAspect('1:1');
                                  applyPhotoStyle({ height: photoStyle.width, borderRadius: option.value });
                                  return;
                                }
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
                    onChangeIcon={field === 'fullName' ? undefined : handleChangeIcon}
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

