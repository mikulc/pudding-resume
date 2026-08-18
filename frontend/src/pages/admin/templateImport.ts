import type { AdminTemplateImportInput } from '../../types/admin';
import type { ResumeData, ThemeLibraryEntry } from '../../types/resume';

type PortableTemplate = Partial<AdminTemplateImportInput> & {
  default_theme_id?: string;
  defaultThemeId?: string;
};

function cleanStringList(values: unknown[]): string[] {
  return [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))];
}

export function normalizeImportedTemplate(
  value: unknown,
  themes: ThemeLibraryEntry[],
  fallbackName: string,
): AdminTemplateImportInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON 中存在无效模板');
  }

  const item = value as PortableTemplate;
  const rawContent = item.content && typeof item.content === 'object' ? item.content : value;
  const legacyThemeId = item.default_theme_id || item.defaultThemeId;
  const layoutId = String(item.layout_id || themes.find((theme) => theme.id === legacyThemeId)?.layoutId || '').trim();
  if (!layoutId || !rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) {
    throw new Error('模板缺少有效的 content 或 layout_id');
  }

  const categoryIds = Array.isArray(item.category_ids) ? cleanStringList(item.category_ids) : [];
  const categoryNames = Array.isArray(item.categories) ? cleanStringList(item.categories) : [];
  if (categoryIds.length === 0 && categoryNames.length === 0) {
    throw new Error('模板缺少有效的 categories 或 category_ids');
  }

  return {
    name: String(item.name || fallbackName).trim(),
    category_ids: categoryIds,
    categories: categoryNames,
    content: rawContent as ResumeData,
    layout_id: layoutId,
    status: item.status === 'draft' ? 'draft' : 'published',
    sort_order: Number(item.sort_order) || 0,
  };
}
