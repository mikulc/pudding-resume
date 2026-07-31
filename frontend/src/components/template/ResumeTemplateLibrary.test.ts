import { describe, expect, it } from 'vitest';
import type { TemplateLibraryEntry } from '../../types/resume';
import {
  ALL_TEMPLATE_CATEGORY,
  RESUME_TEMPLATE_CATEGORIES,
  deriveTemplateCategories,
  filterResumeTemplates,
} from './ResumeTemplateLibrary';

const entry = {
  id: 'frontend',
  name: '前端开发工程师简历',
  industry: '互联网',
  categories: ['前端开发', '校招'],
} as TemplateLibraryEntry;

describe('ResumeTemplateLibrary', () => {
  it('returns product categories in their configured order', () => {
    expect(deriveTemplateCategories([entry])).toEqual([
      ALL_TEMPLATE_CATEGORY,
      ...RESUME_TEMPLATE_CATEGORIES,
    ]);
  });

  it('filters templates by their industry/position categories', () => {
    expect(filterResumeTemplates([entry], ALL_TEMPLATE_CATEGORY)).toEqual([entry]);
    expect(filterResumeTemplates([entry], '前端开发')).toEqual([entry]);
    expect(filterResumeTemplates([entry], '后端开发')).toEqual([]);
  });
});
