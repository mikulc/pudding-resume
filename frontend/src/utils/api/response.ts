import i18n from '../i18n';

export function errorMessageFrom(data: unknown): string | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message;
  }
  return null;
}

export async function parseResponse<T>(
  response: Response,
  fallbackKey: 'error.requestFailedWithStatus' | 'error.uploadFailedWithStatus' =
    'error.requestFailedWithStatus',
): Promise<T> {
  const rawBody = await response.text();
  let data: unknown;

  try {
    data = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    const preview = rawBody.slice(0, 100);
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
      errorMessageFrom(data) ||
        i18n.t(fallbackKey, { ns: 'common', status: response.status }),
    );
  }

  return data as T;
}

// --- Refresh token management ---

