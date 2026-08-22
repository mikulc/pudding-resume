import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectPreview } from './ProjectPreview';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../context/DiagnosisContext', () => ({
  useDiagnosisContext: () => ({ items: [] }),
}));

vi.mock('../../../context/ResumeContext', () => ({
  useAppUI: () => ({ ui: { theme: {} } }),
  useResume: () => ({
    data: {
      projects: [{
        id: 'project-1',
        name: '项目名称',
        role: '担任角色',
        startDate: '2022-03',
        endDate: '',
        link: '',
        description: '',
      }],
      sectionConfig: { titleOverrides: {} },
    },
  }),
}));

vi.mock('../PreviewShared', () => ({
  ActiveSectionWrapper: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
  useResumeModuleTitles: () => ({ projects: '项目经历' }),
}));

describe('ProjectPreview', () => {
  afterEach(() => cleanup());

  it('does not show a trailing separator when only the start date is set', () => {
    render(<ProjectPreview />);

    expect(screen.getByText('2022-03')).toBeTruthy();
    expect(screen.queryByText('2022-03 -')).toBeNull();
  });
});
