import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteTask,
  fetchProjects,
  fetchTags,
  fetchTaskLists,
  fetchTasks,
  invalidateTaskRelations,
  queryKeys,
  updateTask,
  type Project,
  type Task,
  type TaskCreatePayload,
  type TaskPriority,
  type TaskStatus,
  type TaskUpdatePayload,
} from '@/shared/api';
import { EmptyState, FilterBar, Skeleton, Tag } from '@/shared/ui';
import { TaskModal } from '@/widgets/modals';
import { TaskCard } from '@/widgets/project/TaskCard';

type TaskSort = 'due_asc' | 'due_desc' | 'title_asc' | 'title_desc';

type TaskWithContext = {
  task: Task;
  project: Project;
  listName: string;
};

const statusOptions: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'planned', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполненные' },
];

const priorityOptions: Array<{ value: TaskPriority | 'all'; label: string }> = [
  { value: 'all', label: 'Все приоритеты' },
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'critical', label: 'Критичный' },
];

const sortOptions: Array<{ value: TaskSort; label: string }> = [
  { value: 'due_asc', label: 'Срок: ближе' },
  { value: 'due_desc', label: 'Срок: дальше' },
  { value: 'title_asc', label: 'Название: А-Я' },
  { value: 'title_desc', label: 'Название: Я-А' },
];

function toTimestamp(value?: string | null): number {
  if (!value) return Number.NaN;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function applyTaskSort(tasks: TaskWithContext[], sortBy: TaskSort): TaskWithContext[] {
  const copy = [...tasks];

  copy.sort((left, right) => {
    if (sortBy === 'title_asc') {
      return left.task.title.localeCompare(right.task.title, 'ru');
    }
    if (sortBy === 'title_desc') {
      return right.task.title.localeCompare(left.task.title, 'ru');
    }

    const leftDue = toTimestamp(left.task.dueDate);
    const rightDue = toTimestamp(right.task.dueDate);
    const leftValue = Number.isNaN(leftDue) ? Number.POSITIVE_INFINITY : leftDue;
    const rightValue = Number.isNaN(rightDue) ? Number.POSITIVE_INFINITY : rightDue;
    if (sortBy === 'due_desc') {
      return rightValue - leftValue;
    }
    return leftValue - rightValue;
  });

  return copy;
}

export function DashboardTasksList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('due_asc');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.all(),
    queryFn: () => fetchProjects(),
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.all(),
    queryFn: () => fetchTags(),
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const listQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: queryKeys.projects.lists(project.id),
      queryFn: () => fetchTaskLists(project.id),
      enabled: projectsQuery.isSuccess,
    })),
  });

  const listWithProjects = useMemo(() => {
    const result: Array<{ project: Project; listId: number; listName: string }> = [];
    projects.forEach((project, projectIndex) => {
      const lists = listQueries[projectIndex]?.data ?? [];
      lists.forEach((list) => {
        result.push({
          project,
          listId: list.id,
          listName: list.name,
        });
      });
    });
    return result;
  }, [projects, listQueries]);

  const taskQueries = useQueries({
    queries: listWithProjects.map((item) => ({
      queryKey: queryKeys.tasks.list(item.listId),
      queryFn: () => fetchTasks(item.listId),
      enabled: listWithProjects.length > 0,
    })),
  });

  const allTasks = useMemo(() => {
    const result: TaskWithContext[] = [];
    listWithProjects.forEach((item, index) => {
      const tasks = taskQueries[index]?.data ?? [];
      tasks.forEach((task) => {
        result.push({
          task,
          project: item.project,
          listName: item.listName,
        });
      });
    });
    return result;
  }, [listWithProjects, taskQueries]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = allTasks.filter(({ task, project, listName }) => {
      if (projectFilter !== 'all' && project.id !== projectFilter) {
        return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [task.title, task.description ?? '', project.name, listName]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    return applyTaskSort(filtered, sortBy);
  }, [allTasks, projectFilter, priorityFilter, search, sortBy, statusFilter]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: TaskUpdatePayload }) =>
      updateTask(taskId, payload),
    onSuccess: (_, variables) => {
      invalidateTaskRelations(queryClient, { taskId: variables.taskId });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {});
    },
  });

  const handleEditTask = (task: Task) => {
    setActiveTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    if (deleteTaskMutation.isPending) return;
    const confirmed = window.confirm(`Удалить задачу «${task.title}»?`);
    if (!confirmed) return;
    deleteTaskMutation.mutate(task.id);
  };

  const handleOpenTask = (task: Task) => {
    navigate(`/task/${task.id}`);
  };

  const handleTaskSubmit = async (payload: TaskCreatePayload & { status: TaskStatus; tagIds: number[] }) => {
    if (!activeTask) {
      throw new Error('Задача не найдена');
    }
    await updateTaskMutation.mutateAsync({ taskId: activeTask.id, payload });
  };

  const tagLookup = useMemo(() => {
    const entries = (tagsQuery.data ?? []).map((tag) => [tag.id, tag]);
    return Object.fromEntries(entries);
  }, [tagsQuery.data]);

  const activeStatusLabel = useMemo(
    () => statusOptions.find((option) => option.value === statusFilter)?.label,
    [statusFilter],
  );
  const activePriorityLabel = useMemo(
    () => priorityOptions.find((option) => option.value === priorityFilter)?.label,
    [priorityFilter],
  );
  const activeSortLabel = useMemo(
    () => sortOptions.find((option) => option.value === sortBy)?.label,
    [sortBy],
  );
  const activeProjectLabel = useMemo(() => {
    if (projectFilter === 'all') {
      return undefined;
    }
    return projects.find((project) => project.id === projectFilter)?.name;
  }, [projectFilter, projects]);

  const isLoading =
    projectsQuery.isLoading ||
    listQueries.some((query) => query.isLoading) ||
    taskQueries.some((query) => query.isLoading);

  const isError =
    projectsQuery.isError ||
    listQueries.some((query) => query.isError) ||
    taskQueries.some((query) => query.isError);

  const hasTasks = allTasks.length > 0;
  const doneCount = filteredTasks.filter((item) => item.task.status === 'done').length;

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
      <EmptyState
        title="Не удалось загрузить задачи"
        description="Проверьте соединение и попробуйте еще раз."
      />
    );
  }

  return (
    <>
      <section className="surface p-3 md:p-4 stack stack-gap-sm">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          searchPlaceholder="Поиск задачи"
          filterAriaLabel="Фильтры задач"
          chips={(
            <>
              {statusFilter !== 'all' && activeStatusLabel ? (
                <Tag className="project-board__chip" onRemove={() => setStatusFilter('all')}>
                  Статус: {activeStatusLabel}
                </Tag>
              ) : null}
              {priorityFilter !== 'all' && activePriorityLabel ? (
                <Tag className="project-board__chip" onRemove={() => setPriorityFilter('all')}>
                  Приоритет: {activePriorityLabel}
                </Tag>
              ) : null}
              {projectFilter !== 'all' && activeProjectLabel ? (
                <Tag className="project-board__chip" onRemove={() => setProjectFilter('all')}>
                  Проект: {activeProjectLabel}
                </Tag>
              ) : null}
              {sortBy !== 'due_asc' ? (
                <Tag className="project-board__chip" onRemove={() => setSortBy('due_asc')}>
                  Сортировка: {activeSortLabel}
                </Tag>
              ) : null}
            </>
          )}
          popover={(
            <div className="filter-popover project-board__filter-popover">
              <div className="surface filter-popover__panel">
                <div className="stack stack-gap-sm">
                  <div className="text-body-sm text-[color:var(--color-text-secondary)]">Сортировка</div>
                  <div className="stack stack-gap-xs">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`filter-popover__item ${sortBy === option.value ? 'filter-popover__item--active' : ''}`}
                        onClick={() => setSortBy(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="surface filter-popover__panel">
                <div className="stack stack-gap-sm">
                  <div className="text-body-sm text-[color:var(--color-text-secondary)]">Статус</div>
                  <div className="stack stack-gap-xs">
                    {statusOptions
                      .filter((option) => option.value !== 'all')
                      .map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`filter-popover__item ${statusFilter === option.value ? 'filter-popover__item--active' : ''}`}
                          onClick={() => setStatusFilter(option.value as TaskStatus)}
                        >
                          {option.label}
                        </button>
                      ))}
                    <button type="button" className="filter-popover__item" onClick={() => setStatusFilter('all')}>
                      Сбросить
                    </button>
                  </div>
                </div>
              </div>
              <div className="surface filter-popover__panel">
                <div className="stack stack-gap-sm">
                  <div className="text-body-sm text-[color:var(--color-text-secondary)]">Приоритет</div>
                  <div className="stack stack-gap-xs">
                    {priorityOptions
                      .filter((option) => option.value !== 'all')
                      .map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`filter-popover__item ${priorityFilter === option.value ? 'filter-popover__item--active' : ''}`}
                          onClick={() => setPriorityFilter(option.value as TaskPriority)}
                        >
                          {option.label}
                        </button>
                      ))}
                    <button type="button" className="filter-popover__item" onClick={() => setPriorityFilter('all')}>
                      Сбросить
                    </button>
                  </div>
                </div>
              </div>
              <div className="surface filter-popover__panel filter-popover__sub">
                <div className="stack stack-gap-sm">
                  <div className="text-body-sm text-[color:var(--color-text-secondary)]">Проект</div>
                  <div className="stack stack-gap-xs">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        className={`filter-popover__option ${projectFilter === project.id ? 'filter-popover__option--active' : ''}`}
                        onClick={() => setProjectFilter(project.id)}
                      >
                        {project.name}
                      </button>
                    ))}
                    <button type="button" className="filter-popover__item" onClick={() => setProjectFilter('all')}>
                      Все проекты
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        />
        <div className="text-body-sm text-[color:var(--color-text-secondary)]">
          Показано задач: {filteredTasks.length} из {allTasks.length}. Выполнено: {doneCount}.
        </div>
      </section>

      {!hasTasks ? (
        <EmptyState
          title="Задач пока нет"
          description="Создайте задачу внутри проекта, чтобы она появилась в общем списке."
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Измените параметры поиска или фильтры."
        />
      ) : (
        <div className="stack stack-gap-sm">
          {filteredTasks.map(({ task, project, listName }) => (
            <div key={task.id} className="stack stack-gap-xs">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  className="text-body-sm text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.name} · {listName}
                </button>
              </div>
              <TaskCard
                task={task}
                tagLookup={tagLookup}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onOpen={handleOpenTask}
                onStatusChange={(taskId, status) => {
                  updateTaskMutation.mutate({ taskId, payload: { status } });
                }}
                disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
              />
            </div>
          ))}
        </div>
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setActiveTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={activeTask}
        tags={tagsQuery.data}
      />
    </>
  );
}
