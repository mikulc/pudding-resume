/**
 * Public API client for the separate template and theme libraries.
 * All endpoints are public (no auth required).
 */
import type { ResumeData, TemplateCategoryEntry, TemplateLibraryEntry, ThemeLibraryEntry } from '../types/resume';
import { api } from '../utils/api';

/** Backend JSON format for theme library entries */
interface ApiThemeLibrary {
  id: string;
  name: string;
  layout_id: string;
  categories: string[];
  preview_image?: string;
  preview_version?: string;
  sort_order: number;
}

interface ApiTemplateLibrary {
  id: string;
  name: string;
  categories: string[];
  content: ResumeData;
  default_theme_id: string;
  default_theme: ApiThemeLibrary;
}

interface ApiTemplateCategory {
  id: string;
  name: string;
  sort_order: number;
}

function mapTheme(t: ApiThemeLibrary): ThemeLibraryEntry {
  return {
    id: t.id,
    name: t.name,
    layoutId: t.layout_id,
    categories: t.categories || [],
    previewImage: t.preview_image,
    previewVersion: t.preview_version,
  };
}

/** Get all visual themes used by the resume editor. */
export async function getThemeLibraries(): Promise<ThemeLibraryEntry[]> {
  const res = await api.get<{ themes: ApiThemeLibrary[] }>('/api/themes');
  return (res.themes || []).map(mapTheme);
}

/** Get all categorized resume content templates. */
export async function getTemplateLibraries(): Promise<TemplateLibraryEntry[]> {
  const res = await api.get<{ templates: ApiTemplateLibrary[] }>('/api/templates');
  return (res.templates || []).map((template) => ({
    id: template.id,
    name: template.name,
    categories: template.categories || [],
    content: template.content,
    defaultThemeId: template.default_theme_id,
    defaultTheme: mapTheme(template.default_theme),
  }));
}

/** Get enabled template categories in the order configured by administrators. */
export async function getTemplateCategories(): Promise<TemplateCategoryEntry[]> {
  const res = await api.get<{ categories: ApiTemplateCategory[] }>('/api/template-categories');
  return (res.categories || []).map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sort_order,
  }));
}
