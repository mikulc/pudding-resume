import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../types/resume';
import { createEmptyResumeData } from '../../../utils/resumeDraft';
import { PersonalInfoEditor } from './PersonalInfoEditor';

const mockedResume = vi.hoisted(() => ({
  data: null as unknown,
  dispatch: vi.fn(),
  uiDispatch: vi.fn(),
  layoutId: 'skyveil',
  personalHeader: null as unknown,
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
  useAppUI: () => ({
    ui: {
      theme: {
        layoutId: mockedResume.layoutId,
        personalHeader: mockedResume.personalHeader,
      },
    },
    uiDispatch: mockedResume.uiDispatch,
  }),
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
    mockedResume.uiDispatch.mockClear();
    mockedResume.layoutId = 'skyveil';
    mockedResume.personalHeader = DEFAULT_THEME.personalHeader;
  });

  it('uses the active theme portrait style in the popover until customized', () => {
    mockedResume.layoutId = 'teal-ribbon-wave';
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));

    const preview = document.querySelector<HTMLImageElement>('.avatar-preview-grid img')!;
    expect(preview.style.width).toBe('80px');
    expect(preview.style.height).toBe('80px');
    expect(preview.style.borderRadius).toBe('999px');
    expect((document.getElementById('photo-width') as HTMLInputElement).value).toBe('100');
    expect((document.getElementById('photo-height') as HTMLInputElement).value).toBe('100');
  });

  it('uses theme accent tokens for active photo controls', () => {
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));

    const aspectButton = screen.getByRole('button', { name: '3:4' });
    const radiusButton = screen.getByRole('button', { name: 'photo.radius.rounded' });
    const ratioLockButton = screen.getByRole('button', { name: 'photo.lockRatio' });

    for (const button of [aspectButton, radiusButton, ratioLockButton]) {
      expect(button.classList.contains('bg-[var(--theme-accent-soft)]')).toBe(true);
      expect(button.classList.contains('text-[var(--theme-accent)]')).toBe(true);
    }
  });

  it('keeps a dimension input empty while the user replaces its value', () => {
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));

    const widthInput = document.getElementById('photo-width') as HTMLInputElement;
    fireEvent.change(widthInput, { target: { value: '' } });

    expect(widthInput.value).toBe('');
    expect(mockedResume.uiDispatch).not.toHaveBeenCalled();

    fireEvent.change(widthInput, { target: { value: '120' } });
    expect(widthInput.value).toBe('120');
    expect(mockedResume.uiDispatch).toHaveBeenLastCalledWith({
      type: 'SET_PERSONAL_HEADER',
      payload: {
        photoStyle: {
          width: 120,
          height: 160,
          borderRadius: 6,
        },
        photoStyleCustomized: true,
      },
    });
  });

  it('makes the photo square when the circle radius preset is selected', () => {
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));
    fireEvent.click(screen.getByRole('button', { name: 'photo.radius.circle' }));

    expect(mockedResume.uiDispatch).toHaveBeenLastCalledWith({
      type: 'SET_PERSONAL_HEADER',
      payload: {
        photoStyle: {
          width: 100,
          height: 100,
          borderRadius: 999,
        },
        photoStyleCustomized: true,
      },
    });
  });

  it('keeps reset in the header and removes the footer completion action', () => {
    mockedResume.personalHeader = {
      ...DEFAULT_THEME.personalHeader,
      photoStyle: { width: 100, height: 100, borderRadius: 999 },
      photoStyleCustomized: true,
    };
    render(<PersonalInfoEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'photo.adjust' }));

    const resetButton = screen.getByRole('button', { name: 'common:button.reset' });
    expect((resetButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'common:button.done' })).toBeNull();

    fireEvent.click(resetButton);

    expect(mockedResume.uiDispatch).toHaveBeenLastCalledWith({
      type: 'SET_PERSONAL_HEADER',
      payload: {
        photoStyle: { width: 100, height: 133, borderRadius: 6 },
        photoStyleCustomized: false,
      },
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

  it('keeps the photo actions on one compact row inside the card', () => {
    render(<PersonalInfoEditor />);

    const adjustButton = screen.getByRole('button', { name: 'photo.adjust' });
    const deleteButton = screen.getByRole('button', { name: 'common:button.delete' });
    const actionRow = adjustButton.parentElement;

    expect(actionRow).toBe(deleteButton.parentElement);
    expect(['flex-nowrap', 'overflow-hidden', 'gap-0.5'].every((name) => actionRow?.classList.contains(name))).toBe(true);
    expect(['min-w-0', 'px-1.5'].every((name) => adjustButton.classList.contains(name))).toBe(true);
    expect(['min-w-0', 'px-1.5'].every((name) => deleteButton.classList.contains(name))).toBe(true);
  });
});
