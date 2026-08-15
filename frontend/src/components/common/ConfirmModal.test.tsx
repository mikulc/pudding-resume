import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../utils/i18n';
import { ConfirmProvider, useConfirm } from './ConfirmModal';

function ConfirmTrigger() {
  const confirm = useConfirm();

  return (
    <button
      type="button"
      onClick={() => {
        void confirm.confirm({
          title: '确认删除',
          message: '确定要删除「测试简历」吗？',
        });
      }}
    >
      打开
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('modal-scroll-lock');
  document.documentElement.classList.remove('admin-route-fullscreen');
  document.body.style.overflow = '';
  document.body.style.overscrollBehavior = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.overscrollBehavior = '';
  document.documentElement.style.removeProperty('--modal-scrollbar-width');
  document.documentElement.style.removeProperty('--modal-scroll-gutter-background');
});

describe('ConfirmProvider', () => {
  it('locks the root scrollbar and covers the full screen while open', () => {
    render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    const modal = document.querySelector('[data-confirm-modal]');
    expect(modal?.classList.contains('fixed')).toBe(true);
    expect(modal?.classList.contains('inset-0')).toBe(true);
    expect(document.documentElement.classList.contains('modal-scroll-lock')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(modal!);

    expect(document.documentElement.classList.contains('modal-scroll-lock')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('does not add scrollbar compensation on fullscreen admin pages', () => {
    document.documentElement.classList.add('admin-route-fullscreen');
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this === document.documentElement ? 1000 : 83;
    });

    render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    expect(document.body.style.paddingRight).toBe('');
  });

  it('does not apply a native scrollbar fallback when the mobile viewport has no gutter', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this === document.documentElement ? 390 : 83;
    });

    render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    expect(document.documentElement.style.getPropertyValue('--modal-scrollbar-width')).toBe('0px');
    expect(document.body.style.paddingRight).toBe('');
  });

  it('compensates a scrollbar that is present in the viewport', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this === document.documentElement ? 983 : 100;
    });

    render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    expect(document.documentElement.style.getPropertyValue('--modal-scrollbar-width')).toBe('17px');
    expect(document.body.style.paddingRight).toBe('17px');
  });

  it('keeps the stable gutter without moving the background layout', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(983);

    render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    expect(document.documentElement.style.getPropertyValue('--modal-scrollbar-width')).toBe('0px');
    expect(document.body.style.paddingRight).toBe('');
    expect(document.documentElement.style.getPropertyValue('--modal-scroll-gutter-background')).toContain('color-mix');

    fireEvent.click(document.querySelector('[data-confirm-modal]')!);
    expect(document.documentElement.style.getPropertyValue('--modal-scroll-gutter-background')).toBe('');
  });
});
