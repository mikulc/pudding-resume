import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
  document.documentElement.classList.remove('modal-scroll-lock');
  document.body.style.overflow = '';
  document.body.style.overscrollBehavior = '';
  document.documentElement.style.overscrollBehavior = '';
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
});
