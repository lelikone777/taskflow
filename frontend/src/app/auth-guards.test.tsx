import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequireAuth } from '@/app/RequireAuth';
import { RequireGuest } from '@/app/RequireGuest';

const getTokenMock = vi.fn<() => string | null>();

vi.mock('@/shared/config/env', () => ({
  isMockApiEnabled: false,
}));

vi.mock('@/shared/lib/auth', () => ({
  getToken: () => getTokenMock(),
}));

function LoginProbe() {
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '';
  return <div>{`login:${fromPath}`}</div>;
}

describe('auth guards routing smoke', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
  });

  it('redirects unauthenticated user from private route to /login and preserves from', () => {
    getTokenMock.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<div>dashboard</div>} />
          </Route>
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('login:/dashboard')).toBeInTheDocument();
  });

  it('allows authenticated user to open private route', () => {
    getTokenMock.mockReturnValue('access-token');

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<div>dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('allows unauthenticated user to open guest route', () => {
    getTokenMock.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<div>login-page</div>} />
          </Route>
          <Route path="/dashboard" element={<div>dashboard-page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('redirects authenticated user away from guest route to /dashboard', () => {
    getTokenMock.mockReturnValue('access-token');

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<div>login-page</div>} />
          </Route>
          <Route path="/dashboard" element={<div>dashboard-page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
  });
});
