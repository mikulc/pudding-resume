import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
import { PersonalInfoEditor } from './PersonalInfoEditor';

const mockedResume = vi.hoisted(() => ({
  data: null as unknown,
  dispatch: vi.fn(),
}));

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

vi.mock('../../../context/ResumeContext', () => ({
  useResume: () => mockedResume,
}));

vi.mock('../../common/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('PersonalInfoEditor photo settings', () => {
  afterEach(cleanup);

  beforeEach(() => {
    const data = createEmptyResumeData();
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        photoUrl: 'data:image/png;base64,fixture',
      },
    };
    mockedResume.dispatch.mockClear();
  });

  it('keeps a dimension input empty while the user replaces its value', () => {
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));

    const widthInput = document.getElementById('photo-width') as HTMLInputElement;
    fireEvent.change(widthInput, { target: { value: '' } });

    expect(widthInput.value).toBe('');
    expect(mockedResume.dispatch).not.toHaveBeenCalled();

    fireEvent.change(widthInput, { target: { value: '120' } });
    expect(widthInput.value).toBe('120');
    expect(mockedResume.dispatch).toHaveBeenLastCalledWith({
      type: 'SET_PERSONAL_INFO',
      payload: {
        photoStyle: {
          width: 120,
          height: 160,
          borderRadius: 6,
        },
      },
    });
  });

  it('makes the photo square when the circle radius preset is selected', () => {
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));
    fireEvent.click(screen.getByRole('button', { name: 'photo.radius.circle' }));

    expect(mockedResume.dispatch).toHaveBeenLastCalledWith({
      type: 'SET_PERSONAL_INFO',
      payload: {
        photoStyle: {
          width: 100,
          height: 100,
          borderRadius: 999,
        },
      },
    });
  });

  it('keeps reset in the header and removes the footer completion action', () => {
    const data = mockedResume.data as ReturnType<typeof createEmptyResumeData>;
    mockedResume.data = {
      ...data,
      personalInfo: {
        ...data.personalInfo,
        photoStyle: { width: 100, height: 100, borderRadius: 999 },
      },
    };
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));

    const resetButton = screen.getByRole('button', { name: 'common:button.reset' });
    expect((resetButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'common:button.done' })).toBeNull();

    fireEvent.click(resetButton);

    expect(mockedResume.dispatch).toHaveBeenLastCalledWith({
      type: 'SET_PERSONAL_INFO',
      payload: { photoStyle: { width: 100, height: 133, borderRadius: 6 } },
    });
  });

  it('does not offer icon replacement for the full name field', () => {
    render(<PersonalInfoEditor />);

    const fullNameCard = document.querySelectorAll<HTMLElement>('.field-card')[0];
    const moreButton = fullNameCard.querySelector<HTMLButtonElement>('button');
    expect(moreButton).not.toBeNull();

    fireEvent.click(moreButton!);

    expect(screen.getByText('fieldMenu.renameLabel')).toBeTruthy();
    expect(screen.getByText('fieldMenu.hideField')).toBeTruthy();
    expect(screen.queryByText('fieldMenu.changeIcon')).toBeNull();
  });

  it('shows a prohibited cursor on the pinned full name drag handle', () => {
    render(<PersonalInfoEditor />);

    const fullNameCard = document.querySelectorAll<HTMLElement>('.field-card')[0];
    const dragHandle = fullNameCard.querySelector<HTMLElement>('.cursor-not-allowed');

    expect(dragHandle).not.toBeNull();
  });
});
