import { describe, expect, it } from 'vitest';
import type { ThemeLibraryEntry } from '../../types/resume';
import { normalizeImportedTemplate } from './templateImport';

const themes: ThemeLibraryEntry[] = [{
  id: 'theme-id',
  name: '黑白简约',
  layoutId: 'monochrome-rings',
  categories: [],
}];

const content = {
  personalInfo: {},
  education: [],
  workExperience: [],
  projects: [],
  skills: '',
  honors: [],
  summary: '',
  customSections: [],
  sectionConfig: { order: [], titleOverrides: {}, hidden: [] },
};

describe('normalizeImportedTemplate', () => {
  it('preserves portable category names that do not exist in the admin cache', () => {
    const result = normalizeImportedTemplate({
      name: '软件开发工程师应届生简历模板',
      categories: ['应届生', '软件开发'],
      layout_id: 'monochrome-rings',
      status: 'published',
      sort_order: 10,
      content,
    }, themes, 'fallback');

    expect(result.categories).toEqual(['应届生', '软件开发']);
    expect(result.category_ids).toEqual([]);
    expect(result.layout_id).toBe('monochrome-rings');
    expect(result.content).toBe(content);
  });

  it('rejects a template without categories', () => {
    expect(() => normalizeImportedTemplate({
      name: '无分类模板',
      layout_id: 'monochrome-rings',
      content,
    }, themes, 'fallback')).toThrow('categories 或 category_ids');
  });
});
