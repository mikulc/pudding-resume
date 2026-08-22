import { describe, expect, it } from 'vitest';
import { formatDateRange } from './dateRange';

describe('formatDateRange', () => {
  it('joins the start and end dates when both are set', () => {
    expect(formatDateRange('2022-03', '2022-12')).toBe('2022-03 - 2022-12');
  });

  it('shows only the start date when the end date is empty', () => {
    expect(formatDateRange('2022-03', '')).toBe('2022-03');
  });

  it('does not add a separator around a single end date', () => {
    expect(formatDateRange('', '2022-12')).toBe('2022-12');
  });
});
