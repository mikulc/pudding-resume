import { act, fireEvent, render, screen } from '@testing-library/react';
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
    const toastElement = toast.closest('[data-toast]');
    expect(toastElement?.classList.contains('toast')).toBe(true);
    expect(toastElement?.classList.contains('toast--error')).toBe(true);
    expect(toastElement?.getAttribute('role')).toBe('alert');
    expect(toast.closest('.toast-region')?.classList.contains('z-[10100]')).toBe(true);

    act(() => vi.advanceTimersByTime(5000));
    expect(toastElement?.classList.contains('toast--exiting')).toBe(true);

    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('保存失败')).toBeNull();
    vi.useRealTimers();
  });

  it('dismisses a toast from its close button', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastTrigger /></ToastProvider>);

    const closeButton = screen.getByRole('button', { name: '关闭通知' });
    fireEvent.click(closeButton);

    expect(screen.getByText('保存失败').closest('[data-toast]')?.classList.contains('toast--exiting')).toBe(true);
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('保存失败')).toBeNull();

    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });
});
