import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '../../utils/i18n';

const authState = vi.hoisted(() => ({
  isLoggedIn: false,
  username: null as string | null,
  role: 'user',
  sessionLoading: false,
  profile: null as null | {
    max_resumes: number;
    used_resumes: number;
    export_count: number;
    daily_limit_tokens: number;
    monthly_limit_tokens: number;
  },
  profileLoading: false,
  refreshProfile: vi.fn(),
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

function renderNavbar(
  initialEntry = '/zh-CN',
  settingsShortcut?: { label: string; onClick: () => void },
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NavbarAuth settingsShortcut={settingsShortcut} />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NavbarAuth', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  beforeEach(() => {
    authState.isLoggedIn = false;
    authState.username = null;
    authState.role = 'user';
    authState.sessionLoading = false;
    authState.profile = null;
    authState.profileLoading = false;
    authState.refreshProfile.mockReset();
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
    expect(menu.classList.contains('mobile-control-center__panel')).toBe(true);
    expect(screen.getByText('\u529f\u80fd')).not.toBeNull();
    expect(screen.getByText('\u9875\u9762')).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: '\u6df1\u8272\u6a21\u5f0f' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: '\u6211\u7684\u7b80\u5386' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: '\u7b80\u5386\u6a21\u677f' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: '\u8bbe\u7f6e' })).not.toBeNull();
  });

  it('shows profile usage metrics at the top of the mobile control center', () => {
    authState.isLoggedIn = true;
    authState.profile = {
      max_resumes: 10,
      used_resumes: 3,
      export_count: 18,
      daily_limit_tokens: 2_000,
      monthly_limit_tokens: 50_000,
    };
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: '\u4e2d\u63a7\u53f0' }));

    const stats = screen.getByLabelText('\u8d26\u6237\u7528\u91cf');
    expect(stats.textContent).toContain('\u6211\u7684\u7b80\u53863');
    expect(stats.textContent).toContain('\u5269\u4f59\u540d\u989d7');
    expect(stats.textContent).toContain('\u5269\u4f59\u5bfc\u51fa18');
    expect(stats.textContent).toContain('AI \u989d\u5ea65\u4e07');
    expect(authState.refreshProfile).toHaveBeenCalledTimes(1);
  });

  it('finishes the sidebar exit animation before navigating to a selected page', () => {
    vi.useFakeTimers();
    renderNavbar('/zh-CN');

    fireEvent.click(screen.getByRole('button', { name: '\u4e2d\u63a7\u53f0' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '\u6211\u7684\u7b80\u5386' }));

    expect(document.querySelector('.mobile-control-center')?.classList.contains('is-closing')).toBe(true);
    expect(screen.getByTestId('location').textContent).toBe('/zh-CN');

    act(() => vi.advanceTimersByTime(499));
    expect(screen.getByTestId('location').textContent).toBe('/zh-CN');

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('location').textContent).toBe('/resumes');
    expect(screen.queryByRole('menu', { name: '\u4e2d\u63a7\u53f0' })).toBeNull();
  });

  it('finishes the exit animation before running the settings shortcut', () => {
    vi.useFakeTimers();
    const openSettings = vi.fn();
    renderNavbar('/resumes', { label: '\u8bbe\u7f6e', onClick: openSettings });

    fireEvent.click(screen.getByRole('button', { name: '\u4e2d\u63a7\u53f0' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '\u8bbe\u7f6e' }));

    expect(openSettings).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(499));
    expect(openSettings).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location').textContent).toBe('/resumes');
  });
});
