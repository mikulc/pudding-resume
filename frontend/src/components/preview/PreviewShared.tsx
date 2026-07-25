import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppUI } from '../../context/ResumeContext';
import { resolveLayout } from '../../registry/layouts';
import { DEFAULT_PERSONAL_PHOTO_STYLE,getSystemModuleDefaultTitles,type PersonalPhotoStyle,type SectionKey } from '../../types/resume';

export function resolvePersonalPhotoStyle(style?: Partial<PersonalPhotoStyle>): PersonalPhotoStyle {
  const width = Number(style?.width);
  const height = Number(style?.height);
  const borderRadius = Number(style?.borderRadius);
  return {
    width: Number.isFinite(width) ? width : DEFAULT_PERSONAL_PHOTO_STYLE.width,
    height: Number.isFinite(height) ? height : DEFAULT_PERSONAL_PHOTO_STYLE.height,
    borderRadius: Number.isFinite(borderRadius) ? borderRadius : DEFAULT_PERSONAL_PHOTO_STYLE.borderRadius,
  };
}

export function useResumeModuleTitles(): Record<SectionKey, string> {
  useTranslation('resume');
  return getSystemModuleDefaultTitles();
}

export function SectionHeader({ title, sectionKey }: { title: string; sectionKey?: SectionKey }) {
  const { ui } = useAppUI();
  const layout = resolveLayout(ui.theme.layoutId);

  // Icon mode: round icon plus title text.
  if (layout.headerMode === 'icons' && sectionKey && layout.iconMap) {
    const icon = layout.iconMap[sectionKey] || layout.iconMap.summary;
    return (
      <div className="section-header select-none" data-section-header={sectionKey} data-page-section-header={sectionKey}>
        <span className="section-header-icon">
          {icon}
        </span>
        <span>{title}</span>
      </div>
    );
  }

  // Bar mode: default left accent bar.
  return (
    <div className="section-header select-none" data-section-header={sectionKey} data-page-section-header={sectionKey}>
      <span className="section-header-bar" />
      <span>{title}</span>
    </div>
  );
}

function useSectionClick(sectionKey: SectionKey) {
  const { ui, uiDispatch } = useAppUI();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ui.isSecondaryEditorOpen) return;
    uiDispatch({ type: 'SET_ACTIVE_SECTION', payload: sectionKey });
  };

  return handleClick;
}

export function ActiveSectionWrapper({
  sectionKey,
  children,
  className = '',
}: {
  sectionKey: SectionKey;
  children: React.ReactNode;
  className?: string;
}) {
  const handleClick = useSectionClick(sectionKey);

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer rounded-md ${className}`}
      data-page-section={sectionKey}
    >
      {children}
    </div>
  );
}

