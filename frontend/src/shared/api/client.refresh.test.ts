import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeInstance = ReturnType<typeof createFakeAxiosInstance>;

function createFakeAxiosHeaders(input?: Record<string, unknown> | null) {
  const store = new Map<string, string>();

  if (input) {
    Object.entries(input).forEach(([key, value]) => {
      if (value != null) {
        store.set(key.toLowerCase(), String(value));
      }
    });
  }

  return {
    set(key: string, value: string) {
      store.set(key.toLowerCase(), value);
    },
    get(key: string) {
      return store.get(key.toLowerCase());
    },
  };
}

class FakeAxiosHeaders {
  private readonly headers;

  constructor(input?: Record<string, unknown>) {
    this.headers = createFakeAxiosHeaders(input);
  }

  static from(input?: Record<string, unknown>) {
    return new FakeAxiosHeaders(input);
  }

  set(key: string, value: string) {
    this.headers.set(key, value);
  }

  get(key: string) {
    return this.headers.get(key);
  }
}

function createFakeAxiosInstance() {
  const instance = vi.fn(async (config?: unknown) => ({ data: { ok: true }, config }));

  const state: {
    requestHandler?: (config: unknown) => unknown;
    responseErrorHandler?: (error: unknown) => Promise<unknown>;
  } = {};

  const requestUse = vi.fn((handler: (config: unknown) => unknown) => {
    state.requestHandler = handler;
    return 0;
  });
  const responseUse = vi.fn((_: unknown, errorHandler: (error: unknown) => Promise<unknown>) => {
    state.responseErrorHandler = errorHandler;
    return 0;
  });

  Object.assign(instance, {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
    __state: state,
  });

  return instance as typeof instance & {
    interceptors: {
      request: { use: typeof requestUse };
      response: { use: typeof responseUse };
    };
    __state: typeof state;
  };
}

async function loadClientModule(options?: {
  token?: string | null;
  isMockApiEnabled?: boolean;
}) {
  vi.resetModules();

  const apiInstance = createFakeAxiosInstance();
  const createMock = vi.fn().mockReturnValue(apiInstance);

  const getToken = vi.fn(() => options?.token ?? null);
  const clearSession = vi.fn();

  vi.doMock('axios', () => ({
    default: { create: createMock },
    create: createMock,
    AxiosHeaders: FakeAxiosHeaders,
  }));

  vi.doMock('@/shared/config/env', () => ({
    isMockApiEnabled: options?.isMockApiEnabled ?? false,
  }));

  vi.doMock('@/shared/lib/auth', () => ({
    getToken,
    clearSession,
  }));

  const module = await import('@/shared/api/client');

  return {
    api: module.api as unknown as FakeInstance,
    getToken,
    clearSession,
  };
}

describe('shared/api/client 401 handling', () => {
  beforeEach(() => {
    history.pushState({}, '', '/login');
  });

  it('adds Authorization header from session token', async () => {
    const { api } = await loadClientModule({ token: 'access-token' });

    const config = { headers: {} };
    const nextConfig = api.__state.requestHandler?.(config) as {
      headers: { get: (key: string) => string | undefined };
    };

    expect(nextConfig.headers.get('authorization')).toBe('Bearer access-token');
  });

  it('clears session on 401 for non-auth endpoints', async () => {
    const { api, clearSession } = await loadClientModule();

    const error = { config: { url: '/projects', headers: {} }, response: { status: 401 } };
    await expect(api.__state.responseErrorHandler?.(error)).rejects.toBe(error);

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('clears session on 401 for protected route', async () => {
    history.pushState({}, '', '/dashboard');
    const { api, clearSession } = await loadClientModule();

    const error = { config: { url: '/projects', headers: {} }, response: { status: 401 } };
    await expect(api.__state.responseErrorHandler?.(error)).rejects.toBe(error);

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('does not clear session for auth endpoints', async () => {
    const { api, clearSession } = await loadClientModule();

    const error = { config: { url: '/user/auth/login', headers: {} }, response: { status: 401 } };
    await expect(api.__state.responseErrorHandler?.(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });

  it('does not handle non-401 errors', async () => {
    const { api, clearSession } = await loadClientModule();

    const error = { config: { url: '/projects', headers: {} }, response: { status: 500 } };
    await expect(api.__state.responseErrorHandler?.(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });

  it('does not clear session on confirm-email token route', async () => {
    history.pushState({}, '', '/confirm-email/confirm-token');
    const { api, clearSession } = await loadClientModule();

    const error = { config: { url: '/projects', headers: {} }, response: { status: 401 } };
    await expect(api.__state.responseErrorHandler?.(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });

  it('does not clear session on legacy token link', async () => {
    history.pushState({}, '', '/?token=legacy-confirm-token');
    const { api, clearSession } = await loadClientModule();

    const error = { config: { url: '/projects', headers: {} }, response: { status: 401 } };
    await expect(api.__state.responseErrorHandler?.(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });
});
