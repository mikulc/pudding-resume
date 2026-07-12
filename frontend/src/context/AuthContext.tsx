import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getAuthToken, setAuthToken } from '../utils/api';
import { removeCloudPreviewCaches } from '../utils/previewCache';
import { removeCloudDiagnosisCaches } from '../hooks/useDiagnosis';
import { saveSettings } from '../utils/localSettings';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '../types/auth';

// --- Storage keys (kept for username/role only, NOT for token) ---
const USERNAME_KEY = 'pudding_resume_username';
const ROLE_KEY = 'pudding_resume_role';

function hasStoredSessionHint(): boolean {
  try {
    return !!localStorage.getItem(USERNAME_KEY) || !!localStorage.getItem(ROLE_KEY);
  } catch {
    return false;
  }
}

function clearPersistedAuthMetadata(): void {
  try {
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

// --- Module-level preference cache (read by non-React code like SaveSync) ---
let _autoSaveInterval = 120; // default 2 min
let _aiPolishEnabled = true;
let _aiServiceApiUrl = '';
let _aiServiceApiKey = '';
let _aiServiceModel = '';
let _modelSource = 'public'; // "custom" | "public"
let _publicModelId = '';
// Live2D defaults
let _live2dEnabled = false;
let _live2dPosition = 'right';
let _live2dHOffset = 20;
let _live2dVOffset = -40;
let _live2dWidth = 140;
let _live2dHeight = 260;
let _live2dScale = 1;
let _live2dOpacity = 0.8;
let _live2dShowEditor = true;
let _live2dEnablePointerEventsPassThrough = true;
let _live2dPeekVisibleRatio = 0.72;
let _live2dNearbyRetractRatio = 0.28;
let _live2dNearbyBehavior = 'retract';
let _live2dProximityThreshold = 120;
let _live2dRestoreDelay = 400;
let _live2dTransitionDuration = 320;
// 本地存储偏好
let _localStoragePath = '';
// 导出偏好
let _exportJsonWithSettings = false;

/** Get the current auto-save interval (in seconds). Returns 0 if disabled. */
export function getAutoSaveInterval(): number {
  return _autoSaveInterval;
}

/** Get whether AI polish is currently enabled. */
export function isAiPolishEnabled(): boolean {
  return _aiPolishEnabled;
}

/** Get the user-configured AI service API URL. */
export function getAiServiceApiUrl(): string {
  return _aiServiceApiUrl;
}

/** Get the current AI model source ("custom" | "public"). */
export function getModelSource(): string {
  return _modelSource;
}

/** Get the selected public model ID. */
export function getPublicModelId(): string {
  return _publicModelId;
}

/** Get whether Live2D mascot is enabled. */
export function isLive2dEnabled(): boolean {
  return _live2dEnabled;
}

/** Get Live2D position. */
export function getLive2dPosition(): string {
  return _live2dPosition;
}

/** Get Live2D horizontal offset. */
export function getLive2dHOffset(): number {
  return _live2dHOffset;
}

/** Get Live2D vertical offset. */
export function getLive2dVOffset(): number {
  return _live2dVOffset;
}

/** Get Live2D canvas width. */
export function getLive2dWidth(): number {
  return _live2dWidth;
}

/** Get Live2D canvas height. */
export function getLive2dHeight(): number {
  return _live2dHeight;
}

/** Get Live2D model scale. */
export function getLive2dScale(): number {
  return _live2dScale;
}

/** Get Live2D opacity. */
export function getLive2dOpacity(): number {
  return _live2dOpacity;
}

/** Get whether Live2D should show in editor page. */
export function isLive2dShowEditor(): boolean {
  return _live2dShowEditor;
}

/** Get whether Live2D ignores pointer events. */
export function isLive2dPointerEventsPassThroughEnabled(): boolean {
  return _live2dEnablePointerEventsPassThrough;
}

/** Get the default Live2D edge-peek visible ratio. */
export function getLive2dPeekVisibleRatio(): number {
  return _live2dPeekVisibleRatio;
}

/** Get the Live2D visible ratio while the mouse is nearby. */
export function getLive2dNearbyRetractRatio(): number {
  return _live2dNearbyRetractRatio;
}

/** Get how Live2D reacts when the mouse is nearby. */
export function getLive2dNearbyBehavior(): string {
  return _live2dNearbyBehavior;
}

/** Get Live2D mouse proximity threshold in pixels. */
export function getLive2dProximityThreshold(): number {
  return _live2dProximityThreshold;
}

/** Get Live2D restore delay in milliseconds. */
export function getLive2dRestoreDelay(): number {
  return _live2dRestoreDelay;
}

/** Get Live2D transition duration in milliseconds. */
export function getLive2dTransitionDuration(): number {
  return _live2dTransitionDuration;
}

/** Get the user-configured AI service API Key (for guest-mode fallback). */
export function getAiServiceApiKey(): string {
  return _aiServiceApiKey;
}

/** Get the user-configured AI model name (for guest-mode fallback). */
export function getAiServiceModel(): string {
  return _aiServiceModel;
}

/** Get whether local file storage is enabled (i.e. a directory path has been selected).
 * Priority: backend profile cache → LocalStorageButton key → Settings page key. */
export function isLocalStorageEnabled(): boolean {
  if (_localStoragePath) return true;
  try {
    // 1) LocalStorageButton 工具栏存储的路径
    const path = localStorage.getItem('pudding_local_storage_path');
    if (path) return true;
    // 2) Settings 设置页面存储的路径（pudding_resume_settings JSON 对象中）
    const raw = localStorage.getItem('pudding_resume_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings?.local_storage_path) return true;
    }
    return false;
  } catch { return false; }
}

/** Get the local storage directory path (display name).
 * Same fallback chain as isLocalStorageEnabled. */
export function getLocalStoragePath(): string {
  if (_localStoragePath) return _localStoragePath;
  try {
    const path = localStorage.getItem('pudding_local_storage_path');
    if (path) return path;
    const raw = localStorage.getItem('pudding_resume_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings?.local_storage_path) return settings.local_storage_path;
    }
    return '';
  } catch { return ''; }
}

/** Get whether JSON export should include settings. */
export function isExportJsonWithSettingsEnabled(): boolean {
  return _exportJsonWithSettings;
}

function syncPreferences(profile: UserProfile) {
  _autoSaveInterval = profile.auto_save_interval ?? 120;
  _aiPolishEnabled = profile.ai_polish_enabled ?? false;
  _aiServiceApiUrl = profile.ai_service_api_url ?? '';
  _aiServiceApiKey = profile.ai_service_api_key ?? '';
  _aiServiceModel = profile.ai_service_model ?? '';
  _modelSource = profile.model_source ?? 'public';
  _publicModelId = profile.public_model_id ?? '';

  // 同步 AI 配置到 localStorage，确保 getAIConfig() 能读到最新值
  saveSettings({
    model_source: _modelSource,
    public_model_id: _publicModelId,
    ai_service_api_url: _aiServiceApiUrl,
    ai_service_api_key: _aiServiceApiKey,
    ai_service_model: _aiServiceModel,
  });
  _live2dEnabled = profile.live2d_enabled ?? false;
  _live2dPosition = profile.live2d_position ?? 'right';
  _live2dHOffset = profile.live2d_h_offset ?? 20;
  _live2dVOffset = profile.live2d_v_offset ?? -40;
  _live2dWidth = profile.live2d_width ?? 140;
  _live2dHeight = profile.live2d_height ?? 260;
  _live2dScale = profile.live2d_scale ?? 1;
  _live2dOpacity = profile.live2d_opacity ?? 0.8;
  _live2dShowEditor = profile.live2d_show_editor ?? true;
  _live2dEnablePointerEventsPassThrough = profile.live2d_enable_pointer_events_pass_through ?? true;
  _live2dPeekVisibleRatio = profile.live2d_peek_visible_ratio ?? 0.72;
  _live2dNearbyRetractRatio = profile.live2d_nearby_retract_ratio ?? 0.28;
  _live2dNearbyBehavior = profile.live2d_nearby_behavior ?? 'retract';
  _live2dProximityThreshold = profile.live2d_proximity_threshold ?? 120;
  _live2dRestoreDelay = profile.live2d_restore_delay ?? 400;
  _live2dTransitionDuration = profile.live2d_transition_duration ?? 320;
  _localStoragePath = profile.local_storage_path ?? '';
  _exportJsonWithSettings = profile.export_json_with_settings ?? false;
}

// --- Context type ---
interface AuthContextType {
  /** Whether the user is currently logged in */
  isLoggedIn: boolean;
  /** Current username, null if not logged in */
  username: string | null;
  /** Whether the token is present (in-memory), null if not logged in */
  token: string | null;
  /** Current user role ("user" or "admin"), null if not logged in */
  role: string | null;
  /** Current user profile (from server), null if not loaded */
  profile: UserProfile | null;
  /** Whether the profile is being fetched */
  profileLoading: boolean;
  /** Whether we're checking for an existing session on mount */
  sessionLoading: boolean;
  /** Login with email + password */
  login: (req: LoginRequest) => Promise<void>;
  /** Register a new account */
  register: (req: RegisterRequest) => Promise<void>;
  /** Logout — calls server to invalidate tokens, clears local state */
  logout: () => void;
  /** Fetch user profile from server */
  refreshProfile: () => Promise<void>;
  /** Update profile from a partial UserProfile (after avatar upload or name change) */
  setProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// --- Provider ---
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State: token is read from in-memory (api.ts module)
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [username, setUsername] = useState<string | null>(() => {
    return getAuthToken() ? localStorage.getItem(USERNAME_KEY) : null;
  });
  const [role, setRole] = useState<string | null>(() => {
    return getAuthToken() ? localStorage.getItem(ROLE_KEY) : null;
  });
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const isLoggedIn = !!token && !!username;

  // Listen for forced logout from api.ts (e.g. refresh failure)
  useEffect(() => {
    const handleForcedLogout = () => {
      setToken(null);
      setUsername(null);
      setRole(null);
      setProfileState(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  // Listen for silent token refresh from api.ts
  useEffect(() => {
    const handleTokenRefreshed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.token) {
        setToken(detail.token);
        // If we get a new token but have no username, need to fetch profile
        // (the token was obtained by cookie refresh)
      }
    };
    window.addEventListener('auth:tokenRefreshed', handleTokenRefreshed);
    return () => window.removeEventListener('auth:tokenRefreshed', handleTokenRefreshed);
  }, []);

  /** Persist auth state: store metadata in localStorage, token in memory */
  const persist = useCallback((newToken: string, newUsername: string, newRole: string) => {
    setAuthToken(newToken);
    localStorage.setItem(USERNAME_KEY, newUsername);
    localStorage.setItem(ROLE_KEY, newRole);
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);
  }, []);

  /** Fetch user profile from server */
  const refreshProfile = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) return;
    setProfileLoading(true);
    try {
      const data = await api.get<UserProfile>('/api/user/profile');
      setProfileState(data);
      syncPreferences(data);
      // Sync username from server (in case it was updated elsewhere)
      setUsername(data.username);
      setRole(data.role);
      localStorage.setItem(USERNAME_KEY, data.username);
      localStorage.setItem(ROLE_KEY, data.role);
    } catch {
      // Profile fetch failed — token may be expired, handled by api.ts
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // On mount: try to restore session from refresh cookie
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      // If already have token in memory (from legacy migration), fetch profile
      if (getAuthToken()) {
        if (!cancelled) {
          setSessionLoading(false);
          refreshProfile();
        }
        return;
      }

      // If there is no persisted login metadata, there is no known session to restore.
      if (!hasStoredSessionHint()) {
        if (!cancelled) {
          setSessionLoading(false);
        }
        return;
      }

      // Try to get a new access token via cookie refresh
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE || ''}/api/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.token && data.username) {
            if (!cancelled) {
              setAuthToken(data.token);
              setToken(data.token);
              setUsername(data.username);
              setRole(data.role);
              localStorage.setItem(USERNAME_KEY, data.username);
              localStorage.setItem(ROLE_KEY, data.role);
              // Profile will be fetched by the useEffect below
            }
          }
        } else {
          clearPersistedAuthMetadata();
        }
      } catch {
        clearPersistedAuthMetadata();
        // No session — that's ok, user is just not logged in
      }

      if (!cancelled) {
        setSessionLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };

    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch profile when token becomes available
  useEffect(() => {
    if (token) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /** Manually update profile (e.g. after avatar upload) */
  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    syncPreferences(p);
    setUsername(p.username);
    setRole(p.role);
    localStorage.setItem(USERNAME_KEY, p.username);
    localStorage.setItem(ROLE_KEY, p.role);
  }, []);

  const login = useCallback(async (req: LoginRequest) => {
    const res = await api.post<AuthResponse>('/api/auth/login', req);
    persist(res.token, res.username, res.role);
    // Profile will be auto-fetched by the useEffect above
  }, [persist]);

  const register = useCallback(async (req: RegisterRequest) => {
    const res = await api.post<AuthResponse>('/api/auth/register', req);
    persist(res.token, res.username, res.role);
  }, [persist]);

  const logout = useCallback(async () => {
    // Call server to invalidate tokens (best-effort, don't block)
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE || ''}/api/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch {
      // Ignore network errors on logout
    }

    // Clear local state
    setAuthToken(null);
    clearPersistedAuthMetadata();
    // 清除 storageMode 标记，确保下次登录时重新检测本地与云端差异
    localStorage.removeItem('pudding_resume_settings_storage_mode');
    // 清除云端简历的预览缓存和诊断缓存（保留本地简历缓存）
    removeCloudPreviewCaches();
    removeCloudDiagnosisCaches();
    setToken(null);
    setUsername(null);
    setRole(null);
    setProfileState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        username,
        token,
        role,
        profile,
        profileLoading,
        sessionLoading,
        login,
        register,
        logout,
        refreshProfile,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
