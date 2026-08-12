/**
 * Public API client for the separate template and theme libraries.
 * All endpoints are public (no auth required).
 */
import type { ResumeData, TemplateLibraryEntry, ThemeLibraryEntry } from '../types/resume';
import { api } from '../utils/api';

/** Backend JSON format for theme library entries */
interface ApiThemeLibrary {
  id: string;
  name: string;
  layout_id: string;
  categories: string[];
  highlights: string[];
  preview_colors: {
    headerBg: string;
    accentBar: string;
    bodyBg: string;
    sectionBg: string;
  };
  preview_image?: string;
  preview_version?: string;
  sort_order: number;
}

interface ApiTemplateLibrary {
  id: string;
  name: string;
  industry: string;
  categories: string[];
  highlights: string[];
  content: ResumeData;
  default_theme_id: string;
  default_theme: ApiThemeLibrary;
  version: number;
}

function mapTheme(t: ApiThemeLibrary): ThemeLibraryEntry {
  return {
    id: t.id,
    name: t.name,
    highlights: t.highlights || [],
    layoutId: t.layout_id,
    categories: t.categories || [],
    previewColors: t.preview_colors || { headerBg: '#DBEAFE', accentBar: '#3B82F6', bodyBg: '#FFFFFF' },
    previewImage: t.preview_image,
    previewVersion: t.preview_version,
  };
}

/** Get all visual themes used by the resume editor. */
export async function getThemeLibraries(): Promise<ThemeLibraryEntry[]> {
  const res = await api.get<{ themes: ApiThemeLibrary[] }>('/api/themes');
  return (res.themes || []).map(mapTheme);
}

/** Get all industry/position resume templates. */
export async function getTemplateLibraries(): Promise<TemplateLibraryEntry[]> {
  const res = await api.get<{ templates: ApiTemplateLibrary[] }>('/api/templates');
  return (res.templates || []).map((template) => ({
    id: template.id,
    name: template.name,
    industry: template.industry,
    categories: template.categories || [],
    highlights: template.highlights || [],
    content: template.content,
    defaultThemeId: template.default_theme_id,
    defaultTheme: mapTheme(template.default_theme),
    version: template.version,
  }));
}
