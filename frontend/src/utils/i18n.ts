import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadSettings, normalizeLanguage } from './localSettings';
import { DEFAULT_LOCALE, getLocaleFromPath } from './localePath';

// ── Import locale resources ──
import commonZh from '../locales/zh-CN/common.json';
import homepageZh from '../locales/zh-CN/homepage.json';
import editorZh from '../locales/zh-CN/editor.json';
import settingsZh from '../locales/zh-CN/settings.json';
import resumeZh from '../locales/zh-CN/resume.json';
import authZh from '../locales/zh-CN/auth.json';
import adminZh from '../locales/zh-CN/admin.json';
import commonEn from '../locales/en-US/common.json';
import homepageEn from '../locales/en-US/homepage.json';
import editorEn from '../locales/en-US/editor.json';
import settingsEn from '../locales/en-US/settings.json';
import resumeEn from '../locales/en-US/resume.json';
import authEn from '../locales/en-US/auth.json';
import adminEn from '../locales/en-US/admin.json';

// Read saved language preference from localStorage
const savedSettings = loadSettings();
const savedLang = savedSettings?.language;
const urlLang = typeof window !== 'undefined' ? getLocaleFromPath(window.location.pathname) : null;
const initialLang = normalizeLanguage(urlLang || savedLang || DEFAULT_LOCALE);

function syncHtmlLang(lang: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = normalizeLanguage(lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        common: commonZh,
        homepage: homepageZh,
        editor: editorZh,
        settings: settingsZh,
        resume: resumeZh,
        auth: authZh,
        admin: adminZh,
      },
      'en-US': {
        common: commonEn,
        homepage: homepageEn,
        editor: editorEn,
        settings: settingsEn,
        resume: resumeEn,
        auth: authEn,
        admin: adminEn,
      },
    },
    lng: initialLang,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: [],
    },
  });

syncHtmlLang(i18n.language);

i18n.on('languageChanged', syncHtmlLang);

// Listen for settings changes (e.g. user switches language in Settings page)
window.addEventListener('pudding:settings-changed', () => {
  const settings = loadSettings();
  if (settings?.language && settings.language !== i18n.language) {
    i18n.changeLanguage(settings.language);
  }
});

export default i18n;
