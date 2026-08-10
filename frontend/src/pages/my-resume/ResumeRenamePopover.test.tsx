import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ResumeRenamePopover } from './ResumeRenamePopover';

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
});
