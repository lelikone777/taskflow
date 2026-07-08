import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { isMockApiEnabled } from '@/shared/config/env';
import { getToken } from '@/shared/lib/auth';

export function RequireAuth() {
  const location = useLocation();
  if (isMockApiEnabled) {
    return <Outlet />;
  }
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
