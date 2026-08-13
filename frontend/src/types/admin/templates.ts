import type { ResumeData } from '../resume';

export interface AdminTemplateItem {
  id: string;
  name: string;
  industry: string;
  categories: string[];
  category_ids: string[];
  highlights: string[];
  content: ResumeData;
  default_theme_id: string;
  default_theme?: {
    id: string;
    name: string;
    layout_id: string;
  };
  status: 'published' | 'draft';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminTemplateInput {
  name: string;
  industry: string;
  category_ids: string[];
  highlights: string[];
  content: ResumeData;
  default_theme_id: string;
  status: 'published' | 'draft';
  sort_order: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  code: string;
  status: 'enabled' | 'disabled';
  sort_order: number;
  type?: 'style' | 'feature';
  created_at: string;
  updated_at: string;
}

export interface AdminCategoryInput {
  name: string;
  code?: string;
  status?: 'enabled' | 'disabled';
  sort_order?: number;
  type?: 'style' | 'feature';
}

export interface AdminTemplateListResponse {
  templates: AdminTemplateItem[];
  total: number;
  page: number;
  size: number;
}
