import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../types/resume';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
import { PersonalInfoPreview } from './PersonalInfoPreview';

const mockedResume = vi.hoisted(() => ({ data: null as unknown, theme: null as unknown }));

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

vi.mock('../../../context/ResumeContext', () => ({
  useResume: () => ({ data: mockedResume.data }),
  useAppUI: () => ({
    ui: {
      theme: mockedResume.theme,
      isSecondaryEditorOpen: false,
    },
    uiDispatch: vi.fn(),
  }),
}));

describe('PersonalInfoPreview', () => {
  beforeEach(() => {
    mockedResume.data = createEmptyResumeData();
    mockedResume.theme = DEFAULT_THEME;
  });

  it('does not render placeholder name or photo for an empty resume', () => {
    const { container } = render(<PersonalInfoPreview />);
    const placeholder = container.querySelector('[data-photo-placeholder="true"]');

    expect(placeholder).toBeNull();
    expect(screen.queryByText('placeholder.previewName')).toBeNull();
    expect(screen.queryByText('photo.upload')).toBeNull();
  });

  it('removes the entire photo area when the configured image is missing', () => {
    const data = createEmptyResumeData();
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        fullName: 'Pudding',
        photoUrl: '/images/avatar.jpg',
      },
    };

    const { container } = render(<PersonalInfoPreview />);
    fireEvent.error(screen.getByRole('img', { name: 'photo.alt' }));

    expect(container.querySelector('.personal-photo')).toBeNull();
  });

  it('renders values separated by pipes in none mode', () => {
    const data = createEmptyResumeData();
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        displayMode: 'none',
        phone: '13888888888',
        email: 'pudding@example.com',
        jobStatus: '随时到岗',
        jobTarget: '前端工程师',
      },
    };

    const { container } = render(<PersonalInfoPreview />);

    expect(container.querySelectorAll('.personal-contact-separator')).toHaveLength(2);
    expect(container.querySelectorAll('.personal-contact-value')).toHaveLength(4);
    expect(container.querySelector('svg')).toBeNull();
  });

  it.each(['left-sidebar-two-column', 'azure-sidebar'])(
    'does not add pipe separators to the %s sidebar layout',
    (layoutId) => {
      const data = createEmptyResumeData();
      mockedResume.theme = { ...DEFAULT_THEME, layoutId };
      mockedResume.data = {
        ...data,
        personalInfo: {
          ...data.personalInfo,
          displayMode: 'none',
          phone: '13888888888',
          email: 'pudding@example.com',
          location: '深圳',
        },
      };

      const { container } = render(<PersonalInfoPreview />);

      expect(container.querySelector('.personal-contact-separator')).toBeNull();
      expect(container.textContent).not.toContain('|');
      expect(container.querySelector('svg')).toBeNull();
    },
  );

  it.each([
    'classic-horizontal',
    'blueprint-icons',
    'monochrome-rings',
    'teal-ribbon-wave',
    'blue-banner-icons',
  ])('renders field icons in icon mode for the %s layout', (layoutId) => {
    const data = createEmptyResumeData();
    mockedResume.theme = { ...DEFAULT_THEME, layoutId };
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        displayMode: 'icon',
        phone: '13888888888',
      },
    };

    const { container } = render(<PersonalInfoPreview />);

    expect(container.querySelector('[data-page-section="personal"] svg')).not.toBeNull();
  });

  it('renders job target and status icons in the azure sidebar objective block', () => {
    const data = createEmptyResumeData();
    mockedResume.theme = { ...DEFAULT_THEME, layoutId: 'azure-sidebar' };
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        displayMode: 'icon',
        jobTarget: '前端工程师',
        jobStatus: '随时到岗',
      },
    };

    const { container } = render(<PersonalInfoPreview />);

    expect(container.querySelectorAll('.azure-sidebar-objective svg')).toHaveLength(2);
  });

  it('groups shallow-sidebar contact details and objective like the azure sidebar', () => {
    const data = createEmptyResumeData();
    mockedResume.theme = { ...DEFAULT_THEME, layoutId: 'left-sidebar-two-column' };
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        fullName: '布丁',
        displayMode: 'icon',
        phone: '13888888888',
        email: 'pudding@example.com',
        jobTarget: '前端工程师',
        jobStatus: '随时到岗',
      },
    };

    const { container } = render(<PersonalInfoPreview />);
    const blocks = container.querySelectorAll('.left-sidebar-two-column-sidebar-block');

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.querySelector('.left-sidebar-two-column-sidebar-title')?.textContent).toBe('联系方式');
    expect(blocks[1]?.querySelector('.left-sidebar-two-column-sidebar-title')?.textContent).toBe('求职意向');
    expect(blocks[1]?.querySelectorAll('svg')).toHaveLength(2);
    expect(container.querySelector('.left-sidebar-two-column-role')).toBeNull();
    expect(container.querySelector('.left-sidebar-two-column-status')).toBeNull();
  });

  it.each([
    'classic-horizontal',
    'blueprint-icons',
    'monochrome-rings',
    'teal-ribbon-wave',
    'blue-banner-icons',
  ])('renders field labels in text mode for the %s layout', (layoutId) => {
    const data = createEmptyResumeData();
    mockedResume.theme = { ...DEFAULT_THEME, layoutId };
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        displayMode: 'text',
        phone: '13888888888',
      },
    };

    const { container } = render(<PersonalInfoPreview />);
    const label = container.querySelector('[data-page-section="personal"] .text-gray-500');

    expect(label).not.toBeNull();
    expect(label?.textContent).toContain(':');
  });

  it('marks none-mode rows for comfortable separator spacing', () => {
    const data = createEmptyResumeData();
    mockedResume.theme = { ...DEFAULT_THEME, layoutId: 'classic-horizontal' };
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        displayMode: 'none',
        phone: '13888888888',
        email: 'pudding@example.com',
      },
    };

    const { container } = render(<PersonalInfoPreview />);

    expect(container.querySelector('.personal-contact-row-none')).not.toBeNull();
  });
});
