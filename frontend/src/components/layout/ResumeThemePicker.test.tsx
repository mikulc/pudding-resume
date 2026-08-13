import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ALL_THEME_CATEGORY,
  ResumeThemeCards,
  deriveThemeCategories,
  filterResumeThemeEntries,
} from './ResumeThemePicker';
import type { ThemeLibraryEntry } from '../../types/resume';
import { createEmptyResumeData } from '../../utils/resumeDraft';

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => options?.name ?? key,
  }),
}));

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  disconnect() {}
  unobserve() {}
});

const entry: ThemeLibraryEntry = {
  id: 'classic-horizontal',
  name: '现代极简',
  highlights: ['清爽通栏'],
  layoutId: 'classic-horizontal',
  categories: ['简约', '商务'],
  previewColors: {
    headerBg: '#dbeafe',
    accentBar: '#3b82f6',
    bodyBg: '#ffffff',
  },
};

describe('ResumeThemeCards', () => {
  it('shows the blank-resume skeleton when the current resume is empty', () => {
    const { container } = render(
      <ResumeThemeCards
        entries={[entry]}
        content={createEmptyResumeData()}
        loading={false}
        selectedLayoutId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-resume-skeleton]')).not.toBeNull();
  });

  it('renders the current resume content in each theme preview', () => {
    const content = createEmptyResumeData();
    content.personalInfo.fullName = 'Current Resume Name';

    const { getByText } = render(
      <ResumeThemeCards
        entries={[entry]}
        content={content}
        loading={false}
        selectedLayoutId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(getByText('Current Resume Name')).toBeTruthy();
  });

  it('shows the current tag without applying selected-card highlighting', () => {
    const { container } = render(
      <ResumeThemeCards
        entries={[entry]}
        content={createEmptyResumeData()}
        loading={false}
        selectedLayoutId={null}
        currentLayoutId={entry.layoutId}
        showCurrentBadge
        onSelect={vi.fn()}
      />,
    );

    const card = container.querySelector('.resume-theme-card');
    expect(card?.className).not.toContain('resume-theme-card-selected');
    expect(container.querySelector('.resume-theme-current-badge')?.textContent).toContain('themePicker.current');
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
