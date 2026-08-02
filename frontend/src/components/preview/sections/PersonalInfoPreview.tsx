import React,{ useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppUI,useResume } from '../../../context/ResumeContext';
import { resolveLayout } from '../../../registry/layouts';
import {
DEFAULT_PERSONAL_FIELD_ORDER,
getPersonalFieldLabels
} from '../../../types/resume';
import {
AtSign,
Award,
Bell,
Bookmark,
BookOpen,
Briefcase,
Building2,
Calendar,
Camera,
CheckCircle,
CircleUserRound,
Clock,
Cloud,
Code,
Coffee,
Cpu,
Database,
ExternalLink,
Facebook,
FileText,
FolderGit2,
Gamepad2,
Github,
Globe,
GraduationCap,
Hash,
Heart,
Home,
IdCard,
Instagram,
Languages,
Laptop,
Layers,
Link,
Linkedin,
Mail,
MapPin,
Medal,
MessageCircle,
Music,
Palette,
Phone,
Rocket,
School,
ScrollText,
Server,
Settings,
Share2,
Star,
Tag,
Target,
Terminal,
ThumbsUp,
Trophy,
Twitter,
User,
Wrench,
Zap,
} from '../../icons';
import { ActiveSectionWrapper,resolvePersonalPhotoStyle,useResumeModuleTitles } from '../PreviewShared';

export function PersonalInfoPreview() {
  const { t, i18n } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { personalInfo } = data;
  const layout = resolveLayout(ui.theme.layoutId);
  const defaultFieldLabels = getPersonalFieldLabels();
  const moduleTitles = useResumeModuleTitles();

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
  const isBlueprintIcons = layout.id === 'blueprint-icons';
  const isMonochromeRings = layout.id === 'monochrome-rings';
  const isTealRibbonWave = layout.id === 'teal-ribbon-wave';
  const isBlueBannerIcons = layout.id === 'blue-banner-icons';
  const isAzureSidebar = layout.id === 'azure-sidebar';

  // A missing image should remove the entire photo area instead of rendering
  // a broken-image placeholder. This keeps template/demo previews aligned
  // with the editor's no-photo layout when /images/avatar.jpg is absent.
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setPhotoError(false);
  }, [personalInfo.photoUrl]);

  const displayMode = personalInfo.displayMode || 'icon';
  const isTextMode = displayMode === 'text';
  const isNoneMode = displayMode === 'none';
  const photoLayout = personalInfo.photoLayout || 'right';
  const photoStyle = resolvePersonalPhotoStyle(personalInfo.photoStyle);

  const hasPhoto = !!personalInfo.photoUrl;
  // 浠呭湪鏈夌収鐗囨垨缂栬緫妯″紡涓嬫樉绀虹収鐗囧尯鍩燂紱姝ｅ紡灞曠ず鏃舵棤鐓х墖鍒欎笉鏄剧ず
  const showPhotoArea = !isHidden('photo') && hasPhoto && !photoError;

  // 澶村儚鍖哄煙
  const photoEl = (
    <div
      className="personal-photo overflow-hidden shrink-0"
      style={{ width: photoStyle.width, height: photoStyle.height, borderRadius: photoStyle.borderRadius }}
    >
      <img
        src={personalInfo.photoUrl}
        alt={t('photo.alt')}
        className="w-full h-full object-cover"
        onError={() => setPhotoError(true)}
      />
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
  const showFullName = !isHidden('fullName')
    && fieldOrder.includes('fullName')
    && !!personalInfo.fullName.trim();

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

  const renderNoneModeField = (field: string) => (
    renderValueOnlyField(field, 'personal-contact-value')
  );

  const renderNoneModeFields = (fields: string[]) => fields.map((field, index) => (
    <React.Fragment key={field}>
      {index > 0 && (
        <span className="personal-contact-separator" aria-hidden="true">|</span>
      )}
      {renderNoneModeField(field)}
    </React.Fragment>
  ));

  const renderLeftSidebarTwoColumnField = (field: string) => {
    const cfg = fieldConfig[field];
    const value = cfg ? cfg.value : customFields[field];
    if (!value) return null;
    const label = cfg?.textLabel ?? field;
    const defaultCustomIcon = iconMap[field]
      ? (previewIconLib[iconMap[field]] || previewIconLib.tag)
      : previewIconLib.tag;
    const icon = cfg ? getFieldIcon(field, cfg.icon) : getFieldIcon(field, defaultCustomIcon);

    if (isNoneMode) {
      return (
        <div key={field} className="left-sidebar-two-column-contact-item break-words">
          <span className="min-w-0 max-w-full break-all">{value}</span>
        </div>
      );
    }

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

    if (isNoneMode) {
      return (
        <div key={field} className="azure-sidebar-contact-item break-words">
          <span className="min-w-0 max-w-full break-all">{value}</span>
        </div>
      );
    }

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
            {personalInfo.fullName}
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
            {personalInfo.fullName}
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

  const renderContactField = isNoneMode ? renderNoneModeField : renderField;

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
          {personalInfo.fullName}
        </h1>
      )}
      {topFields.length > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-3 ${isNoneMode ? 'personal-contact-row-none' : ''} ${isPhotoLeft ? 'justify-end' : ''}`}>
          {isNoneMode ? renderNoneModeFields(topFields) : topFields.map(renderContactField)}
        </div>
      )}
      {bottomFields.length > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-2 ${isNoneMode ? 'personal-contact-row-none' : ''} ${isPhotoLeft ? 'justify-end' : ''}`}>
          {isNoneMode ? renderNoneModeFields(bottomFields) : bottomFields.map(renderContactField)}
        </div>
      )}
    </div>
  );

  return (
    <ActiveSectionWrapper sectionKey="personal" className={`mb-6 personal-info-mode-${displayMode} ${isCenterline ? 'centerline-personal' : ''} ${isBlueprintIcons ? 'blueprint-icons-personal' : ''} ${isMonochromeRings ? 'monochrome-rings-personal' : ''} ${isTealRibbonWave ? 'teal-ribbon-wave-personal' : ''} ${isBlueBannerIcons ? 'blue-banner-icons-personal' : ''}`}>
      <div
        className={`flex items-start gap-4 ${isPhotoLeft ? 'flex-row-reverse' : ''}`}
      >
        {infoEl}
        {showPhotoArea && photoEl}
      </div>
    </ActiveSectionWrapper>
  );
}

