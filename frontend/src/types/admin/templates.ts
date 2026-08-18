import type { ResumeData } from '../resume';

export interface AdminTemplateItem {
  id: string;
  name: string;
  categories: string[];
  category_ids: string[];
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
  category_ids: string[];
  content: ResumeData;
  layout_id: string;
  status: 'published' | 'draft';
  sort_order: number;
}

export interface AdminTemplateImportInput extends Omit<AdminTemplateInput, 'category_ids'> {
  category_ids?: string[];
  categories?: string[];
}

export interface AdminCategory {
  id: string;
  name: string;
  status: 'enabled' | 'disabled';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminCategoryInput {
  name: string;
  status?: 'enabled' | 'disabled';
  sort_order?: number;
}

export interface AdminTemplateListResponse {
  templates: AdminTemplateItem[];
  total: number;
  page: number;
  size: number;
}
