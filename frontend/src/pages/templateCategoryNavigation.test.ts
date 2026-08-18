import { describe, expect, it } from 'vitest';
import { ALL_TEMPLATE_CATEGORY } from '../components/template/ResumeTemplateLibrary';
import { buildTemplateCategorySearch, readTemplateCategory } from './templateCategoryNavigation';

describe('template category navigation', () => {
  it('round-trips a selected category through the URL', () => {
    const search = buildTemplateCategorySearch('前端开发');

    expect(readTemplateCategory(new URLSearchParams(search))).toBe('前端开发');
  });

  it('omits the default category from the URL', () => {
    expect(buildTemplateCategorySearch(ALL_TEMPLATE_CATEGORY)).toBe('');
    expect(readTemplateCategory(new URLSearchParams())).toBe(ALL_TEMPLATE_CATEGORY);
  });
});
