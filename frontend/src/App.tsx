import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
const MyResumePage = lazy(() => import('./pages/MyResumePage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const ResumePage = lazy(() => import('./pages/ResumePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AIUsagePage = lazy(() => import('./pages/AIUsagePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const ModelsPage = lazy(() => import('./pages/admin/ModelsPage'));
const ChangelogManagePage = lazy(() => import('./pages/admin/ChangelogManagePage'));
const UsagePage = lazy(() => import('./pages/admin/UsagePage'));
import { LoginModal } from './components/auth/LoginModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { ConfirmProvider } from './components/common/ConfirmModal';
import { GlobalContextMenu } from './components/common/GlobalContextMenu';
import { Live2D, type Live2DNearbyBehavior, type Live2DPosition } from './components/effects/Live2D';
import {
  DEFAULT_SETTINGS,
  getStorageMode,
  loadSettings,
  normalizeLanguage,
  saveSettings,
  type LocalSettingsPayload,
} from './utils/localSettings';
import { applyThemeMode, readStoredThemeMode, rememberThemeMode, type ThemeMode } from './utils/themeMode';
import i18n from './utils/i18n';
import { DEFAULT_LOCALE, getDefaultLocalePath, isSupportedLocale } from './utils/localePath';

function Live2DWrapper() {
  const { profile, isLoggedIn } = useAuth();
  const [localSettings, setLocalSettings] = useState<LocalSettingsPayload>(() => (
    loadSettings() ?? DEFAULT_SETTINGS
  ));
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 768px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const refreshLocalSettings = () => {
      setLocalSettings(loadSettings() ?? DEFAULT_SETTINGS);
    };

    window.addEventListener('pudding:settings-changed', refreshLocalSettings);
    window.addEventListener('storage', refreshLocalSettings);
    return () => {
      window.removeEventListener('pudding:settings-changed', refreshLocalSettings);
      window.removeEventListener('storage', refreshLocalSettings);
    };
  }, []);

  const useLocalSettings = !isLoggedIn || getStorageMode() === 'local';
  const live2dSettings = useLocalSettings ? localSettings : profile;

  // 未登录默认开启；登录后按偏好设置决定
  const enabled = live2dSettings?.live2d_enabled ?? false;
  // 编辑器页面按 show_editor 偏好决定
  const isEditor = location.pathname === '/resume' || location.pathname.startsWith('/resume/');
  const showInEditor = live2dSettings?.live2d_show_editor ?? true;
  const showOnMobile = live2dSettings?.live2d_mobile_show ?? false;
  const shouldShow = enabled && (showOnMobile || !isMobile) && (!isEditor || showInEditor);

  // 控制 widget DOM 的显示/隐藏（不删除 DOM，避免触发库内部 parentNode 错误）
  useEffect(() => {
    const el = document.getElementById('live2d-widget');
    if (el) {
      el.style.display = shouldShow ? '' : 'none';
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  // 从偏好设置读取参数，未登录使用默认值
  const position = live2dSettings?.live2d_position || 'right';
  const width = live2dSettings?.live2d_width || 140;
  const height = live2dSettings?.live2d_height || 260;
  const hOffset = live2dSettings?.live2d_h_offset ?? 20;
  const vOffset = live2dSettings?.live2d_v_offset ?? -40;
  const scale = live2dSettings?.live2d_scale || 1;
  const opacity = live2dSettings?.live2d_opacity || 1;
  const enablePointerEventsPassThrough = live2dSettings?.live2d_enable_pointer_events_pass_through ?? true;
  const peekVisibleRatio = live2dSettings?.live2d_peek_visible_ratio ?? 0.72;
  const nearbyRetractRatio = live2dSettings?.live2d_nearby_retract_ratio ?? 0.28;
  const nearbyBehavior = live2dSettings?.live2d_nearby_behavior ?? 'retract';
  const proximityThreshold = live2dSettings?.live2d_proximity_threshold ?? 120;
  const restoreDelay = live2dSettings?.live2d_restore_delay ?? 400;
  const transitionDuration = live2dSettings?.live2d_transition_duration ?? 320;
  const pinned = live2dSettings?.live2d_pinned ?? false;

  return (
    <Live2D
      position={position as Live2DPosition}
      width={width}
      height={height}
      hOffset={hOffset}
      vOffset={vOffset}
      scale={scale}
      opacity={opacity}
      enablePointerEventsPassThrough={enablePointerEventsPassThrough}
      peekVisibleRatio={peekVisibleRatio}
      nearbyRetractRatio={nearbyRetractRatio}
      nearbyBehavior={nearbyBehavior as Live2DNearbyBehavior}
      proximityThreshold={proximityThreshold}
      restoreDelay={restoreDelay}
      transitionDuration={transitionDuration}
      pinned={pinned}
    />
  );
}

function ThemeModeSync() {
  useEffect(() => {
    const applyMode = (mode: ThemeMode) => {
      rememberThemeMode(mode);
      applyThemeMode(mode);
    };

    const syncThemeMode = () => {
      applyMode(readStoredThemeMode());
    };

    const syncThemeModeFromSettings = (event: Event) => {
      const detail = (event as CustomEvent<{
        changedKeys?: string[];
        partial?: Partial<LocalSettingsPayload>;
      }>).detail;

      if (detail?.changedKeys?.includes('theme_mode') || detail?.partial?.theme_mode) {
        applyMode(readStoredThemeMode());
        return;
      }

      syncThemeMode();
    };

    syncThemeMode();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', syncThemeMode);
    window.addEventListener('pudding:settings-changed', syncThemeModeFromSettings);

    return () => {
      media.removeEventListener('change', syncThemeMode);
      window.removeEventListener('pudding:settings-changed', syncThemeModeFromSettings);
    };
  }, []);

  return null;
}

function RouteScrollReset() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ left: 0, top: 0 });
  }, [location.pathname, location.hash]);

  return null;
}

function RootLocaleRedirect() {
  const preferredLanguage = normalizeLanguage(loadSettings()?.language || i18n.language || DEFAULT_LOCALE);
  return <Navigate to={getDefaultLocalePath(preferredLanguage)} replace />;
}

function LocalePublicLayout() {
  const { locale } = useParams<{ locale?: string }>();
  const location = useLocation();

  useEffect(() => {
    if (locale && isSupportedLocale(locale)) {
      if (i18n.language !== locale) {
        i18n.changeLanguage(locale);
      }
      saveSettings({ language: locale });
    }
  }, [locale]);

  if (!isSupportedLocale(locale)) {
    return <Navigate to={getDefaultLocalePath(DEFAULT_LOCALE)} replace />;
  }

  if (location.pathname === `/${locale}/`) {
    return <Navigate to={`/${locale}${location.search}${location.hash}`} replace />;
  }

  return (
    <>
      <HomePage />
      <Outlet />
    </>
  );
}

function LocaleAuthModal({ mode }: { mode: 'login' | 'register' }) {
  const { locale } = useParams<{ locale?: string }>();
  const navigate = useNavigate();
  const lang = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  const closePath = getDefaultLocalePath(lang);

  const close = () => navigate(closePath, { replace: true });
  const switchToLogin = () => navigate(`/${lang}/login`, { replace: true });
  const switchToRegister = () => navigate(`/${lang}/register`, { replace: true });

  return (
    <>
      <LoginModal
        open={mode === 'login'}
        onClose={close}
        onSwitchToRegister={switchToRegister}
      />
      <RegisterModal
        open={mode === 'register'}
        onClose={close}
        onSwitchToLogin={switchToLogin}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<RootLocaleRedirect />} />
                <Route path="/:locale" element={<LocalePublicLayout />}>
                  <Route index element={null} />
                  <Route path="login" element={<LocaleAuthModal mode="login" />} />
                  <Route path="register" element={<LocaleAuthModal mode="register" />} />
                </Route>
                <Route path="/resumes" element={<MyResumePage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/resume/:resumeId?" element={<ResumePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/ai-usage" element={<AIUsagePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/update" element={<ChangelogPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="models" element={<ModelsPage />} />
                  <Route path="changelogs" element={<ChangelogManagePage />} />
                  <Route path="usage" element={<UsagePage />} />
                  <Route path="audit" element={<UsagePage />} />
                </Route>
              </Routes>
            </Suspense>
            <RouteScrollReset />
            <ThemeModeSync />
            <Live2DWrapper />
            <GlobalContextMenu />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
    </div>
  );
}

export default App;
