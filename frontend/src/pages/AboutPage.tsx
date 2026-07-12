import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import {
  DEFAULT_LOCALE,
  getDefaultLocalePath,
  getLocaleFromPath,
  isSupportedLocale,
} from '../utils/localePath';

export default function AboutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const currentLocale = getLocaleFromPath(location.pathname)
    || (isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE);
  const message = currentLocale === 'en-US'
    ? 'This person is lazy and left nothing here.'
    : '这个人很懒，什么也没留下';

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-950 transition-colors duration-300 dark:text-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-[var(--bg-header)] backdrop-blur-xl transition-colors duration-300 dark:border-white/5">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6">
          <LogoIcon asBrand onClick={() => navigate(getDefaultLocalePath(currentLocale))} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6 pt-[60px]">
        <p className="text-center text-base text-gray-400 dark:text-slate-500">
          {message}
        </p>
      </main>
    </div>
  );
}
