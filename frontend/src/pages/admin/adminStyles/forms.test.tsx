import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSelect } from './forms';

describe('AdminSelect', () => {
  it('opens the styled list and selects an option', () => {
    const onChange = vi.fn();
    render(
      <AdminSelect
        value="all"
        options={[
          { value: 'all', label: '全部状态' },
          { value: 'draft', label: '草稿' },
        ]}
        onChange={onChange}
        ariaLabel="发布状态"
      />,
    );

    const trigger = screen.getByRole('button', { name: '发布状态' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('option', { name: '草稿' }));
    expect(onChange).toHaveBeenCalledWith('draft');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
