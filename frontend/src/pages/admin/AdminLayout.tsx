import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard, Users, Cpu, FileText, BarChart3,
  Shield, ArrowLeft, LogOut, RefreshCw,
  ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LogoIcon from '../../components/common/LogoIcon';
import { Tooltip } from '../../components/common/Tooltip';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_FULL_WIDTH = 248;
const SIDEBAR_ICON_WIDTH = 72;
const DRAWER_WIDTH = 280;
const DRAWER_MAX_WIDTH = 'calc(100vw - 48px)';
const TRANSITION_DURATION = 220; // ms
const STORAGE_KEY = 'admin-sidebar-preference';

type SidebarMode = 'full' | 'icon';

interface NavItemDef {
  to: string;
  icon: LucideIcon;
  key: string;
  end?: boolean;
}

const navItems: NavItemDef[] = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard', end: true },
  { to: '/admin/users', icon: Users, key: 'users' },
  { to: '/admin/models', icon: Cpu, key: 'models' },
  { to: '/admin/changelogs', icon: FileText, key: 'changelogs' },
  { to: '/admin/usage', icon: BarChart3, key: 'usage' },
  { to: '/admin/audit', icon: Shield, key: 'audit' },
];

// ---------------------------------------------------------------------------
// Hook: persist sidebar preference
// ---------------------------------------------------------------------------

function useSidebarPreference(): [SidebarMode | null, (mode: SidebarMode) => void] {
  const [pref, setPref] = useState<SidebarMode | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'full' || stored === 'icon') return stored;
    } catch { /* ignore */ }
    return null;
  });

  const save = useCallback((mode: SidebarMode) => {
    setPref(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }, []);

  return [pref, save];
}

// ---------------------------------------------------------------------------
// Shared sidebar content (used by both desktop sidebar and mobile drawer)
// ---------------------------------------------------------------------------

function SidebarContent({
  collapsed,
  onNavClick,
  showBackToSite = true,
}: {
  collapsed: boolean;
  onNavClick?: () => void;
  showBackToSite?: boolean;
}) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleBackToSite = () => {
    onNavClick?.();
    navigate('/');
  };

  return (
    <>
      {/* Brand header */}
      <div className="border-b border-[#EEF1F5] px-[14px] py-4 dark:border-gray-800">
        <div className="admin-sidebar-item admin-sidebar-brand">
          <span className="admin-sidebar-icon">
            <LogoIcon className="h-9 w-9" />
          </span>
          <div className="admin-sidebar-label-wrapper">
            <div className="admin-sidebar-label">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
                {t('layout.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-[14px] py-4">
        {navItems.map(({ to, icon: Icon, key, end }) => {
          const label = t(`nav.${key}`) as string;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavClick}
              className={({ isActive }) =>
                `admin-sidebar-item h-11 w-full rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-[#3272FF]/[0.08] text-[#3272FF] dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-500 hover:bg-[#F5F7FB] hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
              title={collapsed ? label : undefined}
            >
              <span className="admin-sidebar-icon"><Icon size={19} /></span>
              <span className="admin-sidebar-label-wrapper">
                <span className="admin-sidebar-label">{label}</span>
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="admin-sidebar-footer border-t border-[#EEF1F5] dark:border-gray-800">
            {showBackToSite && (
              <Tooltip content={collapsed ? t('layout.backToSite') as string : ''} position="right" enabled triggerClassName="w-full">
                <button
                  onClick={handleBackToSite}
                  aria-label={t('layout.backToSite') as string}
                  className="admin-sidebar-footer-action w-full text-sm font-medium text-slate-500 hover:bg-[#F5F7FB] hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <span className="admin-sidebar-footer-icon"><ArrowLeft size={19} /></span>
                  <span className="admin-sidebar-footer-label">{t('layout.backToSite')}</span>
                </button>
              </Tooltip>
            )}
            <Tooltip content={collapsed ? t('layout.logout') as string : ''} position="right" enabled triggerClassName="w-full">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                aria-label={t('layout.logout') as string}
                className="admin-sidebar-footer-action w-full text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-500 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <span className="admin-sidebar-footer-icon"><LogOut size={19} /></span>
                <span className="admin-sidebar-footer-label">{t('layout.logout')}</span>
              </button>
            </Tooltip>
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[6px]"
            style={{ animation: 'adminFadeIn 180ms ease-out' }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-[20px] border border-[#E6EAF2] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900"
              style={{ animation: 'adminModalIn 200ms ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                确认退出登录？
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                退出后需要重新登录才能进入后台。
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#E6EAF2] bg-white px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-[#F8FAFF] hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] bg-red-50 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 dark:bg-red-950/35 dark:text-red-300 dark:hover:bg-red-950/55"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer (portal)
// ---------------------------------------------------------------------------

function MobileDrawer({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Animation lifecycle
  useEffect(() => {
    if (open) {
      setVisible(true);
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
          // Focus the drawer itself when opened
          setTimeout(() => drawerRef.current?.focus(), 50);
        });
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setAnimating(false);
      // Return focus to menu button
      setTimeout(() => returnFocusRef.current?.focus(), 50);
      const timer = setTimeout(() => setVisible(false), TRANSITION_DURATION + 40);
      return () => clearTimeout(timer);
    }
  }, [open, returnFocusRef]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!visible) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] transition-opacity"
        style={{
          background: 'rgba(15, 23, 42, 0.28)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: animating ? 1 : 0,
          transitionDuration: `${TRANSITION_DURATION}ms`,
          transitionTimingFunction: 'ease-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="fixed inset-y-0 left-0 z-[910] flex flex-col bg-white shadow-[0_0_40px_rgba(15,23,42,0.12)] outline-none dark:bg-gray-900"
        style={{
          width: `${DRAWER_WIDTH}px`,
          maxWidth: DRAWER_MAX_WIDTH,
          transform: animating ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        {/* Sidebar content — brand area becomes the sole drawer header */}
        <SidebarContent collapsed={false} onNavClick={onClose} showBackToSite={false} />
      </div>
    </>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Main AdminLayout
// ---------------------------------------------------------------------------

export default function AdminLayout() {
  const { role, isLoggedIn, sessionLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('admin');

  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1199px)');

  // Sidebar preference
  const [storedPref, savePref] = useSidebarPreference();

  // Mobile drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Compute effective collapsed state
  const effectiveCollapsed: boolean = (() => {
    if (isMobile) return false; // mobile uses drawer, irrelevant
    if (storedPref !== null) return storedPref === 'icon';
    // Defaults: tablet → icon, desktop → full
    return isTablet;
  })();

  const toggleCollapsed = useCallback(() => {
    const nextMode: SidebarMode = effectiveCollapsed ? 'full' : 'icon';
    savePref(nextMode);
  }, [effectiveCollapsed, savePref]);

  // Body scroll lock when mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, mobileDrawerOpen]);

  // Fullscreen admin route class
  useEffect(() => {
    document.documentElement.classList.add('admin-route-fullscreen');
    document.body.classList.add('admin-route-fullscreen');

    return () => {
      document.documentElement.classList.remove('admin-route-fullscreen');
      document.body.classList.remove('admin-route-fullscreen');
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Auth gate
  useEffect(() => {
    if (sessionLoading) return;
    if (!isLoggedIn || role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, role, sessionLoading, navigate]);

  // Loading state
  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <RefreshCw className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!isLoggedIn || role !== 'admin') return null;

  const sidebarWidth = effectiveCollapsed ? SIDEBAR_ICON_WIDTH : SIDEBAR_FULL_WIDTH;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8FA] text-slate-700 dark:bg-gray-950" data-admin-collapsed={effectiveCollapsed}>
      {/* ================================================================ */}
      {/* Desktop / Tablet Sidebar                                         */}
      {/* ================================================================ */}
      {!isMobile && (
        <aside
          data-collapsed={effectiveCollapsed}
          className="admin-sidebar relative shrink-0 overflow-visible border-r border-[#E9EDF3] bg-white/95 dark:border-gray-800 dark:bg-gray-900"
          style={{
            width: sidebarWidth,
            transition: `width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {/* Toggle button — placed on right edge */}
          <div className="admin-sidebar-inner flex h-full min-w-0 flex-col overflow-hidden">
            <SidebarContent collapsed={effectiveCollapsed} />
          </div>

          <button
            onClick={toggleCollapsed}
            aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="admin-sidebar-toggle absolute -right-4 top-[30px] z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#E6EBF2] bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3272FF]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
          >
            {effectiveCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </aside>
      )}

      {/* ================================================================ */}
      {/* Main area                                                        */}
      {/* ================================================================ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        {isMobile && (
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#E9EDF3] bg-white/95 px-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition-colors hover:bg-[#F5F7FB] hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Menu size={20} />
            </button>

            {/* Page title — derived from current route */}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
                <MobilePageTitle />
              </h2>
            </div>

            {/* Right-side actions */}
            <Tooltip content={t('layout.backToSite') as string} enabled>
              <button
                onClick={() => navigate('/')}
                aria-label={t('layout.backToSite') as string}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-slate-400 transition-colors hover:bg-[#F5F7FB] hover:text-slate-700 dark:hover:bg-gray-800"
              >
                <ArrowLeft size={18} />
              </button>
            </Tooltip>
          </header>
        )}

        {/* Main content */}
        <main
          className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto max-w-[1440px] px-6 py-7 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ================================================================ */}
      {/* Mobile drawer                                                     */}
      {/* ================================================================ */}
      {isMobile && (
        <MobileDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          returnFocusRef={mobileMenuButtonRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile page title helper — maps route to translated title
// ---------------------------------------------------------------------------

function MobilePageTitle() {
  const location = useLocation();
  const { t } = useTranslation('admin');

  const routeTitleMap: Record<string, string> = {
    '/admin': t('nav.dashboard'),
    '/admin/users': t('nav.users'),
    '/admin/models': t('nav.models'),
    '/admin/changelogs': t('nav.changelogs'),
    '/admin/usage': t('nav.usage'),
    '/admin/audit': t('nav.audit'),
  };

  return <>{routeTitleMap[location.pathname] ?? ''}</>;
}
