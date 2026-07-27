import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../types/resume';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
import { PersonalInfoPreview } from './PersonalInfoPreview';

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

vi.mock('../../../context/ResumeContext', () => ({
  useResume: () => ({ data: createEmptyResumeData() }),
  useAppUI: () => ({
    ui: {
      theme: DEFAULT_THEME,
      isSecondaryEditorOpen: false,
    },
    uiDispatch: vi.fn(),
  }),
}));

describe('PersonalInfoPreview', () => {
  it('does not render placeholder name or photo for an empty resume', () => {
    const { container } = render(<PersonalInfoPreview />);
    const placeholder = container.querySelector('[data-photo-placeholder="true"]');

    expect(placeholder).toBeNull();
    expect(screen.queryByText('placeholder.previewName')).toBeNull();
    expect(screen.queryByText('photo.upload')).toBeNull();
  });
});
