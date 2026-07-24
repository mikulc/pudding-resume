import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./i18n', () => ({
  default: {
    t: (key: string, params?: Record<string, unknown>) =>
      `${key}:${String(params?.preview ?? params?.status ?? '')}`,
  },
}));

import { api, publicRequest, setAuthToken } from './api';

describe('API transport', () => {
  beforeEach(() => {
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  it('preserves the backend error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: '业务校验失败' }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(publicRequest('/api/example')).rejects.toThrow('业务校验失败');
  });

  it('includes a preview when the server returns invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>gateway failure</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    await expect(publicRequest('/api/example')).rejects.toThrow(
      'error.requestFailedWithPreview:<html>gateway failure</html>',
    );
  });

  it('shares one refresh request between concurrent 401 responses', async () => {
    setAuthToken('expired-token');
    let protectedRequests = 0;
    let refreshRequests = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/auth/refresh')) {
          refreshRequests += 1;
          return new Response(JSON.stringify({ token: 'fresh-token' }), {
            status: 200,
          });
        }

        protectedRequests += 1;
        const authorization = new Headers(init?.headers).get('Authorization');
        if (authorization === 'Bearer fresh-token') {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ message: 'expired' }), { status: 401 });
      }),
    );

    const [first, second] = await Promise.all([
      api.get<{ ok: boolean }>('/api/protected'),
      api.get<{ ok: boolean }>('/api/protected'),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(refreshRequests).toBe(1);
    expect(protectedRequests).toBe(4);
  });
});
