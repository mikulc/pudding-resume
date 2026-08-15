import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminFormDrawer } from './overlays';

afterEach(cleanup);

describe('AdminFormDrawer', () => {
  it('keeps the drawer open when backdrop dismissal is disabled', () => {
    const onClose = vi.fn();

    render(
      <AdminFormDrawer open onClose={onClose} closeOnBackdrop={false}>
        <div>Drawer content</div>
      </AdminFormDrawer>,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.parentElement!);

    expect(onClose).not.toHaveBeenCalled();
  });
});
