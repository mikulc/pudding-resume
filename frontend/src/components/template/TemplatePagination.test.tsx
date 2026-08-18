import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplatePagination } from './TemplatePagination';

const labels = {
  previousLabel: 'Previous',
  nextLabel: 'Next',
  jumpLabel: 'Template pagination',
  pageLabel: (page: number) => `Go to page ${page}`,
};

describe('TemplatePagination', () => {
  afterEach(() => cleanup());

  it('changes page from the numbered and next controls', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <TemplatePagination
        {...labels}
        currentPage={2}
        totalPages={6}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Go to page 4' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 4);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    expect(screen.getByRole('button', { name: 'Go to page 2' }).getAttribute('aria-current')).toBe('page');
  });

  it('accepts a valid page from the expanding jump control', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <TemplatePagination
        {...labels}
        currentPage={1}
        totalPages={12}
        onPageChange={onPageChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Template pagination' });
    await user.type(input, '8{Enter}');

    expect(onPageChange).toHaveBeenCalledWith(8);
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('does not render when only one page exists', () => {
    const { container } = render(
      <TemplatePagination
        {...labels}
        currentPage={1}
        totalPages={1}
        onPageChange={vi.fn()}
      />,
    );

    expect(container.childElementCount).toBe(0);
  });
});
