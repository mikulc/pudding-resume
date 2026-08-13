import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '../../utils/i18n';

const authState = vi.hoisted(() => ({
  isLoggedIn: false,
  username: null as string | null,
  role: 'user',
  sessionLoading: false,
}));

const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../common/Toast', () => ({
  useToast: () => toastMocks,
}));

import { NavbarAuth } from './NavbarAuth';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderNavbar(initialEntry = '/zh-CN') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavbarAuth />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NavbarAuth', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    authState.isLoggedIn = false;
    authState.username = null;
    authState.role = 'user';
    authState.sessionLoading = false;
    toastMocks.showToast.mockReset();
  });

  it('shows icon navigation instead of login and register buttons when logged out', () => {
    renderNavbar();

    expect(screen.queryByRole('button', { name: /\u6ce8\u518c/ })).toBeNull();
    expect(screen.getByRole('button', { name: /\u767b\u5f55/ })).not.toBeNull();
    expect(document.querySelector('svg.lucide-chart-column')).not.toBeNull();
  });

  it('opens the localized login page when a logged-out user clicks the profile icon', () => {
    renderNavbar('/zh-CN?from=home');

    fireEvent.click(screen.getByRole('button', { name: /\u767b\u5f55/ }));

    expect(screen.getByTestId('location').textContent).toBe('/zh-CN/login');
  });

  it('opens the profile page when a logged-in user clicks the profile icon', () => {
    authState.isLoggedIn = true;
    authState.username = 'Pudding';
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Pudding' }));

    expect(screen.getByTestId('location').textContent).toBe('/profile');
  });

  it('shows a hint and opens login without rendering the usage page when logged out', () => {
    renderNavbar('/zh-CN');

    fireEvent.click(screen.getByRole('button', { name: /\u7528\u91cf\u4fe1\u606f/ }));

    expect(toastMocks.showToast).toHaveBeenCalledWith('\u672a\u767b\u5f55\uff0c\u8bf7\u5148\u767b\u5f55', 'info');
    expect(screen.getByTestId('location').textContent).toBe('/zh-CN/login');
  });
});
