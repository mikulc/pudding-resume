import { API_BASE } from './config';
import { getAuthToken, setAuthToken } from './authToken';
import { refreshAccessToken, handleUnauthorized } from './refresh';
import { parseResponse } from './response';
import i18n from '../i18n';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
}

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
  const token = getAuthToken();
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
        setAuthToken(newToken);
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

  return parseResponse<T>(response);
}

/**
 * Upload files to an endpoint.
 * Automatically attaches auth token and does NOT set Content-Type
 * (browser will set multipart/form-data with boundary).
 */
export async function upload<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {};
  const token = getAuthToken();
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
      setAuthToken(newToken);
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

  return parseResponse<T>(response, 'error.uploadFailedWithStatus');
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
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers, credentials: 'include' });
  } catch {
    throw new Error(i18n.t('error.network', { ns: 'common' }));
  }

  return parseResponse<T>(response);
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

  del: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'DELETE',
      ...(body === undefined
        ? { headers: {} as Record<string, string> }
        : { body: JSON.stringify(body) }),
    }),
};
