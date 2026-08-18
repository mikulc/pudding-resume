import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ResumeRenamePopover } from './ResumeRenamePopover';

afterEach(cleanup);

describe('ResumeRenamePopover', () => {
  it('uses the fixed viewport position supplied by the more-actions menu', () => {
    render(
      <ResumeRenamePopover
        open
        position={{ top: 320, left: 640 }}
        popoverRef={createRef<HTMLDivElement>()}
        value="Resume"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const popover = document.querySelector<HTMLInputElement>('#resume-rename-input')?.parentElement;
    expect(popover?.className).toContain('fixed');
    expect(popover?.style.top).toBe('320px');
    expect(popover?.style.left).toBe('640px');
  });

  it('uses the current theme accent for the confirm action', () => {
    render(
      <ResumeRenamePopover
        open
        position={{ top: 320, left: 640 }}
        popoverRef={createRef<HTMLDivElement>()}
        value="Resume"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'common:button.ok' });
    expect(confirmButton.classList.contains('bg-[var(--theme-accent)]')).toBe(true);
    expect(confirmButton.classList.contains('text-[var(--theme-accent-foreground)]')).toBe(true);
  });
});
