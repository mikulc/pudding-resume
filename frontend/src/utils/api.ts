/**
 * Core API transport layer.
 *
 * This module exposes the low-level request helpers (`request`, `upload`,
 * `publicRequest`) and the generic `api` HTTP wrapper. Business-specific
 * API calls live in `src/api/*` (resumes, export, ai, share, ...).
 *
 * Uses fetch directly — no extra dependencies needed.
 *
 * ## Token Management
 *
 * - Access token: stored in-memory (module variable), never in localStorage.
 *   Short-lived (default 1h), sent as `Authorization: Bearer <token>`.
 * - Refresh token: stored in httpOnly cookie, automatically sent to
 *   `/api/auth/refresh`. JS cannot access it (XSS-safe).
 * - On 401: automatically calls `/api/auth/refresh` to get a new access token,
 *   queues concurrent requests, retries original request. Only forces logout
 *   if refresh also fails.
 *
 * ## Migration from old localStorage tokens
 *
 * Old tokens (stored under `pudding_resume_token`) are read on first load
 * and promoted to in-memory storage. The old key is then removed.
 */

import i18n from './i18n';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// --- In-memory access token ---
let accessToken: string | null = null;

/** Get the current in-memory access token. */
export function getAuthToken(): string | null {
  return accessToken;
}

/** Set the in-memory access token (called on login/refresh). */
export function setAuthToken(token: string | null): void {
  accessToken = token;
}

// --- Legacy localStorage key (for migration) ---
const LEGACY_TOKEN_KEY = 'pudding_resume_token';

/** Load legacy token from localStorage and migrate to in-memory. */
function migrateLegacyToken(): string | null {
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      accessToken = legacy;
      return legacy;
    }
  } catch { /* localStorage unavailable */ }
  return null;
}

// On module init: try to load from legacy localStorage
migrateLegacyToken();

export function apiAssetUrl(endpoint: string): string {
  return `${API_BASE}${endpoint}`;
}

// --- Refresh token management ---

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error || new Error('Refresh failed'));
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Attempt to refresh the access token using the httpOnly refresh cookie.
 * Returns the new access token or null on failure.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // send httpOnly cookie
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.token || null;
  } catch {
    return null;
  }
}

/** Clear stored auth data and redirect to home — only if user was previously logged in */
export function handleUnauthorized(): void {
  const hadToken = !!accessToken;
  accessToken = null;

  if (hadToken) {
    // Only redirect if the user WAS logged in (token expired)
    window.dispatchEvent(new CustomEvent('auth:logout'));
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
}

// --- Core request function ---

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Attach access token if available
  const token = accessToken;
  if (token) {
    config.headers = {
      ...(config.headers as Record<string, string>),
      'Authorization': `Bearer ${token}`,
    };
  }

  // Always include credentials for cookie-based refresh tokens
  config.credentials = 'include';

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new Error(i18n.t('error.network', { ns: 'common' }));
  }

  // For login/register, 401 means wrong credentials (e.g. "邮箱或密码错误"),
  // NOT an expired session. Skip 401 handling entirely so the backend's
  // actual error message falls through to the !response.ok check below.
  const isCredentialEndpoint =
    endpoint === '/api/auth/login' || endpoint === '/api/auth/register';

  // Handle 401 — try refresh, then retry
  if (response.status === 401 && retry && !isCredentialEndpoint) {
    // Skip refresh for auth endpoints themselves
    if (endpoint.startsWith('/api/auth/')) {
      handleUnauthorized();
      throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      await new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
      // Retry with new token, but don't retry again
      return request<T>(endpoint, options, false);
    }

    isRefreshing = true;
    refreshPromise = refreshAccessToken();

    try {
      const newToken = await refreshPromise;
      if (newToken) {
        accessToken = newToken;
        window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', {
          detail: { token: newToken },
        }));
        processQueue(null, newToken);
        // Retry original request with new token
        return request<T>(endpoint, options, false);
      } else {
        processQueue(new Error('Refresh failed'), null);
        handleUnauthorized();
        throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
      }
    } catch {
      processQueue(new Error('Refresh failed'), null);
      handleUnauthorized();
      throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  // Try to parse JSON; fall back gracefully for non-JSON responses
  let data: T;
  try {
    data = await response.json();
  } catch {
    // Response body is not valid JSON (e.g. HTML error page)
    const text = await response.text().catch(() => '');
    const preview = text.slice(0, 100);
    throw new Error(
      response.ok
        ? i18n.t('error.invalidResponse', { ns: 'common', preview })
        : i18n.t('error.requestFailedWithPreview', {
            ns: 'common',
            status: response.status,
            preview: preview || i18n.t('error.emptyResponse', { ns: 'common' }),
          })
    );
  }

  if (!response.ok) {
    throw new Error((data as any)?.message || i18n.t('error.requestFailedWithStatus', { ns: 'common', status: response.status }));
  }

  return data as T;
}

/**
 * Upload files to an endpoint.
 * Automatically attaches auth token and does NOT set Content-Type
 * (browser will set multipart/form-data with boundary).
 */
export async function upload<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {};
  const token = accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
  } catch {
    throw new Error(i18n.t('error.network', { ns: 'common' }));
  }

  if (response.status === 401) {
    // For uploads, try refresh once
    const newToken = await refreshAccessToken();
    if (newToken) {
      accessToken = newToken;
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });
      } catch {
        throw new Error(i18n.t('error.network', { ns: 'common' }));
      }
    } else {
      handleUnauthorized();
      throw new Error(i18n.t('error.authExpired', { ns: 'common' }));
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as any)?.message || i18n.t('error.uploadFailedWithStatus', { ns: 'common', status: response.status }));
  }

  return data as T;
}

/**
 * Request a PUBLIC endpoint (e.g. shared resume view).
 *
 * Behaves like {@link request} but:
 *  - attaches the auth token only if one exists (optional auth),
 *  - does NOT trigger {@link handleUnauthorized} on 401 — these endpoints are
 *    meant to be accessible without login, so a 401 just means "no access".
 *
 * Centralises network-error handling and JSON parsing so public callers stay
 * consistent with the rest of the API layer.
 */
export async function publicRequest<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers, credentials: 'include' });
  } catch {
    throw new Error(i18n.t('error.network', { ns: 'common' }));
  }

  let data: T;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => '');
    const preview = text.slice(0, 100);
    throw new Error(
      response.ok
        ? i18n.t('error.invalidResponse', { ns: 'common', preview })
        : i18n.t('error.requestFailedWithPreview', {
            ns: 'common',
            status: response.status,
            preview: preview || i18n.t('error.emptyResponse', { ns: 'common' }),
          }),
    );
  }

  if (!response.ok) {
    throw new Error(
      (data as any)?.message ||
        i18n.t('error.requestFailedWithStatus', { ns: 'common', status: response.status }),
    );
  }

  return data as T;
}

/** Generic HTTP helpers shared by all business API modules in `src/api/*`. */
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  del: <T>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
      headers: {} as Record<string, string>, // suppress Content-Type for body-less DELETE
    }),
};
