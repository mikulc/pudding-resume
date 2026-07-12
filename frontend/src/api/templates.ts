/**
 * Template API client — fetches style library data from backend.
 * All endpoints are public (no auth required).
 */
import type { StyleLibraryEntry, ResumeData } from '../types/resume';
import { api } from '../utils/api';

/** Backend JSON format for style library entries */
interface ApiStyleLibrary {
  id: string;
  name: string;
  description: string;
  layout_id: string;
  category: string;
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

/** Get all style library entries */
export async function getStyleLibraries(): Promise<StyleLibraryEntry[]> {
  const res = await api.get<{ templates: ApiStyleLibrary[] }>('/api/templates/styles');
  return (res.templates || []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    highlights: t.highlights || [],
    layoutId: t.layout_id,
    category: t.category || '',
    previewColors: t.preview_colors || { headerBg: '#DBEAFE', accentBar: '#3B82F6', bodyBg: '#FFFFFF' },
    previewImage: t.preview_image,
    previewVersion: t.preview_version,
  }));
}

/** Demo content API response */
interface DemoContentResponse {
  content: ResumeData;
  updated_at: string;
}

/** Get the demo resume content for theme previews */
export async function getDemoContent(): Promise<ResumeData> {
  const res = await api.get<DemoContentResponse>('/api/templates/demo-content');
  return res.content;
}
