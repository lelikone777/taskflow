import { Navigate, Outlet } from 'react-router-dom';

import { isMockApiEnabled } from '@/shared/config/env';
import { getToken } from '@/shared/lib/auth';

export function RequireGuest() {
  if (isMockApiEnabled) {
    return <Outlet />;
  }

  if (getToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
