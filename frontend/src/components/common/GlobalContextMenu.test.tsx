import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../utils/i18n';
import type { UserProfile } from '../../types/auth';

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
  setProfile: vi.fn(),
  showToast: vi.fn(),
  profile: {
    id: 'user-1',
    username: 'tester',
    theme_mode: 'light',
  } as UserProfile,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    profile: mocks.profile,
    setProfile: mocks.setProfile,
  }),
}));

vi.mock('../../utils/api', () => ({
  api: { put: mocks.put },
}));

vi.mock('./Toast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

import { GlobalContextMenu } from './GlobalContextMenu';

describe('GlobalContextMenu theme preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.profile.theme_mode = 'light';
    mocks.put.mockResolvedValue(undefined);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => cleanup());

  it('persists a theme change from the context menu for logged-in users', async () => {
    render(
      <MemoryRouter>
        <GlobalContextMenu />
      </MemoryRouter>,
    );

    fireEvent.contextMenu(document.body, { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole('menuitem', { name: /深色模式|Dark mode/ }));

    await waitFor(() => {
      expect(mocks.put).toHaveBeenCalledWith('/api/user/preferences', { theme_mode: 'dark' });
    });
    expect(mocks.setProfile).toHaveBeenCalledWith(expect.objectContaining({ theme_mode: 'dark' }));
  });
});
