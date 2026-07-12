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
  | 'personalInfo'
  | 'education'
  | 'workExperience'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'achievements'
  | 'hobbies'
  | 'social'
  | 'other';

export type IconDef = { key: string; category: Exclude<IconCategory, 'all'>; keywords: string[]; icon: React.ReactNode };

export const ICON_CATEGORIES: IconCategory[] = [
  'all',
  'personalInfo',
  'education',
  'workExperience',
  'skills',
  'languages',
  'projects',
  'achievements',
  'hobbies',
  'social',
  'other',
];

export const ICON_LIBRARY: IconDef[] = [
  { key: 'user', category: 'personalInfo', keywords: ['name', 'user', 'person'], icon: <User className="w-4 h-4" /> },
  { key: 'circleUserRound', category: 'personalInfo', keywords: ['profile', 'avatar'], icon: <CircleUserRound className="w-4 h-4" /> },
  { key: 'idCard', category: 'personalInfo', keywords: ['id', 'identity'], icon: <IdCard className="w-4 h-4" /> },
  { key: 'phone', category: 'personalInfo', keywords: ['phone', 'mobile'], icon: <Phone className="w-4 h-4" /> },
  { key: 'mail', category: 'personalInfo', keywords: ['email', 'mail'], icon: <Mail className="w-4 h-4" /> },
  { key: 'atSign', category: 'personalInfo', keywords: ['account', 'email', 'at'], icon: <AtSign className="w-4 h-4" /> },
  { key: 'mapPin', category: 'personalInfo', keywords: ['location', 'address'], icon: <MapPin className="w-4 h-4" /> },
  { key: 'home', category: 'personalInfo', keywords: ['home', 'address'], icon: <Home className="w-4 h-4" /> },

  { key: 'graduationCap', category: 'education', keywords: ['degree', 'graduation', 'education'], icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'school', category: 'education', keywords: ['school', 'campus'], icon: <School className="w-4 h-4" /> },
  { key: 'bookOpen', category: 'education', keywords: ['knowledge', 'study', 'book'], icon: <BookOpen className="w-4 h-4" /> },
  { key: 'scrollText', category: 'education', keywords: ['course', 'paper', 'scroll'], icon: <ScrollText className="w-4 h-4" /> },

  { key: 'briefcase', category: 'workExperience', keywords: ['work', 'career'], icon: <Briefcase className="w-4 h-4" /> },
  { key: 'building2', category: 'workExperience', keywords: ['company', 'organization'], icon: <Building2 className="w-4 h-4" /> },
  { key: 'calendar', category: 'workExperience', keywords: ['calendar', 'date'], icon: <Calendar className="w-4 h-4" /> },
  { key: 'clock', category: 'workExperience', keywords: ['time', 'experience'], icon: <Clock className="w-4 h-4" /> },
  { key: 'target', category: 'workExperience', keywords: ['goal', 'job', 'target'], icon: <Target className="w-4 h-4" /> },

  { key: 'code', category: 'skills', keywords: ['code', 'development'], icon: <Code className="w-4 h-4" /> },
  { key: 'wrench', category: 'skills', keywords: ['tool', 'skill'], icon: <Wrench className="w-4 h-4" /> },
  { key: 'laptop', category: 'skills', keywords: ['computer', 'technology', 'laptop'], icon: <Laptop className="w-4 h-4" /> },
  { key: 'cpu', category: 'skills', keywords: ['chip', 'hardware', 'cpu'], icon: <Cpu className="w-4 h-4" /> },
  { key: 'server', category: 'skills', keywords: ['service', 'backend', 'server'], icon: <Server className="w-4 h-4" /> },
  { key: 'terminal', category: 'skills', keywords: ['terminal', 'command'], icon: <Terminal className="w-4 h-4" /> },
  { key: 'database', category: 'skills', keywords: ['database', 'data'], icon: <Database className="w-4 h-4" /> },
  { key: 'settings', category: 'skills', keywords: ['settings', 'configuration'], icon: <Settings className="w-4 h-4" /> },

  { key: 'languages', category: 'languages', keywords: ['language', 'translation'], icon: <Languages className="w-4 h-4" /> },
  { key: 'globe', category: 'languages', keywords: ['web', 'global', 'globe'], icon: <Globe className="w-4 h-4" /> },
  { key: 'messageCircle', category: 'languages', keywords: ['chat', 'communication', 'message'], icon: <MessageCircle className="w-4 h-4" /> },

  { key: 'folderGit2', category: 'projects', keywords: ['project', 'repository'], icon: <FolderGit2 className="w-4 h-4" /> },
  { key: 'layers', category: 'projects', keywords: ['layers', 'architecture'], icon: <Layers className="w-4 h-4" /> },
  { key: 'rocket', category: 'projects', keywords: ['rocket', 'launch'], icon: <Rocket className="w-4 h-4" /> },
  { key: 'cloud', category: 'projects', keywords: ['cloud', 'deployment'], icon: <Cloud className="w-4 h-4" /> },
  { key: 'externalLink', category: 'projects', keywords: ['external', 'link'], icon: <ExternalLink className="w-4 h-4" /> },
  { key: 'link', category: 'projects', keywords: ['link', 'url'], icon: <Link className="w-4 h-4" /> },

  { key: 'award', category: 'achievements', keywords: ['award', 'honor'], icon: <Award className="w-4 h-4" /> },
  { key: 'trophy', category: 'achievements', keywords: ['trophy', 'achievement'], icon: <Trophy className="w-4 h-4" /> },
  { key: 'medal', category: 'achievements', keywords: ['medal', 'certificate'], icon: <Medal className="w-4 h-4" /> },
  { key: 'checkCircle', category: 'achievements', keywords: ['certification', 'certificate', 'check'], icon: <CheckCircle className="w-4 h-4" /> },
  { key: 'star', category: 'achievements', keywords: ['star', 'excellent'], icon: <Star className="w-4 h-4" /> },
  { key: 'zap', category: 'achievements', keywords: ['highlight', 'lightning', 'zap'], icon: <Zap className="w-4 h-4" /> },
  { key: 'thumbsUp', category: 'achievements', keywords: ['like', 'recognition'], icon: <ThumbsUp className="w-4 h-4" /> },

  { key: 'heart', category: 'hobbies', keywords: ['favorite', 'hobby', 'heart'], icon: <Heart className="w-4 h-4" /> },
  { key: 'palette', category: 'hobbies', keywords: ['palette', 'design'], icon: <Palette className="w-4 h-4" /> },
  { key: 'camera', category: 'hobbies', keywords: ['camera', 'photography'], icon: <Camera className="w-4 h-4" /> },
  { key: 'music', category: 'hobbies', keywords: ['music', 'song'], icon: <Music className="w-4 h-4" /> },
  { key: 'coffee', category: 'hobbies', keywords: ['coffee', 'lifestyle'], icon: <Coffee className="w-4 h-4" /> },
  { key: 'gamepad2', category: 'hobbies', keywords: ['game'], icon: <Gamepad2 className="w-4 h-4" /> },

  { key: 'share2', category: 'social', keywords: ['share', 'social'], icon: <Share2 className="w-4 h-4" /> },
  { key: 'linkedin', category: 'social', keywords: ['linkedin'], icon: <Linkedin className="w-4 h-4" /> },
  { key: 'twitter', category: 'social', keywords: ['twitter', 'x'], icon: <Twitter className="w-4 h-4" /> },
  { key: 'facebook', category: 'social', keywords: ['facebook'], icon: <Facebook className="w-4 h-4" /> },
  { key: 'instagram', category: 'social', keywords: ['instagram'], icon: <Instagram className="w-4 h-4" /> },
  { key: 'github',   category: 'social', keywords: ['github', 'git'],        icon: <Github className="w-4 h-4" /> },

  { key: 'tag', category: 'other', keywords: ['tag'], icon: <Tag className="w-4 h-4" /> },
  { key: 'fileText', category: 'other', keywords: ['document', 'file'], icon: <FileText className="w-4 h-4" /> },
  { key: 'bookmark', category: 'other', keywords: ['bookmark', 'favorite'], icon: <Bookmark className="w-4 h-4" /> },
  { key: 'bell', category: 'other', keywords: ['notification', 'reminder'], icon: <Bell className="w-4 h-4" /> },
  { key: 'hash', category: 'other', keywords: ['hash', 'number'], icon: <Hash className="w-4 h-4" /> },
];
