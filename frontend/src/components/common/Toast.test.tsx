import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function ToastTrigger() {
  const { showToast } = useToast();
  useEffect(() => showToast('保存失败', 'error'), [showToast]);
  return null;
}

describe('ToastProvider', () => {
  it('renders toast notifications above modal layers', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastTrigger /></ToastProvider>);

    const toast = screen.getByText('保存失败');
    expect(toast.parentElement?.parentElement?.classList.contains('z-[10100]')).toBe(true);

    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });
});
