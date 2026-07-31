import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ALL_THEME_CATEGORY,
  ResumeThemeCards,
  deriveThemeCategories,
  filterResumeThemeEntries,
} from './ResumeThemePicker';
import type { ThemeLibraryEntry } from '../../types/resume';

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => options?.name ?? key,
  }),
}));

const entry: ThemeLibraryEntry = {
  id: 'classic-horizontal',
  name: '现代极简',
  highlights: ['清爽通栏'],
  layoutId: 'classic-horizontal',
  categories: ['简约', '商务', '单栏'],
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

  it('derives available visual categories in product order', () => {
    expect(deriveThemeCategories([entry])).toEqual([
      ALL_THEME_CATEGORY,
      '简约',
      '商务',
      '单栏',
    ]);
  });

  it('filters themes by visual category', () => {
    expect(filterResumeThemeEntries([entry], ALL_THEME_CATEGORY)).toEqual([entry]);
    expect(filterResumeThemeEntries([entry], '商务')).toEqual([entry]);
    expect(filterResumeThemeEntries([entry], '双栏')).toEqual([]);
  });
});
