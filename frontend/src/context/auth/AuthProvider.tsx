import React,{ createContext,useCallback,useContext,useEffect,useState } from 'react';
import { removeCloudDiagnosisCaches } from '../../hooks/useDiagnosis';
import type { AuthResponse,LoginRequest,RegisterRequest,UserProfile } from '../../types/auth';
import { api,getAuthToken,setAuthToken } from '../../utils/api';
import { removeCloudPreviewCaches } from '../../utils/previewCache';

import { syncPreferences } from './preferences';

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
  logout: () => Promise<void>;
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
