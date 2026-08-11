import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StyledComboInput } from './StyledInputs';

describe('StyledComboInput', () => {
  it('marks the whole dropdown control as open for the accent treatment', () => {
    const { container } = render(
      <StyledComboInput
        label="求职状态"
        value="随时到岗"
        onChange={vi.fn()}
        options={['随时到岗', '一个月内']}
      />,
    );
    const control = container.querySelector('.editor-combo-control');
    const trigger = container.querySelector('.field-trigger');

    expect(control?.getAttribute('data-open')).toBe('false');
    expect(container.querySelector('.field-input--combo')).not.toBeNull();

    fireEvent.click(trigger as Element);

    expect(control?.getAttribute('data-open')).toBe('true');
  });
});
