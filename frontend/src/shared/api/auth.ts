import { api } from './client';

export type AuthToken = {
  access_token: string;
  refresh_token: string;
};

export type User = {
  id: number;
  email: string;
  username?: string | null;
  timezone?: string | null;
  avatarUrl?: string | null;
  projects: Array<{ id: number; name: string }>;
};

export type OAuthProvider = 'google' | 'gitlab';

type OAuthStartResponse = {
  url: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  passwordConfirm: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ChangePasswordPayload = {
  password: string;
  passwordConfirm: string;
};

export type UpdateProfilePayload = {
  username?: string | null;
  timezone?: string | null;
};

type MessageResponse = {
  message: string;
};

type UserResponse = {
  id: number;
  email: string;
  username?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  projects?: Array<{ id: number; name: string }>;
};

type AvatarResponse = {
  avatar_url?: string | null;
};

type UserIdResponse = {
  id: number;
};

function normalizePublicUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://minio:9000', 'http://127.0.0.1:9000');
}

function mapUserResponse(data: UserResponse, avatarUrl?: string | null): User {
  return {
    id: data.id,
    email: data.email,
    username: data.username ?? null,
    timezone: data.timezone ?? null,
    avatarUrl: avatarUrl ?? normalizePublicUrl(data.avatar_url),
    projects: data.projects ?? [],
  };
}

export async function fetchAvatarUrl(): Promise<string | null> {
  try {
    const { data } = await api.get<AvatarResponse>('/user/avatar');
    return normalizePublicUrl(data.avatar_url);
  } catch {
    return null;
  }
}

export async function fetchCurrentUserId(): Promise<number> {
  const { data } = await api.get<UserIdResponse>('/user/id');
  return data.id;
}

export async function register(payload: RegisterPayload): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/user/auth/registration', {
    email: payload.email,
    password: payload.password,
    confirm_password: payload.passwordConfirm,
  });
  return data;
}

export async function confirmRegistration(token: string): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/user/auth/registration/confirm', null, {
    headers: { token },
  });
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthToken> {
  const body = new URLSearchParams();
  body.set('email', payload.email);
  body.set('password', payload.password);
  const { data } = await api.post<AuthToken>('/user/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function me(): Promise<User> {
  const { data } = await api.get<UserResponse>('/user/me');
  const avatarUrl = normalizePublicUrl(data.avatar_url) ?? (await fetchAvatarUrl());
  return mapUserResponse(data, avatarUrl);
}

export async function startOAuth(provider: OAuthProvider): Promise<string> {
  const { data } = await api.get<OAuthStartResponse>(`/user/auth/${provider}/start`);
  return data.url;
}

export async function completeOAuth(provider: OAuthProvider, code: string): Promise<AuthToken> {
  const { data } = await api.post<AuthToken>(`/user/auth/${provider}/callback`, { code });
  return data;
}

export async function logout(): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/user/auth/logout');
  return data;
}

export async function requestPasswordRecovery(email: string): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/user/auth/recovery', { email });
  return data;
}

export async function confirmPasswordRecovery(token: string): Promise<AuthToken> {
  const { data } = await api.post<AuthToken>('/user/auth/recovery/confirm', null, {
    headers: { token },
  });
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>('/user/auth/passchange', {
    password: payload.password,
    confirm_password: payload.passwordConfirm,
  });
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const body = {
    ...(payload.username !== undefined ? { username: payload.username } : {}),
    ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
  };
  const { data } = await api.patch<UserResponse>('/user/me', body);
  return mapUserResponse(data);
}

export async function uploadAvatar(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await api.post('/user/avatar', formData);
}
