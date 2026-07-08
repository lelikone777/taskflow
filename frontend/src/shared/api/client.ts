import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { isMockApiEnabled } from '@/shared/config/env';
import { clearSession, getToken } from '@/shared/lib/auth';
import { mockAdapter, mockToken } from './mock-adapter';

function normalizeBaseUrl(rawUrl: string | undefined, fallback: string, stripUserSuffix = false): string {
  const trimmed = (rawUrl ?? fallback).trim().replace(/\/+$/, '') || fallback;
  if (!stripUserSuffix) {
    return trimmed;
  }

  return trimmed.replace(/\/user$/, '') || fallback;
}

const baseURL = normalizeBaseUrl(import.meta.env.VITE_API_URL, '/api/tasks', true);
const flowBaseURL = normalizeBaseUrl(import.meta.env.VITE_FLOW_API_URL, '/api/flow');

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : AxiosHeaders.from(config.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;
}

function isAuthEndpoint(url: string) {
  return (
    url.includes('/user/auth/login') ||
    url.includes('/user/auth/registration') ||
    url.includes('/user/auth/recovery')
  );
}

function shouldSkipLoginRedirect(pathname: string, search: string): boolean {
  if (pathname.startsWith('/confirm-email') || pathname.startsWith('/reset-password')) {
    return true;
  }

  if (pathname === '/') {
    const params = new URLSearchParams(search);
    return Boolean(params.get('token'));
  }

  return false;
}

function attachInterceptors(instance: ReturnType<typeof axios.create>, useMockAdapter: boolean) {
  instance.interceptors.request.use((config) => {
    const token = useMockAdapter ? getToken() ?? mockToken : getToken();
    if (token) {
      setAuthorizationHeader(config, token);
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (useMockAdapter) {
        return Promise.reject(error);
      }

      const originalConfig = error.config as InternalAxiosRequestConfig | undefined;
      const status = error.response?.status;

      if (!originalConfig || status !== 401) {
        return Promise.reject(error);
      }

      if (isAuthEndpoint(String(originalConfig.url ?? ''))) {
        return Promise.reject(error);
      }

      const skipLoginRedirect =
        typeof window !== 'undefined' &&
        shouldSkipLoginRedirect(window.location.pathname, window.location.search);
      if (skipLoginRedirect) {
        return Promise.reject(error);
      }

      clearSession();
      if (
        typeof window !== 'undefined' &&
        !skipLoginRedirect &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.assign('/login');
      }

      return Promise.reject(error);
    },
  );
}

export const api = axios.create({
  baseURL,
  ...(isMockApiEnabled ? { adapter: mockAdapter } : {}),
});

export const flowApi = axios.create({
  baseURL: flowBaseURL,
});

attachInterceptors(api, isMockApiEnabled);
attachInterceptors(flowApi, false);
