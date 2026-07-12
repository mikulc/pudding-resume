import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Bot,
  Download,
  FileText,
  LayoutTemplate,
  Palette,
  Shield,
  Sparkles,
} from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import Footer from '../components/home/Footer';
import { DEFAULT_LOCALE, getLocaleFromPath, getDefaultLocalePath } from '../utils/localePath';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('homepage');
  const currentLocale = getLocaleFromPath(location.pathname) || DEFAULT_LOCALE;

  const handleStart = () => {
    navigate('/resumes');
  };

  const openTemplates = () => {
    navigate('/templates');
  };

  const templateColors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#111827'];
  const heroTabs = t('hero.mock.tabs', { returnObjects: true }) as string[];
  const heroModules = t('hero.mock.modules', { returnObjects: true }) as Array<{ name: string; status: string; tone: 'success' | 'warning' | 'neutral' }>;
  const heroTemplateTags = t('hero.mock.templateTags', { returnObjects: true }) as string[];
  const heroAiStats = t('hero.mock.aiStats', { returnObjects: true }) as Array<{ label: string; value: string }>;

  return (
    <div className="min-h-screen [overflow-x:clip] bg-[var(--bg-page)] text-gray-950 transition-colors duration-300 dark:text-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/40 bg-[var(--bg-header)]/90 backdrop-blur-xl transition-colors duration-300 dark:border-white/5">
        <div className="relative mx-auto flex h-[60px] w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:px-6">
          <LogoIcon asBrand onClick={() => navigate(getDefaultLocalePath(currentLocale))} />
          <div className="flex items-center gap-2">
            <NavbarAuth />
            <TopNavLinks />
          </div>
        </div>
      </header>

      <section className="hero-shell relative min-h-[calc(100dvh-60px)] [overflow-x:clip] pb-14 pt-20 sm:pt-24 lg:pb-8 lg:pt-[60px]">
        <div className="mx-auto grid min-h-[calc(100dvh-60px)] w-full max-w-[1360px] items-center gap-12 px-5 sm:px-6 lg:grid-cols-[44fr_56fr] lg:gap-10 xl:gap-16">
          <div className="relative z-10 max-w-[560px] text-left">
            <div className="mb-6 inline-flex h-8 max-w-full animate-fade-in-up items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 text-[13px] font-medium text-slate-600 shadow-[0_5px_16px_rgba(15,23,42,0.035)] transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
              <FileText className="h-4 w-4 shrink-0 text-gray-500 dark:text-slate-400" />
              <span className="truncate">{t('hero.badge')}</span>
            </div>

            <h1 className="animate-fade-in-up text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-gray-950 transition-colors duration-300 dark:text-slate-50 sm:text-[clamp(3.25rem,4.5vw,4.25rem)]" style={{ animationDelay: '0.08s' }}>
              <span className="block">{t('hero.heading1')}</span>
              <span className="block font-light text-gray-900 dark:text-slate-200">{t('hero.heading2')}</span>
            </h1>

            <p className="mt-6 max-w-[540px] animate-fade-in-up text-[17px] leading-[1.7] text-slate-600 transition-colors duration-300 dark:text-slate-400 sm:text-[18px]" style={{ animationDelay: '0.18s' }}>
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex w-full animate-fade-in-up flex-col gap-3 min-[390px]:flex-row" style={{ animationDelay: '0.28s' }}>
              <button
                type="button"
                onClick={handleStart}
                className="group inline-flex h-14 min-w-0 items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-7 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-blue-700 hover:shadow-[0_14px_28px_rgba(37,99,235,0.22)] active:translate-y-0 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
                <span className="truncate">{t('hero.ctaPrimary')}</span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={openTemplates}
                className="inline-flex h-14 min-w-0 items-center justify-center gap-2.5 rounded-2xl border border-gray-200 bg-white/80 px-7 text-[15px] font-bold text-gray-800 transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-blue-200 hover:bg-blue-50/70 active:translate-y-0 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.09]"
              >
                <LayoutTemplate className="h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
                <span className="truncate">{t('hero.ctaSecondary')}</span>
              </button>
            </div>

            <div className="mt-6 flex animate-fade-in-up flex-wrap items-center gap-x-5 gap-y-3 text-[13px] font-medium text-slate-500 transition-colors duration-300 dark:text-slate-400" style={{ animationDelay: '0.4s' }}>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                {t('hero.trustBadge1')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                {t('hero.trustBadge2')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                {t('hero.trustBadge3')}
              </span>
            </div>
          </div>

          <div className="relative hidden min-h-[620px] animate-fade-in-up lg:block" style={{ animationDelay: '0.16s' }}>
            <div className="absolute left-1/2 top-1/2 h-[580px] w-[760px] origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.56] sm:scale-[0.72] lg:scale-[0.86] xl:scale-100">
              <div
                className="hero-product-card absolute left-[55px] top-[58px] z-10 h-[475px] w-[610px] overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_28px_70px_rgba(30,64,175,0.13)] will-change-[opacity,transform,filter] dark:border-white/10 dark:bg-[#111827]"
              >
                <div className="flex h-16 items-center gap-1.5 rounded-t-[8px] bg-gray-50 px-5 dark:bg-white/[0.04]">
                  {['#ff5f57', '#ffbd2e', '#28c840'].map(color => (
                    <span
                      key={color}
                      className="h-2.5 w-2.5 rounded-full border border-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),inset_0_-1px_1px_rgba(0,0,0,0.12)]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-3 px-5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1 text-[13px] font-semibold dark:border dark:border-white/[0.08] dark:bg-white/[0.09]">
                    <span className="rounded-full bg-white px-3 py-1.5 text-gray-950 shadow-sm dark:border dark:border-white/[0.14] dark:bg-white/[0.12] dark:text-slate-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_14px_rgba(0,0,0,0.22)]">{heroTabs[0]}</span>
                    <span className="px-3 py-1.5 text-gray-400 dark:text-slate-300">{heroTabs[1]}</span>
                    <span className="px-3 py-1.5 text-gray-400 dark:text-slate-300">{heroTabs[2]}</span>
                  </div>
                </div>
                <div className="space-y-3 px-5 py-5">
                  {heroModules.map(({ name, status, tone }) => (
                    <div key={name} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.03)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
                      <span className="min-w-0 truncate text-[14px] font-semibold text-gray-800 dark:text-slate-200">{name}</span>
                      <span
                        className={[
                          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                          tone === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/[0.12] dark:text-emerald-300' : '',
                          tone === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/[0.12] dark:text-amber-300' : '',
                          tone === 'neutral' ? 'bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-slate-400' : '',
                        ].join(' ')}
                      >
                        {tone !== 'neutral' && (
                          <span className={tone === 'success' ? 'h-1.5 w-1.5 rounded-full bg-emerald-500' : 'h-1.5 w-1.5 rounded-full bg-amber-500'} />
                        )}
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="absolute left-[500px] top-[12px] z-20 h-[224px] w-[300px] overflow-hidden rounded-[18px] border border-gray-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] will-change-[opacity,transform,filter] dark:border-white/10 dark:bg-[#111827]"
              >
                <div className="mb-5 flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-950 dark:text-slate-50">{t('features.items.1.title')}</h2>
                  </div>
                  <LayoutTemplate className="mt-0.5 h-6 w-6 shrink-0 text-gray-300 dark:text-slate-600" />
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-3">
                  {heroTemplateTags.map((title, index) => (
                    <div key={title} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                      <div className="flex h-10 items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: templateColors[index] }} />
                        <span className="whitespace-nowrap text-[13px] font-extrabold text-gray-900 dark:text-slate-200">{title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="absolute left-[485px] top-[338px] z-20 h-[270px] w-[300px] overflow-hidden rounded-[18px] border border-gray-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] will-change-[opacity,transform,filter] dark:border-white/10 dark:bg-[#111827]"
              >
                <div className="mb-5 flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-950 dark:text-slate-50">{t('features.items.5.title')}</h2>
                  </div>
                  <Bot className="mt-0.5 h-6 w-6 shrink-0 text-gray-300 dark:text-slate-600" />
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-300/[0.15] dark:bg-amber-400/10">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[13px] font-extrabold text-gray-950 dark:text-slate-100">{t('hero.mock.ai.title')}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-300/[0.15] dark:text-amber-200">{t('hero.mock.ai.priority')}</span>
                    </div>
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-gray-600 dark:text-slate-300">{t('hero.mock.ai.description')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {heroAiStats.map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.05]">
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-extrabold text-gray-950 dark:text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="absolute left-[10px] top-[400px] z-20 hidden h-[150px] w-[240px] overflow-hidden rounded-[18px] border border-gray-100 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.055)] will-change-[opacity,transform,filter] dark:border-white/10 dark:bg-[#111827]/[0.95] lg:block"
              >
                <div className="mb-4 flex items-center gap-3">
                  <Palette className="h-5 w-5 text-gray-950 dark:text-slate-100" />
                  <span className="text-[15px] font-bold text-gray-950 dark:text-slate-100">{t('features.items.4.title')}</span>
                </div>
                <div className="grid grid-cols-5 gap-2.5">
                  {[
                    ...templateColors,
                    '#14b8a6',
                    '#8b5cf6',
                    '#ef4444',
                    '#64748b',
                    '#0f766e',
                  ].map(color => (
                    <span key={color} className="aspect-square rounded-lg" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              <div
                className="absolute left-[250px] top-[520px] z-20 h-[64px] w-[260px] rounded-[18px] border border-gray-100 bg-white/95 px-5 shadow-[0_12px_30px_rgba(15,23,42,0.055)] will-change-[opacity,transform,filter] dark:border-white/10 dark:bg-[#111827]/[0.95]"
              >
                <div className="flex h-full items-center gap-4">
                  <Download className="h-6 w-6 text-gray-950 dark:text-slate-100" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-gray-950 dark:text-slate-100">{t('hero.mock.export')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

