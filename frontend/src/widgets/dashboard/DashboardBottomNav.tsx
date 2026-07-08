import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useNotifications } from '@/features/notifications';
import { BellIcon, CubeIcon, ListIcon, UserIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

type ItemId = 'tasks' | 'projects' | 'flow' | 'notifications' | 'profile';

const navItems: Array<{ id: ItemId; label: string; to: string; icon: ReactNode }> = [
  { id: 'tasks', label: 'Задачи', to: '/dashboard?view=tasks', icon: <ListIcon className="h-5 w-5" /> },
  { id: 'projects', label: 'Проекты', to: '/dashboard?view=projects', icon: <CubeIcon className="h-5 w-5" /> },
  {
    id: 'flow',
    label: 'Flow',
    to: '/flow',
    icon: <span className="h-5 w-5 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#9ecbf2,_#3380f6)]" />,
  },
  { id: 'notifications', label: 'Входящие', to: '/dashboard', icon: <BellIcon className="h-5 w-5" /> },
  { id: 'profile', label: 'Профиль', to: '/profile', icon: <UserIcon className="h-5 w-5" /> },
];

export function DashboardBottomNav() {
  const { pathname, search } = useLocation();
  const { togglePanel, isPanelOpen, unreadCount } = useNotifications();
  const view = new URLSearchParams(search).get('view');

  const activeItem: ItemId =
    isPanelOpen
      ? 'notifications'
      : pathname.startsWith('/flow')
      ? 'flow'
      : pathname.startsWith('/profile')
        ? 'profile'
        : pathname.startsWith('/task/')
          ? 'tasks'
          : pathname.startsWith('/project/')
            ? 'projects'
            : view === 'tasks'
              ? 'tasks'
              : 'projects';

  return (
    <nav className="dashboard-bottom-nav">
      {navItems.map((item) =>
        item.id === 'notifications' ? (
          <button
            key={item.id}
            type="button"
            onClick={togglePanel}
            className={cn(
              'dashboard-bottom-nav__item',
              activeItem === item.id
                ? 'text-[color:var(--color-brand-600)]'
                : 'text-[color:var(--color-text-secondary)]',
            )}
          >
            <span className="dashboard-bottom-nav__icon-wrap">
              {item.icon}
              {unreadCount > 0 ? <span className="dashboard-bottom-nav__badge" /> : null}
            </span>
            <span>{item.label}</span>
          </button>
        ) : (
          <Link
            key={item.id}
            to={item.to}
            className={cn(
              'dashboard-bottom-nav__item',
              activeItem === item.id
                ? 'text-[color:var(--color-brand-600)]'
                : 'text-[color:var(--color-text-secondary)]',
            )}
          >
            <span className="dashboard-bottom-nav__icon-wrap">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
