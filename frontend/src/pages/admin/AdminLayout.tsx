import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, RefreshCw, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NavbarAuth } from '../../components/auth/NavbarAuth';
import LogoIcon from '../../components/common/LogoIcon';
import { TopNavLinks } from '../../components/common/TopNavLinks';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard', end: true },
  { to: '/admin/users', icon: Users, key: 'users', end: false },
] as const;

export default function AdminLayout() {
  const { role, isLoggedIn, sessionLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('admin');

  useEffect(() => {
    if (sessionLoading) return;
    if (!isLoggedIn || role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, role, sessionLoading, navigate]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <RefreshCw className="animate-spin text-gray-400" size={30} />
      </div>
    );
  }

  if (!isLoggedIn || role !== 'admin') return null;

  return (
    <div className="admin-page min-h-screen bg-[var(--bg-page)] text-[#111827] transition-colors duration-200 dark:text-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-[var(--bg-header)] backdrop-blur-xl dark:border-white/5">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <main className="pb-24 pt-20 sm:pt-24">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          <div className="mb-7 sm:mb-8">
            <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] dark:text-slate-50 sm:text-[32px]">
              {t('layout.title')}
            </h1>
          </div>

          <nav className="mb-8 flex flex-wrap gap-1.5 lg:hidden" aria-label={t('layout.title')}>
            {navItems.map(({ to, icon: Icon, key, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-start gap-8 lg:gap-10">
            <nav className="sticky top-24 hidden w-[180px] shrink-0 lg:block" aria-label={t('layout.title')}>
              <div className="space-y-1">
                {navItems.map(({ to, icon: Icon, key, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--theme-accent)] font-medium text-[var(--theme-accent-foreground)]'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {t(`nav.${key}`)}
                  </NavLink>
                ))}
              </div>
            </nav>

            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
