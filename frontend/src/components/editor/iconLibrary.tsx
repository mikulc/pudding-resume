import React from 'react';
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

/** 内置字段的固定图标映射 */
export const FIELD_ICONS: Record<string, React.ReactNode> = {
  fullName: <User className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  jobStatus: <Briefcase className="w-3.5 h-3.5" />,
  location: <MapPin className="w-3.5 h-3.5" />,
  jobTarget: <Target className="w-3.5 h-3.5" />,
  _custom: <Tag className="w-3.5 h-3.5" />,
};

/** 内置字段的默认图标 key（用于图标选择器回显） */
export const DEFAULT_FIELD_ICON_KEYS: Record<string, string> = {
  fullName: 'user',
  phone: 'phone',
  email: 'mail',
  jobStatus: 'briefcase',
  location: 'mapPin',
  jobTarget: 'target',
  _custom: 'tag',
};

// ── 可选图标库（用于自定义字段图标） ──
export type IconCategory =
  | 'all'
  | 'identity'
  | 'contact'
  | 'career'
  | 'social'
  | 'other';

export type IconDef = { key: string; category: Exclude<IconCategory, 'all'>; keywords: string[]; icon: React.ReactNode };

export const ICON_CATEGORIES: IconCategory[] = [
  'all',
  'identity',
  'contact',
  'career',
  'social',
  'other',
];

/** 仅展示适合个人信息字段的图标，避免将整份简历的模块图标混入选择器。 */
export const ICON_LIBRARY: IconDef[] = [
  { key: 'user', category: 'identity', keywords: ['name', 'user', 'person'], icon: <User className="w-4 h-4" /> },
  { key: 'circleUserRound', category: 'identity', keywords: ['profile', 'avatar'], icon: <CircleUserRound className="w-4 h-4" /> },
  { key: 'idCard', category: 'identity', keywords: ['id', 'identity'], icon: <IdCard className="w-4 h-4" /> },
  { key: 'calendar', category: 'identity', keywords: ['birthday', 'date', 'calendar'], icon: <Calendar className="w-4 h-4" /> },
  { key: 'languages', category: 'identity', keywords: ['language', 'nationality'], icon: <Languages className="w-4 h-4" /> },

  { key: 'phone', category: 'contact', keywords: ['phone', 'mobile'], icon: <Phone className="w-4 h-4" /> },
  { key: 'mail', category: 'contact', keywords: ['email', 'mail'], icon: <Mail className="w-4 h-4" /> },
  { key: 'atSign', category: 'contact', keywords: ['account', 'email', 'at'], icon: <AtSign className="w-4 h-4" /> },
  { key: 'mapPin', category: 'contact', keywords: ['location', 'address'], icon: <MapPin className="w-4 h-4" /> },
  { key: 'home', category: 'contact', keywords: ['home', 'address'], icon: <Home className="w-4 h-4" /> },
  { key: 'messageCircle', category: 'contact', keywords: ['chat', 'communication', 'message'], icon: <MessageCircle className="w-4 h-4" /> },

  { key: 'briefcase', category: 'career', keywords: ['work', 'career'], icon: <Briefcase className="w-4 h-4" /> },
  { key: 'building2', category: 'career', keywords: ['company', 'organization'], icon: <Building2 className="w-4 h-4" /> },
  { key: 'target', category: 'career', keywords: ['goal', 'job', 'target'], icon: <Target className="w-4 h-4" /> },
  { key: 'clock', category: 'career', keywords: ['time', 'experience', 'availability'], icon: <Clock className="w-4 h-4" /> },
  { key: 'graduationCap', category: 'career', keywords: ['degree', 'education'], icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'school', category: 'career', keywords: ['school', 'campus'], icon: <School className="w-4 h-4" /> },
  { key: 'award', category: 'career', keywords: ['award', 'honor'], icon: <Award className="w-4 h-4" /> },
  { key: 'checkCircle', category: 'career', keywords: ['certification', 'status', 'check'], icon: <CheckCircle className="w-4 h-4" /> },

  { key: 'share2', category: 'social', keywords: ['share', 'social'], icon: <Share2 className="w-4 h-4" /> },
  { key: 'globe', category: 'social', keywords: ['website', 'web', 'homepage'], icon: <Globe className="w-4 h-4" /> },
  { key: 'link', category: 'social', keywords: ['link', 'url'], icon: <Link className="w-4 h-4" /> },
  { key: 'externalLink', category: 'social', keywords: ['external', 'link'], icon: <ExternalLink className="w-4 h-4" /> },
  { key: 'linkedin', category: 'social', keywords: ['linkedin'], icon: <Linkedin className="w-4 h-4" /> },
  { key: 'twitter', category: 'social', keywords: ['twitter', 'x'], icon: <Twitter className="w-4 h-4" /> },
  { key: 'facebook', category: 'social', keywords: ['facebook'], icon: <Facebook className="w-4 h-4" /> },
  { key: 'instagram', category: 'social', keywords: ['instagram'], icon: <Instagram className="w-4 h-4" /> },
  { key: 'github',   category: 'social', keywords: ['github', 'git'],        icon: <Github className="w-4 h-4" /> },

  { key: 'tag', category: 'other', keywords: ['tag'], icon: <Tag className="w-4 h-4" /> },
  { key: 'fileText', category: 'other', keywords: ['document', 'file'], icon: <FileText className="w-4 h-4" /> },
  { key: 'bookmark', category: 'other', keywords: ['bookmark', 'favorite'], icon: <Bookmark className="w-4 h-4" /> },
  { key: 'star', category: 'other', keywords: ['star', 'favorite'], icon: <Star className="w-4 h-4" /> },
  { key: 'heart', category: 'other', keywords: ['favorite', 'interest'], icon: <Heart className="w-4 h-4" /> },
  { key: 'hash', category: 'other', keywords: ['hash', 'number'], icon: <Hash className="w-4 h-4" /> },
];

/** 已从选择器移除的旧图标仍参与解析，保证历史简历不会丢失自定义图标。 */
export const LEGACY_ICON_LIBRARY = [
  { key: 'bookOpen', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'scrollText', icon: <ScrollText className="w-4 h-4" /> },
  { key: 'code', icon: <Code className="w-4 h-4" /> },
  { key: 'wrench', icon: <Wrench className="w-4 h-4" /> },
  { key: 'laptop', icon: <Laptop className="w-4 h-4" /> },
  { key: 'cpu', icon: <Cpu className="w-4 h-4" /> },
  { key: 'server', icon: <Server className="w-4 h-4" /> },
  { key: 'terminal', icon: <Terminal className="w-4 h-4" /> },
  { key: 'database', icon: <Database className="w-4 h-4" /> },
  { key: 'settings', icon: <Settings className="w-4 h-4" /> },
  { key: 'folderGit2', icon: <FolderGit2 className="w-4 h-4" /> },
  { key: 'layers', icon: <Layers className="w-4 h-4" /> },
  { key: 'rocket', icon: <Rocket className="w-4 h-4" /> },
  { key: 'cloud', icon: <Cloud className="w-4 h-4" /> },
  { key: 'trophy', icon: <Trophy className="w-4 h-4" /> },
  { key: 'medal', icon: <Medal className="w-4 h-4" /> },
  { key: 'zap', icon: <Zap className="w-4 h-4" /> },
  { key: 'thumbsUp', icon: <ThumbsUp className="w-4 h-4" /> },
  { key: 'palette', icon: <Palette className="w-4 h-4" /> },
  { key: 'camera', icon: <Camera className="w-4 h-4" /> },
  { key: 'music', icon: <Music className="w-4 h-4" /> },
  { key: 'coffee', icon: <Coffee className="w-4 h-4" /> },
  { key: 'gamepad2', icon: <Gamepad2 className="w-4 h-4" /> },
  { key: 'bell', icon: <Bell className="w-4 h-4" /> },
];

export const ALL_ICON_LIBRARY = [...ICON_LIBRARY, ...LEGACY_ICON_LIBRARY];
