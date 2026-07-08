import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isProjectDeadlineOverdue } from '@/entities/project';
import {
  deleteProject,
  fetchProjectsWithResolvedTaskCounts,
  invalidateProjects,
  updateProject,
  type Project,
} from '@/shared/api';
import { formatDate } from '@/shared/lib/date';
import { Skeleton } from '@/shared/ui';
import { EditProjectModal } from '@/widgets/modals';
import { type ProjectFilters, type ProjectSortOption } from './model/project-view';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { ProjectCard } from './ProjectCard';

export type ProjectListProps = {
  search: string;
  filters: ProjectFilters;
  sortBy: ProjectSortOption;
};

const overdueHighlightStatuses: Project['status'][] = ['in_progress', 'under_threat'];

function toBackendOrderBy(sortBy: ProjectSortOption): string | undefined {
  if (sortBy === 'created_desc') return 'Новые';
  if (sortBy === 'created_asc') return 'Старые';
  if (sortBy === 'alphabet_asc') return 'А-Я';
  if (sortBy === 'alphabet_desc') return 'Я-А';
  if (sortBy === 'deadline_asc') return 'Срочные';
  if (sortBy === 'deadline_desc') return 'Не срочные';
  return undefined;
}

function toBackendStatuses(filters: ProjectFilters): Project['status'][] {
  const sourceStatuses = filters.activeOnly
    ? ['in_progress', 'on_pause']
    : filters.statuses;

  return sourceStatuses.filter((status) =>
    status === 'in_progress' || status === 'on_pause' || status === 'done' || status === 'archive' || status === 'deleted'
  );
}

export function ProjectList({ search, filters, sortBy }: ProjectListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuProjectId, setMenuProjectId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [updatingStatusProjectId, setUpdatingStatusProjectId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const backendStatuses = useMemo(() => toBackendStatuses(filters), [filters]);
  const backendOrderBy = useMemo(() => toBackendOrderBy(sortBy), [sortBy]);
  const backendSearch = search.trim();

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projects', backendSearch, backendStatuses, backendOrderBy],
    queryFn: () =>
      fetchProjectsWithResolvedTaskCounts({
        q: backendSearch || undefined,
        status: backendStatuses.length > 0 ? backendStatuses : undefined,
        orderBy: backendOrderBy,
      }),
    staleTime: 30_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ projectId, status }: { projectId: number; status: Project['status'] }) =>
      updateProject(projectId, { status }),
    onSuccess: () => {
      invalidateProjects(queryClient);
    },
    onSettled: () => {
      setUpdatingStatusProjectId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: () => {
      invalidateProjects(queryClient);
    },
  });

  useEffect(() => {
    if (!menuProjectId) {
      return undefined;
    }

    const handleClickOutside = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setMenuProjectId(null);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [menuProjectId]);

  const handleStatusChange = (projectId: number, status: Project['status']) => {
    setUpdatingStatusProjectId(projectId);
    updateStatusMutation.mutate({ projectId, status });
  };

  const handleArchive = (project: Project) => {
    setMenuProjectId(null);
    const confirmed = window.confirm(`Отправить проект «${project.name}» в архив?`);
    if (!confirmed) {
      return;
    }
    handleStatusChange(project.id, 'archive');
  };

  const handleRestore = (project: Project) => {
    setMenuProjectId(null);
    handleStatusChange(project.id, 'in_progress');
  };

  const handleDelete = (project: Project) => {
    setMenuProjectId(null);
    if (deleteMutation.isPending) {
      return;
    }
    const confirmed = window.confirm(`Удалить проект «${project.name}»?`);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(project.id);
  };

  if (isLoading) {
    return (
      <div className="stack stack-gap-sm">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (isError) {
    return (
      <section className="dashboard-projects-empty dashboard-projects-empty--error" aria-live="polite">
        <div className="dashboard-projects-empty__message">
          <p className="dashboard-projects-empty__title">Не удалось загрузить проекты</p>
          <p className="dashboard-projects-empty__description">
            Проверьте соединение и попробуйте еще раз.
          </p>
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    const emptyByFilters = backendSearch.length > 0 || backendStatuses.length > 0 || Boolean(backendOrderBy);

    if (emptyByFilters) {
      return (
        <section className="dashboard-projects-empty dashboard-projects-empty--filtered" aria-live="polite">
          <div className="dashboard-projects-empty__message">
            <p className="dashboard-projects-empty__title">Нет проектов по выбранным фильтрам</p>
            <p className="dashboard-projects-empty__description">
              Измените параметры фильтрации или сортировки.
            </p>
          </div>
        </section>
      );
    }

    return (
      <section className="dashboard-projects-empty" aria-live="polite">
        <div className="dashboard-projects-empty__message">
          <p className="dashboard-projects-empty__title">У Вас пока нет проектов!</p>
          <p className="dashboard-projects-empty__description">
            Нажмите на кнопку “Создать проект”
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="project-list">
        {projects.map((project) => (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            className="project-list__item"
            onClick={() => navigate(`/project/${project.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/project/${project.id}`);
              }
            }}
          >
            <ProjectCard
              name={project.name}
              status={project.status}
              tasksCount={project.tasksCountAll ?? 0}
              tasksDone={project.tasksCountDone}
              deadline={formatDate(project.deadline)}
              createdAt={formatDate(project.createdAt)}
              isOverdue={isProjectDeadlineOverdue(project.deadline, project.status, {
                overdueStatuses: overdueHighlightStatuses,
              })}
              statusDisabled={updatingStatusProjectId === project.id}
              onStatusChange={(status) => handleStatusChange(project.id, status)}
              menu={
                <ProjectActionsMenu
                  project={project}
                  isOpen={menuProjectId === project.id}
                  menuRef={menuRef}
                  onToggle={() =>
                    setMenuProjectId((prev) => (prev === project.id ? null : project.id))
                  }
                  onEdit={(item) => {
                    setEditingProject(item);
                    setMenuProjectId(null);
                  }}
                  onArchive={(item) => handleArchive(item)}
                  onRestore={(item) => handleRestore(item)}
                  onDelete={(item) => handleDelete(item)}
                />
              }
            />
          </div>
        ))}
      </div>

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
