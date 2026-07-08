import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type TokenFlow = 'confirm' | 'reset';

function resolveFlowFromValue(value?: string | null): TokenFlow | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === 'reset' ||
    normalized === 'recovery' ||
    normalized === 'password_recovery'
  ) {
    return 'reset';
  }

  if (
    normalized === 'confirm' ||
    normalized === 'registration' ||
    normalized === 'registration_confirm'
  ) {
    return 'confirm';
  }

  return null;
}

function hasReminderDeepLinkHint(params: URLSearchParams): boolean {
  const reminderKeys = [
    'task_id',
    'taskId',
    'tasklist_id',
    'tasklistId',
    'project_id',
    'projectId',
    'user_id',
    'userId',
    'reminder',
    'reminder_token',
    'link_type',
    'deeplink',
  ];

  return reminderKeys.some((key) => params.has(key));
}

function resolveTokenFlow(pathname: string, params: URLSearchParams): TokenFlow | null {
  if (pathname.startsWith('/confirm-email')) {
    return 'confirm';
  }

  if (pathname.startsWith('/reset-password')) {
    return 'reset';
  }

  const explicitFlow = resolveFlowFromValue(
    params.get('flow') ?? params.get('auth') ?? params.get('token_type'),
  );
  if (explicitFlow) {
    return explicitFlow;
  }

  // Legacy backend links point to "/?token=...".
  if (pathname === '/' && !hasReminderDeepLinkHint(params)) {
    return 'confirm';
  }

  return null;
}

export function AuthTokenRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      return;
    }

    const flow = resolveTokenFlow(location.pathname, params);
    if (!flow) {
      return;
    }

    const destination =
      flow === 'reset'
        ? `/reset-password/${encodeURIComponent(token)}`
        : `/confirm-email/${encodeURIComponent(token)}`;

    navigate(destination, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
