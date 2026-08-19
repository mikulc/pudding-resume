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

  it('uses the same heavier visual weight and dark-mode color for navbar actions', () => {
    authState.isLoggedIn = true;
    authState.role = 'admin';
    renderNavbar();

    const profileIcon = document.querySelector('svg.lucide-user');
    const usageButton = document.querySelector('svg.lucide-chart-column')?.closest('button');
    const adminButton = document.querySelector('svg.lucide-shield')?.closest('button');
    const actionIcons = [
      profileIcon,
      usageButton?.querySelector('svg'),
      adminButton?.querySelector('svg'),
    ];

    expect(usageButton?.classList.contains('dark:!text-white')).toBe(true);
    expect(adminButton?.classList.contains('dark:!text-white')).toBe(true);
    actionIcons.forEach((icon) => {
      expect(icon?.classList.contains('h-5')).toBe(true);
      expect(icon?.getAttribute('stroke-width')).toBe('3.6');
    });
  });

  it('uses the three-piece control-center glyph and exposes its open state', () => {
    renderNavbar();

    const trigger = screen.getByRole('button', { name: '\u4e2d\u63a7\u53f0' });
    const glyph = trigger.querySelector('.control-center-glyph');

    expect(glyph?.querySelectorAll('.control-center-glyph__block')).toHaveLength(3);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(glyph?.getAttribute('data-open')).toBe('true');
    const menu = screen.getByRole('menu', { name: '\u4e2d\u63a7\u53f0' });
    expect(menu).not.toBeNull();
    expect(menu.classList.contains('anheyu-glass-popover')).toBe(true);
  });
});
