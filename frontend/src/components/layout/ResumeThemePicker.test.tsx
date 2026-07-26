import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResumeThemeCards } from './ResumeThemePicker';
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
  category: '商务',
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
});
