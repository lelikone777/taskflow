import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import logo from '@/assets/logo.svg';
import { useNotifications } from '@/features/notifications';
import { useProjectCreate } from '@/features/project-create';
import {
  deleteProject,
  fetchProjects,
  invalidateProjects,
  me,
  queryKeys,
  updateProject,
  type Project,
} from '@/shared/api';
import { Avatar, PlusIcon, Skeleton } from '@/shared/ui';
import { ArhivIcon, BellIcon, ChevronDownIcon, CubeIcon, ListIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';
import { EditProjectModal } from '@/widgets/modals';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { SidebarProjectsAccordion } from './SidebarProjectsAccordion';

const navItems = [
  { id: 'tasks', label: 'Все задачи', icon: <ListIcon className="h-4 w-4" />, to: '/dashboard?view=tasks' },
  { id: 'projects', label: 'Все проекты', icon: <CubeIcon className="h-4 w-4" />, to: '/dashboard?view=projects' },
  {
    id: 'archive',
    label: 'Архив',
    icon: <ArhivIcon className="h-4 w-4" />,
    to: '/dashboard?view=projects&scope=archive',
  },
  {
    id: 'flow',
    label: 'Режим Flow',
    icon: (
      <span className="h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#9ecbf2,_#3380f6)]" />
    ),
    to: '/flow',
  },
];

export type DashboardSidebarProps = {
  onProfileOpen?: () => void;
};

export function DashboardSidebar({ onProfileOpen }: DashboardSidebarProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openCreateProject } = useProjectCreate();
  const { togglePanel, isPanelOpen, unreadCount } = useNotifications();
  const [menuProjectId, setMenuProjectId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const activeProjectId = pathname.startsWith('/project/')
    ? Number(pathname.split('/')[2])
    : null;

  const { data = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => fetchProjects(),
    staleTime: 30_000,
  });
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: me,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: () => {
      invalidateProjects(queryClient);
      if (menuProjectId === activeProjectId) {
        navigate('/dashboard');
      }
    },
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ projectId, status }: { projectId: number; status: Project['status'] }) =>
      updateProject(projectId, { status }),
    onSuccess: () => {
      invalidateProjects(queryClient);
    },
  });

  useEffect(() => {
    if (!menuProjectId) return undefined;

    const handleClick = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setMenuProjectId(null);
    };

    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [menuProjectId]);

  const handleOpen = (projectId: number) => {
    navigate(`/project/${projectId}`);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setMenuProjectId(null);
  };

  const handleDelete = (project: Project) => {
    setMenuProjectId(null);
    if (deleteMutation.isPending) return;
    const confirmed = window.confirm(`Удалить проект «${project.name}»?`);
    if (!confirmed) return;
    deleteMutation.mutate(project.id);
  };

  const handleArchive = (project: Project) => {
    setMenuProjectId(null);
    const confirmed = window.confirm(`Отправить проект «${project.name}» в архив?`);
    if (!confirmed) return;
    updateStatusMutation.mutate({ projectId: project.id, status: 'archive' });
  };

  const handleRestore = (project: Project) => {
    setMenuProjectId(null);
    updateStatusMutation.mutate({ projectId: project.id, status: 'in_progress' });
  };

  const displayName = meQuery.data?.username ?? meQuery.data?.email ?? 'Пользователь';
  const avatarFallback = displayName.trim().slice(0, 2).toUpperCase();
  const avatarSrc = meQuery.data?.avatarUrl ?? undefined;
  const view = new URLSearchParams(search).get('view');
  const scope = new URLSearchParams(search).get('scope');
  const activeNavId: 'tasks' | 'projects' | 'archive' | 'flow' =
    pathname.startsWith('/flow')
      ? 'flow'
      : pathname.startsWith('/task/')
        ? 'tasks'
        : scope === 'archive'
          ? 'archive'
        : pathname.startsWith('/project/')
          ? 'projects'
          : view === 'tasks'
            ? 'tasks'
            : 'projects';

  return (
    <>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__content">
          <div className="dashboard-sidebar__profile">
            <button
              type="button"
              className="dashboard-sidebar__profile-main dashboard-sidebar__profile-trigger"
              onClick={() => {
                if (onProfileOpen) {
                  onProfileOpen();
                  return;
                }
                navigate('/profile');
              }}
              aria-label="Открыть настройки профиля"
            >
              <Avatar size="md" fallback={avatarFallback} src={avatarSrc} />
              <div className="dashboard-sidebar__username" title={displayName}>
                {displayName}
              </div>
            </button>
            <div className="dashboard-sidebar__profile-actions">
              <button
                type="button"
                className={cn('dashboard-sidebar__icon-btn', isPanelOpen && 'dashboard-sidebar__icon-btn--active')}
                aria-label="Уведомления"
                aria-expanded={isPanelOpen}
                onClick={togglePanel}
              >
                <BellIcon className="h-4 w-4" />
                {unreadCount > 0 ? <span className="dashboard-sidebar__icon-badge" /> : null}
              </button>
            </div>
          </div>

          <nav className="dashboard-sidebar__nav" aria-label="Основное меню">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={cn(
                    'dashboard-sidebar__nav-item',
                    isActive && 'dashboard-sidebar__nav-item--active',
                  )}
                >
                  <span className="dashboard-sidebar__nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="dashboard-sidebar__divider" />

          <div className="dashboard-sidebar__projects-header">
            <button
              type="button"
              className="dashboard-sidebar__projects-title"
              aria-expanded={isProjectsExpanded}
              aria-controls="dashboard-sidebar-projects-list"
              onClick={() => setIsProjectsExpanded((prev) => !prev)}
            >
              <ChevronDownIcon className="h-4 w-4 dashboard-sidebar__projects-chevron" />
              <span>Мои проекты</span>
            </button>
            <button type="button" className="dashboard-sidebar__add-btn" aria-label="Добавить" onClick={openCreateProject}>
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          <SidebarProjectsAccordion
            id="dashboard-sidebar-projects-list"
            isOpen={isProjectsExpanded}
          >
            <div className="dashboard-sidebar__projects-list">
              {isLoading ? (
                <>
                  <Skeleton className="w-full" />
                  <Skeleton className="w-full" />
                  <Skeleton className="w-40" />
                </>
              ) : isError ? (
                <div className="text-[color:var(--color-danger-500)]">Не удалось загрузить проекты</div>
              ) : data.length === 0 ? (
                <div className="text-[color:var(--color-text-secondary)]">Проектов нет</div>
              ) : (
                data.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      'project-item',
                      activeProjectId === project.id && 'project-item--active',
                    )}
                  >
                    <button
                      type="button"
                      className="project-item__link"
                      onClick={() => handleOpen(project.id)}
                    >
                      <span className="project-item__name" title={project.name}>{project.name}</span>
                    </button>
                    <ProjectActionsMenu
                      project={project}
                      isOpen={menuProjectId === project.id}
                      menuRef={menuRef}
                      triggerVariant="ghost"
                      onToggle={() => setMenuProjectId((prev) => (prev === project.id ? null : project.id))}
                      onEdit={(item) => handleEdit(item)}
                      onArchive={(item) => handleArchive(item)}
                      onRestore={(item) => handleRestore(item)}
                      onDelete={(item) => handleDelete(item)}
                    />
                  </div>
                ))
              )}
            </div>
          </SidebarProjectsAccordion>
        </div>

        <div className="dashboard-sidebar__brand">
          <img src={logo} alt="TaskFlow" className="h-10 w-10" />
          <span>TaskFlow</span>
        </div>
      </aside>
      <EditProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onUpdated={() => {
          invalidateProjects(queryClient);
        }}
      />
    </>
  );
}
