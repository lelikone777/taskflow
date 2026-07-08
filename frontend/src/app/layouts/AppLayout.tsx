import { Suspense, lazy } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import logo from '@/assets/logo.svg';
import { cn } from '@/shared/lib/cn';

const NotificationsPanel = lazy(() =>
  import('@/widgets/dashboard/NotificationsPanel').then((module) => ({
    default: module.NotificationsPanel,
  })),
);

const navItems = [
  { to: '/login', label: 'Вход на сайт' },
];

export function AppLayout() {
  const location = useLocation();
  const isDashboard =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/flow') ||
    location.pathname.startsWith('/project') ||
    location.pathname.startsWith('/task') ||
    location.pathname.startsWith('/profile');

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      {!isDashboard ? (
        <header className="surface">
          <div className="container flex flex-wrap items-center gap-4 py-4">
            <div className="flex items-center gap-2 text-h3">
              <img src={logo} alt="TaskFlow" className="h-8 w-8" />
              <span>TaskFlow</span>
            </div>
            <nav className="flex flex-wrap items-center gap-3 text-body-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-full px-3 py-1 transition-colors',
                      isActive
                        ? 'bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]'
                        : 'text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
      ) : null}
      <main className={cn(isDashboard ? 'py-0' : 'container py-10')}>
        <Outlet />
      </main>
      {isDashboard ? (
        <Suspense fallback={null}>
          <NotificationsPanel />
        </Suspense>
      ) : null}
    </div>
  );
}
