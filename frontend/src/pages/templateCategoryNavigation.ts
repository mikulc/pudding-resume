import { ALL_TEMPLATE_CATEGORY } from '../components/template/ResumeTemplateLibrary';

const TEMPLATE_CATEGORY_PARAM = 'category';

export function readTemplateCategory(searchParams: URLSearchParams): string {
  return searchParams.get(TEMPLATE_CATEGORY_PARAM) || ALL_TEMPLATE_CATEGORY;
}

export function buildTemplateCategorySearch(category: string): string {
  if (category === ALL_TEMPLATE_CATEGORY) return '';

  const searchParams = new URLSearchParams({ [TEMPLATE_CATEGORY_PARAM]: category });
  return `?${searchParams.toString()}`;
}
