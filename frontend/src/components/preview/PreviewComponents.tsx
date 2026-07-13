import React, { useRef, useState, useLayoutEffect, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume, useAppUI } from '../../context/ResumeContext';
import { useDiagnosisContext } from '../../context/DiagnosisContext';
import { useCardPreviewScope } from './ResumeCardPreviewProvider';
import { DiagnosisBoldText } from './diagnosis';
import {
  computeProtectedPageBreaks,
  collectPaginationBoundaries,
  MM_TO_PX,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  PAGE_GAP_PX,
} from './pagination';
import {
  SectionKey,
  WatermarkSettings,
  DEFAULT_SECTION_ORDER,
  DEFAULT_PERSONAL_FIELD_ORDER,
  getPersonalFieldLabels,
  getSystemModuleDefaultTitles,
  DEFAULT_PERSONAL_PHOTO_STYLE,
  PersonalPhotoStyle,
} from '../../types/resume';
import { getLayoutCSS, resolveLayout } from '../../registry/layouts';
import { getFontStack } from '../../config/fonts';
import {
  Tag,
  Link,
  Globe,
  MessageCircle,
  Heart,
  Star,
  Home,
  Code,
  Calendar,
  Camera,
  Music,
  Bookmark,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  User,
  GraduationCap,
  Award,
  FileText,
  BookOpen,
  ExternalLink,
  Share2,
  Settings,
  Clock,
  CheckCircle,
  Zap,
  Coffee,
  Cloud,
  Database,
  Palette,
  Rocket,
  Target,
  ThumbsUp,
  Bell,
  Hash,
  AtSign,
  IdCard,
  CircleUserRound,
  School,
  ScrollText,
  Building2,
  Wrench,
  Languages,
  FolderGit2,
  Trophy,
  Medal,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Github,
  Gamepad2,
  Laptop,
  Cpu,
  Server,
  Terminal,
  Layers,
} from '../icons';
import { renderMarkdownContent } from '../../utils/markdown';

// Preview component map: section key to component type.
const PREVIEW_MAP: Record<SectionKey, React.ComponentType> = {
  personal: PersonalInfoPreview,
  summary: SummaryPreview,
  education: EducationPreview,
  skills: SkillsPreview,
  work: WorkExperiencePreview,
  projects: ProjectPreview,
  honors: HonorPreview,
  certifications: CertificationPreview,
  portfolio: PortfolioPreview,
};

const SIDEBAR_LAYOUT_SECTION_KEYS = new Set<SectionKey>([
  'personal',
  'skills',
  'summary',
  'certifications',
  'portfolio',
]);

function resolvePersonalPhotoStyle(style?: Partial<PersonalPhotoStyle>): PersonalPhotoStyle {
  const width = Number(style?.width);
  const height = Number(style?.height);
  const borderRadius = Number(style?.borderRadius);
  return {
    width: Number.isFinite(width) ? width : DEFAULT_PERSONAL_PHOTO_STYLE.width,
    height: Number.isFinite(height) ? height : DEFAULT_PERSONAL_PHOTO_STYLE.height,
    borderRadius: Number.isFinite(borderRadius) ? borderRadius : DEFAULT_PERSONAL_PHOTO_STYLE.borderRadius,
  };
}

function useResumeModuleTitles(): Record<SectionKey, string> {
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

function ActiveSectionWrapper({
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

export function PersonalInfoPreview() {
  const { t, i18n } = useTranslation('resume');
  const { t: tEditor } = useTranslation('editor');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { personalInfo } = data;
  const layout = resolveLayout(ui.theme.layoutId);
  const defaultFieldLabels = getPersonalFieldLabels();
  const moduleTitles = useResumeModuleTitles();
  const scopeClass = useCardPreviewScope();

  // 浠庢敞鍐岃〃璇诲彇鑱旂郴鏂瑰紡鍥炬爣 class
  const contactIconClass = layout.personalInfoClass || 'text-gray-400';

  // 闅愯棌瀛楁
  const hiddenFields = personalInfo.hiddenFields || [];
  const isHidden = (field: string) => hiddenFields.includes(field);

  // 鏍规嵁甯冨眬鍐冲畾濮撳悕灞曠ず鏍峰紡
  const isOrdrin = layout.id === 'ordrin';
  const isCyanblu = layout.id === 'cyanblu';
  const isLeftSidebarTwoColumn = layout.id === 'left-sidebar-two-column';
  const isCenterline = layout.id === 'centerline';
  const isClassicHorizontal = layout.id === 'classic-horizontal';
  const isBlueprintIcons = layout.id === 'blueprint-icons';
  const isMonochromeRings = layout.id === 'monochrome-rings';
  const isTealRibbonWave = layout.id === 'teal-ribbon-wave';
  const isBlueBannerIcons = layout.id === 'blue-banner-icons';
  const isAzureSidebar = layout.id === 'azure-sidebar';

  // Track image load errors to fall back to placeholder
  const [photoError, setPhotoError] = useState(false);

  const displayMode = personalInfo.displayMode || 'icon';
  const isTextMode = displayMode === 'text';
  const photoLayout = personalInfo.photoLayout || 'right';
  const photoStyle = resolvePersonalPhotoStyle(personalInfo.photoStyle);

  const hasPhoto = !!personalInfo.photoUrl;
  // Editing mode: scopeClass is null outside ResumeCardPreviewProvider.
  const isEditing = scopeClass === null;
  // 浠呭湪鏈夌収鐗囨垨缂栬緫妯″紡涓嬫樉绀虹収鐗囧尯鍩燂紱姝ｅ紡灞曠ず鏃舵棤鐓х墖鍒欎笉鏄剧ず
  const showPhotoArea = !isHidden('photo') && (hasPhoto || isEditing);

  // 澶村儚鍖哄煙
  const photoEl = hasPhoto ? (
    <div
      className="personal-photo overflow-hidden shrink-0"
      style={{ width: photoStyle.width, height: photoStyle.height, borderRadius: photoStyle.borderRadius }}
    >
      {!photoError ? (
        <img
          src={personalInfo.photoUrl}
          alt={t('photo.alt')}
          className="w-full h-full object-cover"
          onError={() => setPhotoError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gray-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  ) : (
    <div
      className="personal-photo-placeholder overflow-hidden shrink-0"
      data-photo-placeholder="true"
      style={{ width: photoStyle.width, height: photoStyle.height, borderRadius: photoStyle.borderRadius }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 text-[10px] leading-tight">
        <Camera className="w-5 h-5 text-gray-300" />
        <span>{tEditor('photo.upload')}</span>
      </div>
    </div>
  );

  // 淇℃伅鍖哄煙
  const isPhotoLeft = photoLayout === 'left';
  const customFields = personalInfo.customFields || {};
  const configuredFieldOrder = personalInfo.fieldOrder || DEFAULT_PERSONAL_FIELD_ORDER;
  const customFieldKeys = Object.keys(customFields);
  const fieldOrder = [
    ...configuredFieldOrder,
    ...customFieldKeys.filter((field) => !configuredFieldOrder.includes(field)),
  ];
  const showFullName = !isHidden('fullName') && fieldOrder.includes('fullName');

  const iconMap = personalInfo.iconMap || {};
  const fieldLabels = personalInfo.fieldLabels || {};
  const getFieldLabel = (field: string) => fieldLabels[field]?.trim() || defaultFieldLabels[field] || field;

  // 鍥炬爣搴擄紙涓庣紪杈戝櫒 ICON_LIBRARY 閿悕涓€鑷达級
  const contactIconSize = 'w-4 h-4 shrink-0';
  const previewIconLib: Record<string, React.ReactNode> = {
    tag: <Tag className={`${contactIconSize} ${contactIconClass}`} />,
    link: <Link className={`${contactIconSize} ${contactIconClass}`} />,
    globe: <Globe className={`${contactIconSize} ${contactIconClass}`} />,
    messageCircle: <MessageCircle className={`${contactIconSize} ${contactIconClass}`} />,
    heart: <Heart className={`${contactIconSize} ${contactIconClass}`} />,
    star: <Star className={`${contactIconSize} ${contactIconClass}`} />,
    home: <Home className={`${contactIconSize} ${contactIconClass}`} />,
    code: <Code className={`${contactIconSize} ${contactIconClass}`} />,
    calendar: <Calendar className={`${contactIconSize} ${contactIconClass}`} />,
    camera: <Camera className={`${contactIconSize} ${contactIconClass}`} />,
    music: <Music className={`${contactIconSize} ${contactIconClass}`} />,
    bookmark: <Bookmark className={`${contactIconSize} ${contactIconClass}`} />,
    phone: <Phone className={`${contactIconSize} ${contactIconClass}`} />,
    mail: <Mail className={`${contactIconSize} ${contactIconClass}`} />,
    mapPin: <MapPin className={`${contactIconSize} ${contactIconClass}`} />,
    briefcase: <Briefcase className={`${contactIconSize} ${contactIconClass}`} />,
    user: <User className={`${contactIconSize} ${contactIconClass}`} />,
    graduationCap: <GraduationCap className={`${contactIconSize} ${contactIconClass}`} />,
    award: <Award className={`${contactIconSize} ${contactIconClass}`} />,
    fileText: <FileText className={`${contactIconSize} ${contactIconClass}`} />,
    bookOpen: <BookOpen className={`${contactIconSize} ${contactIconClass}`} />,
    externalLink: <ExternalLink className={`${contactIconSize} ${contactIconClass}`} />,
    share2: <Share2 className={`${contactIconSize} ${contactIconClass}`} />,
    settings: <Settings className={`${contactIconSize} ${contactIconClass}`} />,
    clock: <Clock className={`${contactIconSize} ${contactIconClass}`} />,
    checkCircle: <CheckCircle className={`${contactIconSize} ${contactIconClass}`} />,
    zap: <Zap className={`${contactIconSize} ${contactIconClass}`} />,
    coffee: <Coffee className={`${contactIconSize} ${contactIconClass}`} />,
    cloud: <Cloud className={`${contactIconSize} ${contactIconClass}`} />,
    database: <Database className={`${contactIconSize} ${contactIconClass}`} />,
    palette: <Palette className={`${contactIconSize} ${contactIconClass}`} />,
    rocket: <Rocket className={`${contactIconSize} ${contactIconClass}`} />,
    target: <Target className={`${contactIconSize} ${contactIconClass}`} />,
    thumbsUp: <ThumbsUp className={`${contactIconSize} ${contactIconClass}`} />,
    bell: <Bell className={`${contactIconSize} ${contactIconClass}`} />,
    hash: <Hash className={`${contactIconSize} ${contactIconClass}`} />,
    atSign: <AtSign className={`${contactIconSize} ${contactIconClass}`} />,
    idCard: <IdCard className={`${contactIconSize} ${contactIconClass}`} />,
    circleUserRound: <CircleUserRound className={`${contactIconSize} ${contactIconClass}`} />,
    school: <School className={`${contactIconSize} ${contactIconClass}`} />,
    scrollText: <ScrollText className={`${contactIconSize} ${contactIconClass}`} />,
    building2: <Building2 className={`${contactIconSize} ${contactIconClass}`} />,
    wrench: <Wrench className={`${contactIconSize} ${contactIconClass}`} />,
    languages: <Languages className={`${contactIconSize} ${contactIconClass}`} />,
    folderGit2: <FolderGit2 className={`${contactIconSize} ${contactIconClass}`} />,
    trophy: <Trophy className={`${contactIconSize} ${contactIconClass}`} />,
    medal: <Medal className={`${contactIconSize} ${contactIconClass}`} />,
    linkedin: <Linkedin className={`${contactIconSize} ${contactIconClass}`} />,
    twitter: <Twitter className={`${contactIconSize} ${contactIconClass}`} />,
    facebook: <Facebook className={`${contactIconSize} ${contactIconClass}`} />,
    instagram: <Instagram className={`${contactIconSize} ${contactIconClass}`} />,
    github: <Github className={`${contactIconSize} ${contactIconClass}`} />,
    gamepad2: <Gamepad2 className={`${contactIconSize} ${contactIconClass}`} />,
    laptop: <Laptop className={`${contactIconSize} ${contactIconClass}`} />,
    cpu: <Cpu className={`${contactIconSize} ${contactIconClass}`} />,
    server: <Server className={`${contactIconSize} ${contactIconClass}`} />,
    terminal: <Terminal className={`${contactIconSize} ${contactIconClass}`} />,
    layers: <Layers className={`${contactIconSize} ${contactIconClass}`} />,
  };

  /** Resolve the field icon from iconMap first, then fall back to the default icon. */
  const getFieldIcon = (field: string, defaultIcon: React.ReactNode): React.ReactNode => {
    const customKey = iconMap[field];
    return customKey ? (previewIconLib[customKey] || defaultIcon) : defaultIcon;
  };

  /** Built-in field value, icon, and text label map. */
  const iconClass = `w-4 h-4 shrink-0 ${contactIconClass}`;
  const fieldConfig: Record<string, { value: string; icon: React.ReactNode; textLabel: string } | undefined> = {
    phone: {
      value: personalInfo.phone,
      icon: <Phone className={iconClass} />,
      textLabel: getFieldLabel('phone'),
    },
    email: {
      value: personalInfo.email,
      icon: <Mail className={iconClass} />,
      textLabel: getFieldLabel('email'),
    },
    jobStatus: {
      value: personalInfo.jobStatus || '',
      icon: <Briefcase className={iconClass} />,
      textLabel: getFieldLabel('jobStatus'),
    },
    jobTarget: {
      value: personalInfo.jobTarget || '',
      icon: <Target className={iconClass} />,
      textLabel: getFieldLabel('jobTarget'),
    },
    location: {
      value: personalInfo.location || '',
      icon: <MapPin className={iconClass} />,
      textLabel: getFieldLabel('location'),
    },
  };

  // Filter visible fields from fieldOrder, including built-in and custom fields.
  const visibleFields = fieldOrder.filter((f) => {
    if (isHidden(f)) return false;
    const builtin = fieldConfig[f];
    if (builtin) return !!builtin.value;
    // 鑷畾涔夊瓧娈碉細鍙 key 瀛樺湪灏辩畻鍙锛堝厑璁哥┖鍊硷級
    return f in customFields;
  });
  // Keep two primary fields on the first row; wrap the rest to avoid truncating custom fields.
  const topFields = visibleFields.slice(0, 2);
  const bottomFields = visibleFields.slice(2);

  /** Render one field. */
  const renderField = (field: string) => {
    const cfg = fieldConfig[field];
    if (cfg) {
      return isTextMode ? (
        <span key={field} className="break-all whitespace-nowrap" data-export-nowrap="true">
          <span className="text-gray-500">{cfg.textLabel}: </span>{cfg.value}
        </span>
      ) : (
        <div key={field} className="flex items-center gap-2 min-w-0">
          {getFieldIcon(field, cfg.icon)}
          <span className="break-all" data-export-nowrap="true">{cfg.value}</span>
        </div>
      );
    }
    // Custom field.
    const customValue = customFields[field];
    if (!customValue) return null;
    const defaultCustomIcon = iconMap[field]
      ? (previewIconLib[iconMap[field]] || previewIconLib.tag)
      : previewIconLib.tag;
    return isTextMode ? (
      <span key={field} className="break-all whitespace-nowrap" data-export-nowrap="true">
        <span className="text-gray-500">{field}: </span>{customValue}
      </span>
    ) : (
      <div key={field} className="flex items-center gap-2 min-w-0">
        {getFieldIcon(field, defaultCustomIcon)}
        <span className="break-all" data-export-nowrap="true">{customValue}</span>
      </div>
    );
  };

  const renderValueOnlyField = (field: string, className: string) => {
    const value = fieldConfig[field]?.value ?? customFields[field];
    if (!value) return null;
    return (
      <span key={field} className={`${className} break-all`} data-export-nowrap="true">
        {value}
      </span>
    );
  };

  const renderClassicHorizontalField = (field: string) => (
    renderValueOnlyField(field, 'classic-horizontal-contact-item')
  );

  const renderBlueprintIconsField = (field: string) => (
    renderValueOnlyField(field, 'blueprint-icons-contact-item')
  );

  const renderMonochromeRingsField = (field: string) => (
    renderValueOnlyField(field, 'monochrome-rings-contact-item')
  );

  const renderTealRibbonWaveField = (field: string) => (
    renderValueOnlyField(field, 'teal-ribbon-wave-contact-item')
  );

  const renderBlueBannerIconsField = (field: string) => (
    renderValueOnlyField(field, 'blue-banner-icons-contact-item')
  );

  const renderLeftSidebarTwoColumnField = (field: string) => {
    const cfg = fieldConfig[field];
    const value = cfg ? cfg.value : customFields[field];
    if (!value) return null;
    const label = cfg?.textLabel ?? field;
    const defaultCustomIcon = iconMap[field]
      ? (previewIconLib[iconMap[field]] || previewIconLib.tag)
      : previewIconLib.tag;
    const icon = cfg ? getFieldIcon(field, cfg.icon) : getFieldIcon(field, defaultCustomIcon);

    return isTextMode ? (
      <div key={field} className="left-sidebar-two-column-contact-item break-words">
        <span className="left-sidebar-two-column-contact-label">{label}: </span>
        <span className="min-w-0 max-w-full break-all">{value}</span>
      </div>
    ) : (
      <div key={field} className="left-sidebar-two-column-contact-item left-sidebar-two-column-contact-item-icon min-w-0">
        {icon}
        <span className="min-w-0 max-w-full flex-1 break-all">{value}</span>
      </div>
    );
  };

  const renderAzureSidebarField = (field: string) => {
    const cfg = fieldConfig[field];
    const value = cfg ? cfg.value : customFields[field];
    if (!value) return null;
    const label = cfg?.textLabel ?? field;
    const defaultCustomIcon = iconMap[field]
      ? (previewIconLib[iconMap[field]] || previewIconLib.tag)
      : previewIconLib.tag;
    const icon = cfg ? getFieldIcon(field, cfg.icon) : getFieldIcon(field, defaultCustomIcon);

    return isTextMode ? (
      <div key={field} className="azure-sidebar-contact-item break-words">
        <span className="azure-sidebar-contact-label">{label}: </span>
        <span className="min-w-0 max-w-full break-all">{value}</span>
      </div>
    ) : (
      <div key={field} className="azure-sidebar-contact-item azure-sidebar-contact-item-icon min-w-0">
        {icon}
        <span className="min-w-0 max-w-full flex-1 break-all">{value}</span>
      </div>
    );
  };

  if (isAzureSidebar) {
    const contactFields = visibleFields.filter((field) => (
      field !== 'fullName' && field !== 'jobTarget' && field !== 'jobStatus'
    ));
    const isZh = i18n.language.toLowerCase().startsWith('zh');
    const contactTitle = isZh ? '联系方式' : 'Contact';
    const objectiveTitle = isZh ? '求职意向' : 'Objective';

    return (
      <ActiveSectionWrapper sectionKey="personal" className="azure-sidebar-personal">
        {showPhotoArea && <div className="azure-sidebar-photo">{photoEl}</div>}
        {showFullName && (
          <h1 className="azure-sidebar-name break-words">
            {personalInfo.fullName || t('placeholder.previewName')}
          </h1>
        )}
        {contactFields.length > 0 && (
          <div className="azure-sidebar-block">
            <h2 className="azure-sidebar-block-title">{contactTitle}</h2>
            <div className="azure-sidebar-contact-list">
              {contactFields.map(renderAzureSidebarField)}
            </div>
          </div>
        )}
        {(personalInfo.jobTarget || personalInfo.jobStatus) && (
          <div className="azure-sidebar-block">
            <h2 className="azure-sidebar-block-title">{objectiveTitle}</h2>
            {personalInfo.jobTarget && !isHidden('jobTarget') && (
              <div className="azure-sidebar-objective break-words">{personalInfo.jobTarget}</div>
            )}
            {personalInfo.jobStatus && !isHidden('jobStatus') && (
              <div className="azure-sidebar-objective break-words">{personalInfo.jobStatus}</div>
            )}
          </div>
        )}
      </ActiveSectionWrapper>
    );
  }

  if (isLeftSidebarTwoColumn) {
    const contactFields = visibleFields.filter((field) => (
      field !== 'fullName' && field !== 'jobTarget' && field !== 'jobStatus'
    ));

    return (
      <ActiveSectionWrapper sectionKey="personal" className="left-sidebar-two-column-personal">
        {showPhotoArea && <div className="left-sidebar-two-column-photo">{photoEl}</div>}
        {showFullName && (
          <h1 className="left-sidebar-two-column-name break-words">
            {personalInfo.fullName || t('placeholder.previewName')}
          </h1>
        )}
        {personalInfo.jobTarget && !isHidden('jobTarget') && (
          <div className="left-sidebar-two-column-role break-words">{personalInfo.jobTarget}</div>
        )}
        {personalInfo.jobStatus && !isHidden('jobStatus') && (
          <div className="left-sidebar-two-column-status break-words">{personalInfo.jobStatus}</div>
        )}
        {contactFields.length > 0 && (
          <div className="left-sidebar-two-column-sidebar-block">
            <h2 className="left-sidebar-two-column-sidebar-title">{moduleTitles.personal}</h2>
            <div className="left-sidebar-two-column-contact-list">
              {contactFields.map(renderLeftSidebarTwoColumnField)}
            </div>
          </div>
        )}
      </ActiveSectionWrapper>
    );
  }

  const renderContactField = isBlueBannerIcons
    ? renderBlueBannerIconsField
    : isTealRibbonWave
      ? renderTealRibbonWaveField
      : isMonochromeRings
        ? renderMonochromeRingsField
        : isBlueprintIcons
          ? renderBlueprintIconsField
          : isClassicHorizontal
            ? renderClassicHorizontalField
            : renderField;

  const personalInfoClassName = [
    'flex-1 min-w-0',
    isPhotoLeft ? 'text-right' : '',
    isCenterline ? 'centerline-personal-info' : '',
    isBlueprintIcons ? 'blueprint-icons-personal-info' : '',
    isMonochromeRings ? 'monochrome-rings-personal-info' : '',
    isTealRibbonWave ? 'teal-ribbon-wave-personal-info' : '',
    isBlueBannerIcons ? 'blue-banner-icons-personal-info' : '',
  ].filter(Boolean).join(' ');

  const nameClassName = [
    'break-words',
    isBlueBannerIcons ? 'blue-banner-icons-name' : '',
    isTealRibbonWave ? 'teal-ribbon-wave-name' : '',
    isMonochromeRings ? 'monochrome-rings-name' : '',
    isBlueprintIcons ? 'blueprint-icons-name' : '',
    !isBlueBannerIcons && !isTealRibbonWave && !isMonochromeRings && !isBlueprintIcons && isCenterline ? 'centerline-name mb-3' : '',
    !isBlueBannerIcons && !isTealRibbonWave && !isMonochromeRings && !isBlueprintIcons && !isCenterline && isOrdrin ? 'ordrin-branding mb-3' : '',
    !isBlueBannerIcons && !isTealRibbonWave && !isMonochromeRings && !isBlueprintIcons && !isCenterline && !isOrdrin && isCyanblu ? 'text-[2em] font-bold text-[#1a1a1a] mb-3' : '',
    !isBlueBannerIcons && !isTealRibbonWave && !isMonochromeRings && !isBlueprintIcons && !isCenterline && !isOrdrin && !isCyanblu ? 'text-[2em] font-bold text-gray-900 mb-3' : '',
  ].filter(Boolean).join(' ');

  const infoEl = (
    <div className={personalInfoClassName}>
      {showFullName && (
        <h1 className={nameClassName}>
          {personalInfo.fullName || t('placeholder.previewName')}
        </h1>
      )}
      {topFields.length > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-3 ${isPhotoLeft ? 'justify-end' : ''}`}>
          {topFields.map(renderContactField)}
        </div>
      )}
      {bottomFields.length > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-2 ${isPhotoLeft ? 'justify-end' : ''}`}>
          {bottomFields.map(renderContactField)}
        </div>
      )}
    </div>
  );

  return (
    <ActiveSectionWrapper sectionKey="personal" className={`mb-6 ${isCenterline ? 'centerline-personal' : ''} ${isBlueprintIcons ? 'blueprint-icons-personal' : ''} ${isMonochromeRings ? 'monochrome-rings-personal' : ''} ${isTealRibbonWave ? 'teal-ribbon-wave-personal' : ''} ${isBlueBannerIcons ? 'blue-banner-icons-personal' : ''}`}>
      <div
        className={`flex items-start gap-4 ${isPhotoLeft ? 'flex-row-reverse' : ''}`}
      >
        {infoEl}
        {showPhotoArea && photoEl}
      </div>
    </ActiveSectionWrapper>
  );
}

export function EducationPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const moduleTitles = useResumeModuleTitles();
  const titleLayout = ui.theme.titleLayout ?? 'compact';

  if (!data.education?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="education" className="mb-5">
      <SectionHeader title={data.sectionTitles?.education ?? moduleTitles.education} sectionKey="education" />
      {data.education.map((edu, i) => {
        const subtitle = [edu.major, edu.degree].filter(Boolean).join(' · ');
        const timeStr = `${edu.startDate} - ${edu.endDate}`;

        return (
          <div key={edu.id} className="mb-3" data-section="education" data-entry-index={i} data-page-entry>
            {titleLayout === 'three-column' ? (
              <div className="entry-title-row grid grid-cols-3 gap-2">
                <span className="entity-title truncate">{edu.school || t('placeholder.schoolName')}</span>
                <span className="text-gray-500 text-sm text-center truncate">{subtitle}</span>
                <span className="text-sm text-gray-500 text-right whitespace-nowrap">{timeStr}</span>
              </div>
            ) : titleLayout === 'stacked' ? (
              <div>
                <div className="entry-title-row flex justify-between gap-2">
                  <span className="entity-title">{edu.school || t('placeholder.schoolName')}</span>
                  <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{timeStr}</span>
                </div>
                {subtitle && <div className="text-gray-500 text-sm">{subtitle}</div>}
              </div>
            ) : (
              <div className="entry-title-row flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="entity-title">{edu.school || t('placeholder.schoolName')}</span>
                  <span className="text-gray-500 text-sm ml-2">{edu.major}</span>
                  {edu.degree && <span className="text-gray-400 text-sm ml-2">· {edu.degree}</span>}
                </div>
                <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">
                  {edu.startDate} - {edu.endDate}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </ActiveSectionWrapper>
  );
}

export function SkillsPreview() {
  const { data } = useResume();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();

  if (!data.skills?.trim()) return null;

  const lines = data.skills.split('\n');
  if (lines.length === 0) return null;

  const nonEmptyLines = lines.filter((line) => line !== '');
  if (nonEmptyLines.length === 0) return null;

  // Detect list lines.
  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;
  const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
  const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));

  if (hasNumberedLines || hasBulletedLines) {
    return (
      <ActiveSectionWrapper sectionKey="skills" className="mb-5">
        <SectionHeader title={data.sectionTitles?.skills ?? moduleTitles.skills} sectionKey="skills" />
        <ul data-section="skills" data-field="skills" className="list-none space-y-1">
          {lines.map((line, i) => {
            if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
            const numMatch = line.match(NUMBERED_RE);
            if (numMatch) {
              return (
                <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                  <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numMatch[1]}. </span>
                  <DiagnosisBoldText text={numMatch[2]} diagnoses={diagnoses} />
                </li>
              );
            }
            const bulletMatch = line.match(BULLET_RE);
            if (bulletMatch) {
              return (
                <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                  <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                  <DiagnosisBoldText text={bulletMatch[2]} diagnoses={diagnoses} />
                </li>
              );
            }
            return (
              <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                <DiagnosisBoldText text={line} diagnoses={diagnoses} />
              </li>
            );
          })}
        </ul>
      </ActiveSectionWrapper>
    );
  }

  // 鏃犲垪琛ㄦ爣璁帮細娓叉煋涓虹函鏂囨湰娈佃惤
  return (
    <ActiveSectionWrapper sectionKey="skills" className="mb-5">
      <SectionHeader title={data.sectionTitles?.skills ?? moduleTitles.skills} sectionKey="skills" />
      <div data-section="skills" data-field="skills" className="space-y-1">
        {lines.map((line, i) => {
          if (!line) return <p key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
          return (
            <p key={i} className="text-sm text-gray-700 break-words select-text whitespace-pre-wrap" data-page-atom data-page-splittable="true">
              <DiagnosisBoldText text={line} diagnoses={diagnoses} />
            </p>
          );
        })}
      </div>
    </ActiveSectionWrapper>
  );
}

export function WorkExperiencePreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();
  const titleLayout = ui.theme.titleLayout ?? 'compact';

  if (!data.workExperience?.length) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  return (
    <ActiveSectionWrapper sectionKey="work" className="mb-5">
      <SectionHeader title={data.sectionTitles?.work ?? moduleTitles.work} sectionKey="work" />
      {data.workExperience.map((work, i) => {
        const lines = (work.highlights ?? '').split('\n');
        const nonEmptyHighlights = lines.filter((line) => line !== '');
        const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
        const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
        const isListMode = hasNumberedLines || hasBulletedLines;

        const subtitle = [work.position, work.location].filter(Boolean).join(' · ');
        const timeStr = `${work.startDate} - ${work.endDate}`;

        return (
          <div key={work.id} className="mb-4" data-section="work" data-entry-index={i} data-page-entry>
            {titleLayout === 'three-column' ? (
              <div className="entry-title-row grid grid-cols-3 gap-2 mb-1">
                <span className="entity-title truncate">{work.company || t('placeholder.companyName')}</span>
                <span className="text-gray-500 text-sm text-center truncate">{subtitle}</span>
                <span className="text-sm text-gray-500 text-right whitespace-nowrap">{timeStr}</span>
              </div>
            ) : titleLayout === 'stacked' ? (
              <div className="mb-1">
                <div className="entry-title-row flex justify-between gap-2">
                  <span className="entity-title">{work.company || t('placeholder.companyName')}</span>
                  <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{timeStr}</span>
                </div>
                {subtitle && <div className="text-gray-500 text-sm">{subtitle}</div>}
              </div>
            ) : (
              <div className="entry-title-row flex justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <span className="entity-title">{work.company || t('placeholder.companyName')}</span>
                  <span className="text-gray-500 text-sm ml-2">{work.position}</span>
                  {work.location && <span className="text-gray-400 text-sm ml-2">· {work.location}</span>}
                </div>
                <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">
                  {work.startDate} - {work.endDate}
                </span>
              </div>
            )}
            {nonEmptyHighlights.length > 0 && (
              <ul
                data-section="work"
                data-entry-id={work.id}
                data-field="highlights"
                className="list-none space-y-1"
              >
                {lines.map((line, i) => {
                  if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
                  if (isListMode) {
                    const numMatch = line.match(NUMBERED_RE);
                    if (numMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numMatch[1]}. </span>
                          <DiagnosisBoldText text={numMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                    const bulletMatch = line.match(BULLET_RE);
                    if (bulletMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                          <DiagnosisBoldText text={bulletMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                  }
                  return (
                    <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                      <DiagnosisBoldText text={line} diagnoses={diagnoses} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </ActiveSectionWrapper>
  );
}

export function ProjectPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();
  const titleLayout = ui.theme.titleLayout ?? 'compact';

  if (!data.projects?.length) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  return (
    <ActiveSectionWrapper sectionKey="projects" className="mb-5">
      <SectionHeader title={data.sectionTitles?.projects ?? moduleTitles.projects} sectionKey="projects" />
      {data.projects.map((proj, i) => {
        const lines = (proj.highlights ?? '').split('\n');
        const nonEmptyProjHighlights = lines.filter((line) => line !== '');
        const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
        const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
        const isListMode = hasNumberedLines || hasBulletedLines;

        const timeBlock = (
          <div className="text-sm text-gray-500 text-right shrink-0 whitespace-nowrap">
            <div>{proj.startDate} - {proj.endDate}</div>
            {proj.link && (
              <div className="text-blue-500 text-xs">{proj.link}</div>
            )}
          </div>
        );

        return (
          <div key={proj.id} className="mb-4" data-section="projects" data-entry-index={i} data-page-entry>
            {titleLayout === 'three-column' ? (
              <div className="entry-title-row grid grid-cols-3 gap-2 mb-1">
                <span className="entity-title truncate">{proj.name || t('field.projectName')}</span>
                <span className="text-gray-500 text-sm text-center truncate">{proj.role}</span>
                <div className="text-sm text-gray-500 text-right whitespace-nowrap">
                  <div>{proj.startDate} - {proj.endDate}</div>
                  {proj.link && (
                    <div className="text-blue-500 text-xs truncate">{proj.link}</div>
                  )}
                </div>
              </div>
            ) : titleLayout === 'stacked' ? (
              <div className="mb-1">
                <div className="entry-title-row flex justify-between gap-2">
                  <span className="entity-title">{proj.name || t('field.projectName')}</span>
                  {timeBlock}
                </div>
                {proj.role && <div className="text-gray-500 text-sm">{proj.role}</div>}
              </div>
            ) : (
              <div className="entry-title-row flex justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <span className="entity-title">{proj.name || t('field.projectName')}</span>
                  <span className="text-gray-500 text-sm ml-2">{proj.role}</span>
                </div>
                {timeBlock}
              </div>
            )}
            {nonEmptyProjHighlights.length > 0 && (
              <ul
                data-section="projects"
                data-entry-id={proj.id}
                data-field="highlights"
                className="list-none space-y-1"
              >
                {lines.map((line, i) => {
                  if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
                  if (isListMode) {
                    const numMatch = line.match(NUMBERED_RE);
                    if (numMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numMatch[1]}. </span>
                          <DiagnosisBoldText text={numMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                    const bulletMatch = line.match(BULLET_RE);
                    if (bulletMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                          <DiagnosisBoldText text={bulletMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                  }
                  return (
                    <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                      <DiagnosisBoldText text={line} diagnoses={diagnoses} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </ActiveSectionWrapper>
  );
}

export function HonorPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const moduleTitles = useResumeModuleTitles();

  if (!data.honors?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="honors" className="mb-6">
      <SectionHeader title={data.sectionTitles?.honors ?? moduleTitles.honors} sectionKey="honors" />
      {data.honors.map((honor, i) => (
        <div key={honor.id} className="flex items-baseline justify-between gap-2 mb-2.5" data-section="honors" data-entry-index={i} data-page-entry>
          <span className="entity-title min-w-0">{honor.name || t('field.honorName')}</span>
          <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{honor.date}</span>
        </div>
      ))}
    </ActiveSectionWrapper>
  );
}

export function CertificationPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const moduleTitles = useResumeModuleTitles();

  if (!data.certifications?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="certifications" className="mb-6">
      <SectionHeader title={data.sectionTitles?.certifications ?? moduleTitles.certifications} sectionKey="certifications" />
      {data.certifications.map((cert, i) => (
        <div key={cert.id} className="flex items-baseline justify-between gap-2 mb-2.5" data-section="certifications" data-entry-index={i} data-page-entry>
          <span className="entity-title min-w-0">{cert.name || t('field.certName')}</span>
          <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{cert.date}</span>
        </div>
      ))}
    </ActiveSectionWrapper>
  );
}

export function SummaryPreview() {
  const { data } = useResume();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();

  if (!data.summary) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;
  const lines = data.summary.split('\n');
  const nonEmptySummaryLines = lines.filter((line) => line !== '');
  const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
  const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
  const isListMode = hasNumberedLines || hasBulletedLines;

  return (
    <ActiveSectionWrapper sectionKey="summary" className="mb-6">
      <SectionHeader title={data.sectionTitles?.summary ?? moduleTitles.summary} sectionKey="summary" />
      {nonEmptySummaryLines.length > 0 && (
        <ul
          data-section="summary"
          data-field="summary"
          className="list-none space-y-1"
        >
          {lines.map((line, i) => {
            if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
            if (isListMode) {
              const numMatch = line.match(NUMBERED_RE);
              if (numMatch) {
                return (
                  <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                    <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numMatch[1]}. </span>
                    <DiagnosisBoldText text={numMatch[2]} diagnoses={diagnoses} />
                  </li>
                );
              }
              const bulletMatch = line.match(BULLET_RE);
              if (bulletMatch) {
                return (
                  <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                    <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                    <DiagnosisBoldText text={bulletMatch[2]} diagnoses={diagnoses} />
                  </li>
                );
              }
            }
            return (
              <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                <DiagnosisBoldText text={line} diagnoses={diagnoses} />
              </li>
            );
          })}
        </ul>
      )}
    </ActiveSectionWrapper>
  );
}

export function PortfolioPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();

  if (!data.portfolio?.length) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  return (
    <ActiveSectionWrapper sectionKey="portfolio" className="mb-6">
      <SectionHeader title={data.sectionTitles?.portfolio ?? moduleTitles.portfolio} sectionKey="portfolio" />
      {data.portfolio.map((item, i) => {
        const lines = (item.description ?? '').split('\n');
        const nonEmptyDescLines = lines.filter((line) => line !== '');
        const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
        const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
        const isListMode = hasNumberedLines || hasBulletedLines;

        return (
          <div key={item.id} className="mb-4" data-section="portfolio" data-entry-index={i} data-page-entry>
            <div className="mb-1.5">
              <span className="entity-title">{item.name || t('field.portfolioName')}</span>
              {item.link && (
                <span className="text-blue-500 text-sm ml-2">{item.link}</span>
              )}
            </div>
            {nonEmptyDescLines.length > 0 && (
              <ul
                data-section="portfolio"
                data-entry-id={item.id}
                data-field="description"
                className="list-none space-y-1"
              >
                {lines.map((line, i) => {
                  if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
                  if (isListMode) {
                    const numMatch = line.match(NUMBERED_RE);
                    if (numMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numMatch[1]}. </span>
                          <DiagnosisBoldText text={numMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                    const bulletMatch = line.match(BULLET_RE);
                    if (bulletMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                          <DiagnosisBoldText text={bulletMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                  }
                  return (
                    <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                      <DiagnosisBoldText text={line} diagnoses={diagnoses} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </ActiveSectionWrapper>
  );
}

/** 鑷畾涔夋ā鍧楅瑙堬細浣跨敤 SectionHeader + Markdown 鍐呭娓叉煋 */
function CustomSectionPreview({ sectionKey }: { sectionKey: string }) {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const customSection = data.customSections?.find((cs) => cs.id === sectionKey);

  if (!customSection || !customSection.content?.trim()) return null;

  return (
    <ActiveSectionWrapper sectionKey={sectionKey} className="mb-6">
      <SectionHeader title={customSection.name || t('module.custom')} sectionKey={sectionKey} />
      <div data-section={sectionKey} data-field="content">
        {renderMarkdownContent(customSection.content)}
      </div>
    </ActiveSectionWrapper>
  );
}

/** 姘村嵃瑕嗙洊灞傦細鍦ㄧ焊寮犱笂骞抽摵鍊炬枩鐨勫崐閫忔槑鏂囧瓧 */
function WatermarkOverlay({ settings }: { settings: WatermarkSettings }) {
  const cells = useMemo(() => {
    const densityMap = {
      low: { cols: 3, rows: 3 },
      medium: { cols: 4, rows: 4 },
      high: { cols: 5, rows: 6 },
    };
    const { cols, rows } = densityMap[settings.density];
    const result: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({
          x: (c * 100) / Math.max(cols - 1, 1),
          y: (r * 100) / Math.max(rows - 1, 1),
        });
      }
    }
    return result;
  }, [settings.density]);

  return (
    <div
      data-watermark-overlay="true"
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}
    >
      {cells.map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) rotate(${settings.rotation}deg)`,
            fontSize: `${settings.fontSize}px`,
            color: settings.color,
            opacity: settings.opacity,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {settings.content}
        </div>
      ))}
    </div>
  );
}

interface ResumePreviewProps {
  viewportWidth?: number;
  zoom?: number;
  onPageCountChange?: (numPages: number) => void;
  disablePagination?: boolean;
}

const SECTION_ANIM_DURATION = 'duration-500';

function escapeCssAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function scopeResumePaperCSS(css: string, layoutId: string, scopeClass?: string | null): string {
  const paperSelector = `.resume-paper[data-layout="${escapeCssAttribute(layoutId)}"]`;
  const scopedPaperSelector = scopeClass ? `.${scopeClass} ${paperSelector}` : paperSelector;
  return css.replace(/(\.resume-paper)(?![_\w-])/g, scopedPaperSelector);
}

/** Animated section wrapper using grid 0fr/1fr for smooth collapse and expand. */
function AnimatedSection({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`transition-all ${SECTION_ANIM_DURATION} ease-in-out`}
      style={{
        display: 'grid',
        gridTemplateRows: hidden ? '0fr' : '1fr',
        opacity: hidden ? 0 : 1,
      }}
    >
      <div className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function ResumePreview({ viewportWidth = 0, zoom = 1, onPageCountChange, disablePagination = false }: ResumePreviewProps) {
  const { ui } = useAppUI();
  const { data } = useResume();
  const { theme } = ui;
  const hiddenSections = data.hiddenSections ?? [];
  const scopeClass = useCardPreviewScope();

  const [needsMeasure, setNeedsMeasure] = useState(true);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
  const measureFlowRef = useRef<HTMLDivElement>(null);
  const layout = resolveLayout(theme.layoutId);
  const isSidebarLayout = layout.contentMode === 'sidebar';

  // Use a measurement copy without hiddenSections so hide/show changes do not
  // force remounting and break CSS transitions.
  // The measured DOM should stay mounted across visibility changes.
  const measureData = useMemo(() => {
    const { hiddenSections: _, ...rest } = data;
    return rest;
  }, [data]);

  const colorMap: Record<string, { bg: string; border: string; tagBg: string; tagText: string }> = {
    blue: { bg: '#DBEAFE', border: '#3B82F6', tagBg: '#EFF6FF', tagText: '#2563EB' },
    gray: { bg: '#F3F4F6', border: '#6B7280', tagBg: '#F9FAFB', tagText: '#4B5563' },
    black: { bg: '#E5E7EB', border: '#374151', tagBg: '#F3F4F6', tagText: '#1F2937' },
  };

  const colors = theme.colorTheme === 'custom'
    ? (theme.customColors || colorMap.blue)
    : (colorMap[theme.colorTheme] || colorMap.blue);

  // Mark for re-measurement when data or theme changes; keep old offsets to avoid flicker.
  const prevDepKey = useRef('');
  useLayoutEffect(() => {
    if (disablePagination) {
      setPageOffsets([0]);
      setNeedsMeasure(false);
      return;
    }
    const depKey = JSON.stringify(measureData) + '|' + theme.pageMargin + '|' + theme.lineSpacing + '|' + theme.fontSize + '|' + theme.layoutId + '|' + theme.fontFamily + '|' + theme.titleLayout + '|' + theme.entryTitleFontSize + '|' + theme.sectionTitleFontSize;
    if (depKey !== prevDepKey.current) {
      prevDepKey.current = depKey;
      setNeedsMeasure(true);
    }
  }, [disablePagination, measureData, theme.pageMargin, theme.lineSpacing, theme.fontSize, theme.layoutId, theme.fontFamily, theme.titleLayout, theme.entryTitleFontSize, theme.sectionTitleFontSize]);

  const pageContentHeight = (A4_HEIGHT_MM - theme.pageMargin * 2) * MM_TO_PX;

  // Measure the continuous offscreen flow and compute protected page breaks.
  // 1) Render all content into an offscreen continuous flow.
  // 2) Query DOM boundaries for entries and sections as valid break points.
  // 3) Pick the break closest to page capacity to avoid clipping text.
  useLayoutEffect(() => {
    if (!needsMeasure || disablePagination) return;

    const raf = requestAnimationFrame(() => {
      const flowRoot = measureFlowRef.current;
      if (!flowRoot) {
        return;
      }
      const measuredHeight = flowRoot.scrollHeight;
      const flowRootTop = flowRoot.getBoundingClientRect().top;
      const totalHeight = isSidebarLayout
        ? Array.from(flowRoot.querySelectorAll<HTMLElement>('[data-page-section]')).reduce((contentBottom, section) => {
            return Math.max(contentBottom, section.getBoundingClientRect().bottom - flowRootTop);
          }, 0)
        : measuredHeight;
      if (totalHeight === 0) {
        setPageOffsets([0]);
        setNeedsMeasure(false);
        return;
      }

      const { breakPoints, internalBreakPoints, protectedRanges } = collectPaginationBoundaries(flowRoot, totalHeight, pageContentHeight);
      const newPageOffsets = computeProtectedPageBreaks(breakPoints, protectedRanges, totalHeight, pageContentHeight, internalBreakPoints);
      setPageOffsets(newPageOffsets);
      setNeedsMeasure(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [disablePagination, isSidebarLayout, needsMeasure, pageContentHeight]);

  // 椤垫暟鍙樺寲鏃堕€氱煡鐖剁粍浠讹紙渚濊禆 pageOffsets 鑰岄潪 numPages锛岀‘淇濇瘡娆℃祴閲忛兘閫氱煡锛屽嵆浣块〉鏁颁笉鍙橈級
  const numPages = pageOffsets.length > 1 ? pageOffsets.length - 1 : 0;
  useEffect(() => {
    onPageCountChange?.(pageOffsets.length > 1 ? pageOffsets.length - 1 : 0);
  }, [pageOffsets, onPageCountChange]);

  // Build preview section list from sectionOrder, including built-in and custom sections.
  const sectionInfos = useMemo(() => {
    const order = data.sectionOrder ?? DEFAULT_SECTION_ORDER;
    const customSections = data.customSections ?? [];
    return order
      .filter((key) => PREVIEW_MAP[key] || customSections.some((cs) => cs.id === key))
      .map((key) => {
        const Comp = PREVIEW_MAP[key];
        if (Comp) return { key, component: <Comp /> };
        return { key, component: <CustomSectionPreview sectionKey={key} /> };
      });
  }, [data.sectionOrder, data.customSections]);

  const renderSectionFlow = (
    sections: typeof sectionInfos,
    animated: boolean,
  ) => sections.map((s) => (
    animated ? (
      <AnimatedSection key={s.key} hidden={hiddenSections.includes(s.key)}>
        {s.component}
      </AnimatedSection>
    ) : (
      <React.Fragment key={s.key}>
        {s.component}
      </React.Fragment>
    )
  ));

  const renderFlowContent = (
    sections: typeof sectionInfos,
    animated: boolean,
  ) => {
    if (!isSidebarLayout) {
      return renderSectionFlow(sections, animated);
    }

    const sidebarSectionKeys = layout.sidebarSections
      ? new Set<SectionKey>(layout.sidebarSections)
      : SIDEBAR_LAYOUT_SECTION_KEYS;
    const sidebarSections = sections.filter((s) => sidebarSectionKeys.has(s.key));
    const mainSections = sections.filter((s) => !sidebarSectionKeys.has(s.key));

    return (
      <>
        <aside className="left-sidebar-two-column-sidebar">
          {renderSectionFlow(sidebarSections, animated)}
        </aside>
        <main className="left-sidebar-two-column-main">
          {renderSectionFlow(mainSections, animated)}
        </main>
      </>
    );
  };

  const paperStyle: React.CSSProperties & {
    '--resume-content-height': string;
    '--resume-page-margin': string;
    '--resume-line-spacing': number;
    '--personal-photo-height': string;
  } = {
    padding: isSidebarLayout ? 0 : `${theme.pageMargin}mm`,
    fontSize: `${theme.fontSize}px`,
    lineHeight: theme.lineSpacing,
    fontFamily: getFontStack(theme.fontFamily),
    boxSizing: 'border-box',
    '--resume-content-height': `${pageContentHeight}px`,
    '--resume-page-margin': `${theme.pageMargin}mm`,
    '--resume-line-spacing': theme.lineSpacing,
    '--personal-photo-height': `${resolvePersonalPhotoStyle(data.personalInfo.photoStyle).height}px`,
  };

  const colorStyle = `
    .resume-paper {
      --theme-bg: ${colors.bg};
      --theme-border: ${colors.border};
      --theme-tag-bg: ${colors.tagBg};
      --theme-tag-text: ${colors.tagText};
      --layout-accent: ${colors.border};
      --layout-tag-border: ${colors.tagText};
      --section-title-size: ${theme.sectionTitleFontSize}px;
      --entry-title-size: ${theme.entryTitleFontSize}px;
      font-family: ${getFontStack(theme.fontFamily)} !important;
      line-height: var(--resume-line-spacing) !important;
    }
    .resume-paper [data-page-section] :where(p, li, div, span) {
      line-height: var(--resume-line-spacing) !important;
    }
    .resume-paper .section-header {
      background-color: var(--theme-bg) !important;
      color: var(--theme-border) !important;
      border-bottom-color: var(--theme-border) !important;
    }
    .resume-paper .section-header-bar {
      background-color: var(--theme-border) !important;
    }
    .resume-paper .tag-badge {
      background-color: var(--theme-tag-bg) !important;
      color: var(--theme-tag-text) !important;
    }
  `;


  // Resolve CSS for the current layout; unknown layoutId returns empty CSS.
  const layoutCSS = getLayoutCSS(theme.layoutId);
  const titleRowCSS = `
    .resume-paper [data-page-section] .entry-title-row {
      --entry-title-row-height: calc(var(--entry-title-size, 1em) * 1.5);
      line-height: var(--entry-title-row-height) !important;
      min-height: var(--entry-title-row-height);
    }
    .resume-paper [data-page-section] .entry-title-row :where(div, span) {
      line-height: inherit !important;
    }
    .resume-paper [data-page-section] .entry-title-row > .min-w-0 {
      display: flex;
      align-items: baseline;
    }
  `;
  const resumeContentCSS = `
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-700,
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-600,
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-500,
    .resume-paper[data-layout] :is(p, li, span, div).text-gray-400,
    .resume-paper[data-layout] [data-section-field="markdown-p"],
    .resume-paper[data-layout] [data-section-field="markdown-ol"] > li,
    .resume-paper[data-layout] [data-section-field="markdown-ul"] > li,
    .resume-paper[data-layout] ul.list-none > li {
      color: #333333 !important;
    }

    .resume-paper[data-layout] ul.list-none li > span.resume-list-marker:first-child,
    .resume-paper[data-layout] .resume-list-marker--ordered,
    .resume-paper[data-layout] [data-section-field="markdown-ol"] > li::marker {
      color: #333333 !important;
      font-weight: 400 !important;
    }
    .resume-paper[data-layout] ul.list-none li > span.resume-list-marker--bullet:first-child,
    .resume-paper[data-layout] .resume-list-marker--bullet {
      display: inline-block !important;
      color: #333333 !important;
      font-size: 1.18em !important;
      font-weight: 400 !important;
      line-height: 1 !important;
      vertical-align: -0.03em !important;
    }
    .resume-paper[data-layout] [data-section-field="markdown-ul"] > li::marker {
      color: #333333 !important;
      font-size: 1.18em !important;
      font-weight: 400 !important;
    }
  `;

  // Scope CSS to the current layout to avoid cross-preview contamination.
  const cssContent = scopeResumePaperCSS(`${colorStyle}${layoutCSS}${resumeContentCSS}${titleRowCSS}`, theme.layoutId, scopeClass);
  const sidebarShellClassName = 'left-sidebar-two-column-shell';
  const sidebarPagedShellClassName = 'left-sidebar-two-column-shell left-sidebar-two-column-paged-flow';

  const isMultiPage = !disablePagination && numPages > 1;
  const pageWidth = A4_WIDTH_MM * MM_TO_PX;
  const twoColumnWidth = pageWidth * 2 + PAGE_GAP_PX;
  const canUseTwoColumns = isMultiPage && numPages > 1 && viewportWidth / zoom >= twoColumnWidth;
  const pagesWrapperWidth = canUseTwoColumns ? twoColumnWidth : pageWidth;

  const watermarkEl = theme.watermark.enabled ? (
    <WatermarkOverlay settings={theme.watermark} />
  ) : null;

  // Offscreen measurement element: render all sections continuously without
  // overflow clipping, then query exact item/section positions for page breaks.
  const measurePaper = (
    <div
      className="resume-paper"
      data-layout={theme.layoutId}
      style={{ ...paperStyle, position: 'relative' }}
    >
      <style key={`${scopeClass ?? 'global'}-${theme.layoutId}-measure`}>{cssContent}</style>
      <div
        ref={measureFlowRef}
        data-page-flow-root
        className={isSidebarLayout ? sidebarPagedShellClassName : undefined}
        style={isSidebarLayout ? { '--resume-content-height': '0px' } as React.CSSProperties : undefined}
      >
        {renderFlowContent(
          sectionInfos.filter((s) => !hiddenSections.includes(s.key)),
          false,
        )}
      </div>
    </div>
  );

  const hiddenMeasureEl = !disablePagination && needsMeasure ? (
    <div
      key="hidden-measure"
      style={{
        position: 'fixed',
        top: 0,
        left: '-9999px',
        visibility: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {measurePaper}
    </div>
  ) : null;

  // ========== 澶氶〉妯″紡 ==========
  // 杩炵画鍐呭閫氳繃 translateY 瑙嗗彛绐楀彛鍒嗛〉灞曠ず锛屾瘡椤甸珮搴︾敱鏅鸿兘鍒嗛〉绠楁硶
  // Decide page breaks from item boundaries to avoid cutting through text lines or entries.
  if (isMultiPage) {
    const multiPageContent = (
      <>
        {hiddenMeasureEl}
        <div
          className="resume-pages-wrapper"
          data-pagination-state={needsMeasure && !disablePagination ? 'measuring' : 'ready'}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: `${PAGE_GAP_PX}px`,
            justifyContent: 'center',
            width: `${pagesWrapperWidth}px`,
          }}
        >
          <style key={`${scopeClass ?? 'global'}-${theme.layoutId}-pages`}>{cssContent}</style>
          {Array.from({ length: numPages }, (_, pageIndex) => {
            const pageStart = pageOffsets[pageIndex];
            const pageEnd = pageOffsets[pageIndex + 1];
            const pageHeight = pageEnd - pageStart;
            return (
              <div
                key={pageIndex}
                className="resume-paper"
                data-layout={theme.layoutId}
                data-page-index={pageIndex}
                style={{
                  ...paperStyle,
                  height: `${A4_HEIGHT_MM}mm`,
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {watermarkEl}
                  <div style={{
                  position: 'relative',
                  zIndex: 1,
                  height: `${pageHeight}px`,
                  marginTop: isSidebarLayout ? `${theme.pageMargin}mm` : undefined,
                  overflow: 'hidden',
                }}>
                  <div style={{ transform: `translateY(-${pageStart}px)` }}>
                    <div className={isSidebarLayout ? sidebarPagedShellClassName : undefined}>
                      {renderFlowContent(sectionInfos, true)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );

    return scopeClass ? (
      <div className={scopeClass}>{multiPageContent}</div>
    ) : (
      multiPageContent
    );
  }

  // ========== 鍗曢〉妯″紡 ==========
  const paperEl = (
    <div
      className="resume-paper"
      data-layout={theme.layoutId}
      data-pagination-state={needsMeasure && !disablePagination ? 'measuring' : 'ready'}
      style={{ ...paperStyle, position: 'relative', overflow: 'hidden' }}
    >
      <style key={`${scopeClass ?? 'global'}-${theme.layoutId}-single`}>{cssContent}</style>
      {watermarkEl}
      <div
        className={isSidebarLayout ? sidebarShellClassName : undefined}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {renderFlowContent(sectionInfos, true)}
      </div>
    </div>
  );

  return (
    <>
      {hiddenMeasureEl}
      {scopeClass ? (
        <div className={scopeClass}>{paperEl}</div>
      ) : (
        paperEl
      )}
    </>
  );
}
