import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  HardDrive,
  Sparkles,
  SmilePlus,
  Command,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { SettingsContent } from '../components/settings/SettingsContent';
import {
  getSettingsSectionFromHash,
  SETTINGS_SECTION_IDS,
} from '../components/settings/settingsNavigation';

// ---- Section definition for scroll-spy and navigation ----
interface NavSection {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const SCROLL_STORAGE_KEY = 'settings-scroll-y';
const ACTIVE_SECTION_STORAGE_KEY = 'settings-active-section';

const getStoredActiveSection = () => {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
  return stored && SETTINGS_SECTION_IDS.includes(stored as typeof SETTINGS_SECTION_IDS[number])
    ? stored
    : null;
};

export default function SettingsPage() {
  const { isLoggedIn, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('settings');

  const NAV_SECTIONS: NavSection[] = useMemo(() => [
    { id: 'preferences', icon: <Settings className="w-4 h-4" />, label: t('nav.preferences') },
    { id: 'storage', icon: <HardDrive className="w-4 h-4" />, label: t('nav.localStorage') },
    { id: 'ai-service', icon: <Sparkles className="w-4 h-4" />, label: t('nav.aiService') },
    { id: 'live2d', icon: <SmilePlus className="w-4 h-4" />, label: t('nav.live2d') },
    { id: 'shortcuts', icon: <Command className="w-4 h-4" />, label: t('nav.shortcuts') },
    { id: 'about', icon: <Info className="w-4 h-4" />, label: t('nav.about') },
  ], [t]);

  const [activeSection, setActiveSection] = useState<string | null>(() => getStoredActiveSection());
  const [mobileSection, setMobileSection] = useState<string | null>(() => getStoredActiveSection());
  const contentRef = useRef<HTMLDivElement>(null);
  const manualScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Scroll-spy ----
  const setCurrentSection = useCallback((id: string) => {
    setActiveSection(id);
    setMobileSection(id);
    sessionStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, id);
  }, []);

  const updateActiveSection = useCallback(() => {
    if (manualScrollTimer.current) return;

    const sections = SETTINGS_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const maxScrollTop = Math.max(0, scrollHeight - window.innerHeight);
    const lastSection = sections[sections.length - 1];

    if (maxScrollTop - scrollTop <= 2) {
      setCurrentSection(lastSection.id);
      return;
    }

    const activationLine = 120;
    let currentId = sections[0].id;

    for (const section of sections) {
      if (section.getBoundingClientRect().top <= activationLine) {
        currentId = section.id;
      } else {
        break;
      }
    }

    setCurrentSection(currentId);
  }, [setCurrentSection]);

  useEffect(() => {
    const handleScroll = () => updateActiveSection();
    const frame = requestAnimationFrame(updateActiveSection);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (manualScrollTimer.current) clearTimeout(manualScrollTimer.current);
    };
  }, [updateActiveSection]);

  useLayoutEffect(() => {
    // 禁用浏览器原生滚动恢复，改为手动控制，避免刷新时短暂看到页面顶部
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const requestedSection = getSettingsSectionFromHash(location.hash);
    let scrollFrame: number | null = null;

    if (requestedSection) {
      setCurrentSection(requestedSection);
      if (manualScrollTimer.current) clearTimeout(manualScrollTimer.current);
      manualScrollTimer.current = setTimeout(() => {
        manualScrollTimer.current = null;
      }, 800);
      scrollFrame = requestAnimationFrame(() => {
        document.getElementById(requestedSection)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } else {
      // 在 paint 之前同步恢复滚动位置
      const savedY = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedY) {
        window.scrollTo(0, parseInt(savedY, 10));
      }
      updateActiveSection();
    }

    return () => {
      if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, [location.hash, setCurrentSection, updateActiveSection]);

  // 滚动时持续保存位置，卸载时保存最终位置
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
      if (timer) clearTimeout(timer);
    };
  }, []);

  // ---- Navigation click ----
  const handleNavClick = (id: string) => {
    setCurrentSection(id);
    // 标记为手动滚动，阻止 scroll-spy 在平滑滚动期间覆盖 activeSection
    if (manualScrollTimer.current) clearTimeout(manualScrollTimer.current);
    manualScrollTimer.current = setTimeout(() => {
      manualScrollTimer.current = null;
    }, 800);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="settings-page min-h-screen bg-[var(--bg-page)]">
      {/* ================================================================
          Top Navbar — identical style to HomePage
          ================================================================ */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg-header)] backdrop-blur-xl">
        <div className="relative mx-auto flex h-[60px] w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      {/* ================================================================
          Main Content
          ================================================================ */}
      <main ref={contentRef} className="pb-24 pt-20 sm:pt-24">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          {/* ---- Page header ---- */}
          <div className="mb-7 sm:mb-8">
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] dark:text-slate-50 sm:text-[32px]">{t('page.title')}</h1>
            </div>
          </div>

          {/* ================================================================
              Mobile: horizontal tab bar
              ================================================================ */}
          <div className="lg:hidden mb-8">
            <div className="flex flex-wrap gap-1.5">
              {NAV_SECTIONS.map((s) => {
                const isActive = mobileSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleNavClick(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================================
              Desktop: two-column layout (lightweight nav + cards)
              ================================================================ */}
          <div className="flex gap-8 lg:gap-10 items-start">
            {/* ---- Left: lightweight inline nav (desktop only) ---- */}
            <nav className="hidden lg:block w-[180px] flex-shrink-0 sticky top-24">
              <div className="space-y-1">
                {NAV_SECTIONS.map((s) => {
                  const isActive = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleNavClick(s.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        isActive
                          ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)] font-medium'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--theme-accent-foreground)]' : 'text-gray-400'}>
                        {s.icon}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* ---- Right: settings cards ---- */}
            <div className="flex-1 min-w-0">
              <SettingsContent isLoggedIn={isLoggedIn} profile={profile} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
