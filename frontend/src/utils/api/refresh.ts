import { API_BASE } from './config';
import { getAuthToken, setAuthToken } from './authToken';

/**
 * Attempt to refresh the access token using the httpOnly refresh cookie.
 * Returns the new access token or null on failure.
 */
export async function refreshAccessToken(): Promise<string | null> {
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
  const hadToken = !!getAuthToken();
  setAuthToken(null);

  if (hadToken) {
    // Only redirect if the user WAS logged in (token expired)
    window.dispatchEvent(new CustomEvent('auth:logout'));
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
}

// --- Core request function ---

