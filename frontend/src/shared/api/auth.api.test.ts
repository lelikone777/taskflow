import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/shared/api/client', () => ({
  api: apiMock,
}));

import {
  changePassword,
  completeOAuth,
  confirmPasswordRecovery,
  confirmRegistration,
  login,
  logout,
  me,
  register,
  requestPasswordRecovery,
  startOAuth,
  updateProfile,
} from '@/shared/api/auth';

describe('shared/api/auth', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
  });

  it('register sends backend payload with confirm_password', async () => {
    apiMock.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    const result = await register({
      email: 'user@example.com',
      password: 'Aa!1234567890',
      passwordConfirm: 'Aa!1234567890',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/user/auth/registration', {
      email: 'user@example.com',
      password: 'Aa!1234567890',
      confirm_password: 'Aa!1234567890',
    });
    expect(result).toEqual({ message: 'ok' });
  });

  it('login sends form-urlencoded body', async () => {
    apiMock.post.mockResolvedValueOnce({
      data: { access_token: 'a', refresh_token: 'r' },
    });

    const result = await login({
      email: 'user@example.com',
      password: 'Aa!1234567890',
    });

    const [url, body, config] = apiMock.post.mock.calls[0];
    expect(url).toBe('/user/auth/login');
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body.get('email')).toBe('user@example.com');
    expect(body.get('password')).toBe('Aa!1234567890');
    expect(config).toEqual({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(result).toEqual({ access_token: 'a', refresh_token: 'r' });
  });

  it('confirmRegistration sends token header', async () => {
    apiMock.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    const result = await confirmRegistration('confirm-token');

    expect(apiMock.post).toHaveBeenCalledWith(
      '/user/auth/registration/confirm',
      null,
      { headers: { token: 'confirm-token' } },
    );
    expect(result).toEqual({ message: 'ok' });
  });

  it('recovery confirm sends token header', async () => {
    apiMock.post.mockResolvedValueOnce({
      data: { access_token: 'a2', refresh_token: 'r2' },
    });

    const result = await confirmPasswordRecovery('recovery-token');

    expect(apiMock.post).toHaveBeenCalledWith(
      '/user/auth/recovery/confirm',
      null,
      { headers: { token: 'recovery-token' } },
    );
    expect(result).toEqual({ access_token: 'a2', refresh_token: 'r2' });
  });

  it('requestPasswordRecovery posts email', async () => {
    apiMock.post.mockResolvedValueOnce({ data: { message: 'sent' } });

    const result = await requestPasswordRecovery('user@example.com');

    expect(apiMock.post).toHaveBeenCalledWith('/user/auth/recovery', {
      email: 'user@example.com',
    });
    expect(result).toEqual({ message: 'sent' });
  });

  it('changePassword sends confirm_password', async () => {
    apiMock.post.mockResolvedValueOnce({ data: { message: 'changed' } });

    const result = await changePassword({
      password: 'Bb!1234567890',
      passwordConfirm: 'Bb!1234567890',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/user/auth/passchange', {
      password: 'Bb!1234567890',
      confirm_password: 'Bb!1234567890',
    });
    expect(result).toEqual({ message: 'changed' });
  });

  it('logout calls auth logout endpoint', async () => {
    apiMock.post.mockResolvedValueOnce({ data: { message: 'logout' } });

    const result = await logout();

    expect(apiMock.post).toHaveBeenCalledWith('/user/auth/logout');
    expect(result).toEqual({ message: 'logout' });
  });

  it('me maps snake_case avatar_url and normalizes minio host', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        id: 10,
        email: 'user@example.com',
        username: 'u',
        timezone: 'Europe/Moscow',
        avatar_url: 'http://minio:9000/avatars/10.png',
        projects: [{ id: 1, name: 'P1' }],
      },
    });

    const result = await me();

    expect(apiMock.get).toHaveBeenCalledWith('/user/me');
    expect(result).toEqual({
      id: 10,
      email: 'user@example.com',
      username: 'u',
      timezone: 'Europe/Moscow',
      avatarUrl: 'http://127.0.0.1:9000/avatars/10.png',
      projects: [{ id: 1, name: 'P1' }],
    });
  });

  it('me falls back to /user/avatar when profile has no avatar_url', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          id: 11,
          email: 'fallback@example.com',
          username: null,
          timezone: 'UTC',
          avatar_url: null,
          projects: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          avatar_url: 'http://minio:9000/avatars/11.png',
        },
      });

    const result = await me();

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/user/me');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/user/avatar');
    expect(result).toEqual({
      id: 11,
      email: 'fallback@example.com',
      username: null,
      timezone: 'UTC',
      avatarUrl: 'http://127.0.0.1:9000/avatars/11.png',
      projects: [],
    });
  });

  it('starts and completes Google OAuth through the backend', async () => {
    apiMock.get.mockResolvedValueOnce({ data: { url: 'https://accounts.google.com/auth?state=abc' } });
    apiMock.post.mockResolvedValueOnce({ data: { access_token: 'oauth-a', refresh_token: 'oauth-r' } });

    await expect(startOAuth('google')).resolves.toBe('https://accounts.google.com/auth?state=abc');
    await expect(completeOAuth('google', 'provider-code')).resolves.toEqual({
      access_token: 'oauth-a',
      refresh_token: 'oauth-r',
    });

    expect(apiMock.get).toHaveBeenCalledWith('/user/auth/google/start');
    expect(apiMock.post).toHaveBeenCalledWith('/user/auth/google/callback', { code: 'provider-code' });
  });

  it('updateProfile sends timezone and maps response', async () => {
    apiMock.patch.mockResolvedValueOnce({
      data: {
        id: 12,
        email: 'timezone@example.com',
        username: 'user',
        timezone: 'Europe/Paris',
        avatar_url: null,
        projects: [],
      },
    });

    const result = await updateProfile({ timezone: 'Europe/Paris' });

    expect(apiMock.patch).toHaveBeenCalledWith('/user/me', {
      timezone: 'Europe/Paris',
    });
    expect(result).toEqual({
      id: 12,
      email: 'timezone@example.com',
      username: 'user',
      timezone: 'Europe/Paris',
      avatarUrl: null,
      projects: [],
    });
  });
});
