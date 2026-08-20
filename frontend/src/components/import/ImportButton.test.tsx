import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../utils/i18n';

vi.mock('../common/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../utils/importResume', () => ({
  importFromJSON: vi.fn(),
  importFromPDF: vi.fn(),
  importFromWord: vi.fn(),
  importFromMarkdown: vi.fn(),
}));

import { ImportButton } from './ImportButton';

describe('ImportButton', () => {
  afterEach(() => cleanup());

  it('keeps the import menu inside the mobile content edge', () => {
    render(<ImportButton onImportComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /\u5bfc\u5165\u7b80\u5386/ }));

    const menu = screen.getByRole('button', { name: /PDF \u5bfc\u5165/ }).parentElement;
    expect(menu?.classList.contains('left-0')).toBe(true);
    expect(menu?.classList.contains('right-auto')).toBe(true);
    expect(menu?.classList.contains('sm:left-auto')).toBe(true);
    expect(menu?.classList.contains('sm:right-0')).toBe(true);
  });
});
