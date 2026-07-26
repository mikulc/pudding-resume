import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ALL_THEME_CATEGORY,
  RESUME_TEMPLATE_CATEGORIES,
  ResumeThemeCards,
  deriveCategories,
  filterResumeThemeEntries,
} from './ResumeThemePicker';
import type { StyleLibraryEntry } from '../../types/resume';

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => options?.name ?? key,
  }),
}));

const entry: StyleLibraryEntry = {
  id: 'classic-horizontal',
  name: '浅蓝通栏',
  highlights: ['清爽通栏'],
  layoutId: 'classic-horizontal',
  categories: ['互联网通用', '前端开发', '校招'],
  previewColors: {
    headerBg: '#dbeafe',
    accentBar: '#3b82f6',
    bodyBg: '#ffffff',
  },
};

describe('ResumeThemeCards', () => {
  it('shows the blank-resume skeleton when demo content is absent', () => {
    const { container } = render(
      <ResumeThemeCards
        entries={[entry]}
        demoContent={null}
        loading={false}
        selectedLayoutId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-resume-skeleton]')).not.toBeNull();
  });

  it('exposes only the product-defined template categories in the expected order', () => {
    expect(deriveCategories([entry])).toEqual([
      ALL_THEME_CATEGORY,
      ...RESUME_TEMPLATE_CATEGORIES,
    ]);
  });

  it('allows one template to appear in multiple categories', () => {
    expect(filterResumeThemeEntries([entry], '前端开发')).toEqual([entry]);
    expect(filterResumeThemeEntries([entry], '校招')).toEqual([entry]);
    expect(filterResumeThemeEntries([entry], '后端开发')).toEqual([]);
  });
});
