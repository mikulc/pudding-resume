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

import { API_BASE } from './config';
