import type { ResumeData, ThemeSettings } from '../types/resume';

const RESUME_LAUNCH_SESSION_KEYS = [
  'existing_resume_id',
  'existing_resume_name',
  'local_resume_data',
  'local_resume_settings',
  'blank_template_create',
  'blank_template_id',
  'blank_template_name',
  'template_data',
  'template_name',
  'template_settings',
  'template_layout_id',
  'template_theme_color',
  'resume_copy_id',
  'resume_copy_name',
] as const;

const DRAFT_LAUNCH_SESSION_KEYS = [
  'blank_template_create', 'template_data', 'template_name',
  'template_settings', 'template_layout_id', 'template_theme_color',
] as const;

const LOCAL_LAUNCH_SESSION_KEYS = [
  'existing_resume_id', 'existing_resume_name',
  'local_resume_data', 'local_resume_settings',
] as const;

function parseSessionJSON<T>(key: string): T | undefined {
  const serialized = sessionStorage.getItem(key);
  if (!serialized) return undefined;
  try {
    return JSON.parse(serialized) as T;
  } catch {
    return undefined;
  }
}

export function clearResumeLaunchSession(): void {
  RESUME_LAUNCH_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

export function clearDraftResumeLaunch(): void {
  DRAFT_LAUNCH_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

export function clearLocalResumeLaunch(): void {
  LOCAL_LAUNCH_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

export function clearExistingResumeLaunch(): void {
  sessionStorage.removeItem('existing_resume_id');
  sessionStorage.removeItem('existing_resume_name');
}

export function readDraftResumeLaunch(): {
  data?: ResumeData;
  settings?: ThemeSettings;
  layoutId?: string;
  themeColor?: string;
} | null {
  if (sessionStorage.getItem('blank_template_create') !== '1') return null;
  return {
    data: parseSessionJSON<ResumeData>('template_data'),
    settings: parseSessionJSON<ThemeSettings>('template_settings'),
    layoutId: sessionStorage.getItem('template_layout_id') || undefined,
    themeColor: sessionStorage.getItem('template_theme_color') || undefined,
  };
}

export function readLocalResumeLaunch(): {
  id: string;
  name?: string;
  data: ResumeData;
  settings?: ThemeSettings;
} | null {
  const id = sessionStorage.getItem('existing_resume_id');
  if (!id?.startsWith('local-')) return null;
  const data = parseSessionJSON<ResumeData>('local_resume_data');
  if (!data) return null;
  return {
    id,
    name: sessionStorage.getItem('existing_resume_name') || undefined,
    data,
    settings: parseSessionJSON<ThemeSettings>('local_resume_settings'),
  };
}

export function readExistingResumeLaunchId(): string | null {
  return sessionStorage.getItem('existing_resume_id');
}

export function stageLocalResumeLaunch(input: {
  id: string;
  name: string;
  data: ResumeData;
  settings?: ThemeSettings;
}): void {
  sessionStorage.setItem('local_resume_data', JSON.stringify(input.data));
  if (input.settings) {
    sessionStorage.setItem('local_resume_settings', JSON.stringify(input.settings));
  }
  sessionStorage.setItem('existing_resume_id', input.id);
  sessionStorage.setItem('existing_resume_name', input.name);
}

export function stageExistingResumeLaunch(id: string, name: string): void {
  sessionStorage.setItem('existing_resume_id', id);
  sessionStorage.setItem('existing_resume_name', name);
}

export function stageDraftResumeLaunch(input: {
  layoutId: string;
  themeColor: string;
  templateData?: ResumeData;
}): void {
  sessionStorage.setItem('blank_template_create', '1');
  sessionStorage.setItem('template_layout_id', input.layoutId);
  sessionStorage.setItem('template_theme_color', input.themeColor);

  if (input.templateData) {
    sessionStorage.setItem('template_data', JSON.stringify(input.templateData));
  }
}
