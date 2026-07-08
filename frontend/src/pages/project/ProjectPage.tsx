import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  formatProjectDeadlineDate,
  isProjectDeadlineOverdue,
  parseProjectDate,
  projectStatusLabels,
} from '@/entities/project';
import {
  createSubtask,
  createTask,
  createTaskList,
  deleteTaskList,
  deleteTask,
  fetchProject,
  fetchSubtasks,
  fetchTaskLists,
  fetchTasks,
  fetchTags,
  invalidateProject,
  invalidateProjectLists,
  invalidateProjects,
  invalidateSubtasks,
  invalidateTaskRelations,
  moveTaskToList,
  queryKeys,
  reorderTaskLists,
  sortTaskLists,
  updateSubtask,
  updateTaskList,
  updateTask,
  type Subtask,
  type SubtaskStatus,
  type Tag as TagEntity,
  type Task,
  type TaskCreatePayload,
  type TaskStatus,
  type TaskUpdatePayload,
} from '@/shared/api';
import {
  isTaskPriorityDateFiltersEnabled,
  isTaskStatusFilterEnabled,
} from '@/shared/config/env';
import { getApiFieldValidationMessage, getApiValidationSummary } from '@/shared/lib/apiValidation';
import { sortTasksForBoard } from '@/shared/lib/taskBoard';
import { Button, EmptyState, Skeleton, Tabs } from '@/shared/ui';
import {
  CheckIcon,
  ChevronRightIcon,
  DeleteIcon,
  MoreVerticalIcon,
  PlusIcon,
  RecoverIcon,
} from '@/shared/ui/icons';
import { DashboardBottomNav, DashboardSidebar } from '@/widgets/dashboard';
import { EditProjectModal, ProjectDeadlineReminderModal, TaskModal } from '@/widgets/modals';
import { TaskBoardCard } from '@/widgets/project/TaskBoardCard';
import { TaskBoardFilters } from '@/widgets/project/TaskBoardFilters';
import { useTaskBoardFilters } from '@/widgets/project/model/useTaskBoardFilters';
import { TaskDetailDrawer } from '@/widgets/task/TaskDetailDrawer';
import { toast } from 'sonner';

const tabs = [
  { value: 'tasks', label: 'Задачи' },
  { value: 'about', label: 'О проекте' },
];

const DEFAULT_LIST_NAME = 'Основной';

type OverridesState = Record<number, number>;
type OverridesAction = 
  | { type: 'LOAD'; key: string | null }
  | { type: 'UPDATE'; taskId: number; targetListId: number };

function overridesReducer(state: OverridesState, action: OverridesAction): OverridesState {
  switch (action.type) {
    case 'LOAD':
      if (!action.key) return {};
      try {
        const raw = window.localStorage.getItem(action.key);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const next: OverridesState = {};
        Object.entries(parsed).forEach(([taskIdRaw, listIdRaw]) => {
          const taskId = Number(taskIdRaw);
          const listId = Number(listIdRaw);
          if (Number.isFinite(taskId) && Number.isFinite(listId)) {
            next[taskId] = listId;
          }
        });
        return next;
      } catch {
        return {};
      }
    case 'UPDATE':
      return { ...state, [action.taskId]: action.targetListId };
    default:
      return state;
  }
}

export function ProjectPage() {
  const { projectId } = useParams();
  const numericProjectId = Number(projectId);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    tagFilters,
    dueFrom,
    setDueFrom,
    dueTo,
    setDueTo,
    activePriorityLabel,
    activeStatusLabel,
    toggleTagFilter,
    removeTagFilter,
  } = useTaskBoardFilters();
  const effectiveStatusFilter = isTaskStatusFilterEnabled ? statusFilter : '';
  const effectivePriorityFilter = isTaskPriorityDateFiltersEnabled ? priorityFilter : '';
  const effectiveDueFrom = isTaskPriorityDateFiltersEnabled ? dueFrom : '';
  const effectiveDueTo = isTaskPriorityDateFiltersEnabled ? dueTo : '';
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [acknowledgedDeadlineReminderKey, setAcknowledgedDeadlineReminderKey] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [quickTaskListId, setQuickTaskListId] = useState<number | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskError, setQuickTaskError] = useState<string | null>(null);
  const canQueryProject = Number.isFinite(numericProjectId) && numericProjectId > 0;
  const [activeColumnMenuId, setActiveColumnMenuId] = useState<number | null>(null);
  const dropOverrideStorageKey = useMemo(
    () => (canQueryProject ? `taskflow:task-list-overrides:${numericProjectId}` : null),
    [canQueryProject, numericProjectId],
  );
  const [taskListOverrides, dispatch] = useReducer(overridesReducer, {});

// 3. Загружаем данные при смене ключа - dispatch НЕ вызывает ошибку линтера!
useEffect(() => {
  dispatch({ type: 'LOAD', key: dropOverrideStorageKey });
}, [dropOverrideStorageKey]);

  const [dragState, setDragState] = useState<{ taskId: number; fromListId: number; cardHeight: number } | null>(null);
  const [activeDropListId, setActiveDropListId] = useState<number | null>(null);
  const [columnDragListId, setColumnDragListId] = useState<number | null>(null);
  const [activeColumnSortTarget, setActiveColumnSortTarget] = useState<{
    listId: number;
    placement: 'before' | 'after';
  } | null>(null);
  const [tab, setTab] = useState('tasks');
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const quickTaskInputRef = useRef<HTMLInputElement | null>(null);
  const dropDepthRef = useRef<Record<number, number>>({});

  const taskIdParam = searchParams.get('taskId');
  const drawerTaskId = taskIdParam ? Number(taskIdParam) : null;
  const isDrawerOpen = Number.isFinite(drawerTaskId) && (drawerTaskId ?? 0) > 0;
  const projectQuery = useQuery({
    queryKey: queryKeys.projects.detail(numericProjectId),
    queryFn: () => fetchProject(numericProjectId),
    enabled: canQueryProject,
  });
  const listsQuery = useQuery({
    queryKey: queryKeys.projects.lists(numericProjectId),
    queryFn: () => fetchTaskLists(numericProjectId),
    enabled: canQueryProject,
  });
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.all(),
    queryFn: () => fetchTags(),
  });
  const tagLookup = useMemo(() => {
    const entries = (tagsQuery.data ?? []).map((tag) => [tag.id, tag]);
    return Object.fromEntries(entries) as Record<number, TagEntity>;
  }, [tagsQuery.data]);
  const selectedTagNames = useMemo(
    () =>
      tagFilters
        .map((tagId) => tagLookup[tagId]?.name)
        .filter((name): name is string => Boolean(name)),
    [tagFilters, tagLookup],
  );
  const defaultListCreatedRef = useRef(false);
  const createListMutation = useMutation({
    mutationFn: (name: string) => createTaskList(numericProjectId, { name }),
    onSuccess: (list) => {
      invalidateProjectLists(queryClient, numericProjectId);
      setActiveListId(list.id);
    },
  });

  useEffect(() => {
    if (!canQueryProject) return;
    if (listsQuery.isLoading) return;
    if (createListMutation.isPending) return;
    if (!listsQuery.data || listsQuery.data.length > 0) return;
    if (defaultListCreatedRef.current) return;
    defaultListCreatedRef.current = true;
    createListMutation.mutate(DEFAULT_LIST_NAME);
  }, [canQueryProject, listsQuery.isLoading, listsQuery.data, createListMutation]);

  const taskQueries = useQueries({
    queries: (listsQuery.data ?? []).map((list) => ({
      queryKey: queryKeys.tasks.list(list.id, {
        search,
        status: effectiveStatusFilter,
        priority: effectivePriorityFilter,
        tagFilters,
        dueFrom: effectiveDueFrom,
        dueTo: effectiveDueTo,
      }),
      queryFn: () =>
        fetchTasks(list.id, {
          q: search || undefined,
          tagNames: selectedTagNames.length > 0 ? selectedTagNames : undefined,
          ...(isTaskStatusFilterEnabled ? { status: statusFilter || undefined } : {}),
          ...(isTaskPriorityDateFiltersEnabled
            ? {
              priority: priorityFilter || undefined,
              dueFrom: dueFrom || undefined,
              dueTo: dueTo || undefined,
            }
            : {}),
        }),
      enabled: Boolean(listsQuery.data),
    })),
  });

  const listTasks = useMemo(() => {
    const result: Record<number, Task[]> = {};
    (listsQuery.data ?? []).forEach((list, index) => {
      const fetchedTasks = taskQueries[index]?.data ?? [];
      result[list.id] = sortTasksForBoard(fetchedTasks);
    });
    return result;
  }, [listsQuery.data, taskQueries]);

  const allTasks = useMemo(() => {
    return Object.values(listTasks).flat();
  }, [listTasks]);

  const validTaskListOverrides = useMemo(() => {
    if (Object.keys(taskListOverrides).length === 0) {
      return taskListOverrides;
    }

    const availableListIds = new Set((listsQuery.data ?? []).map(list => list.id));
    let changed = false;
    const next = { ...taskListOverrides };

    for (const [taskIdRaw, targetListId] of Object.entries(taskListOverrides)) {
      const taskId = Number(taskIdRaw);
      const persistedTask = allTasks.find((task) => task.id === taskId);
      const targetListExists = availableListIds.has(targetListId);
      if (!persistedTask || !targetListExists || persistedTask.listId === targetListId) {
        delete next[taskId];
        changed = true;
      }
    }

    return changed ? next : taskListOverrides;
  }, [taskListOverrides, allTasks, listsQuery.data]);

  const displayedLists = listsQuery.data ?? [];
  const boardListTasks = useMemo(() => {
    if (Object.keys(validTaskListOverrides).length === 0) {
      return listTasks;
    }
    const result: Record<number, Task[]> = {};
    (listsQuery.data ?? []).forEach((list) => {
      result[list.id] = [];
    });
    allTasks.forEach((task) => {
      const overrideListId = validTaskListOverrides[task.id];
      const resolvedListId =
        overrideListId && result[overrideListId] ? overrideListId : task.listId;
      if (!result[resolvedListId]) {
        return;
      }
      result[resolvedListId].push(task);
    });
    (listsQuery.data ?? []).forEach((list) => {
      result[list.id] = sortTasksForBoard(result[list.id] ?? []);
    });

    return result;
  }, [allTasks, listTasks, listsQuery.data, validTaskListOverrides]);

  const subtasksQueries = useQueries({
    queries: allTasks.map((task) => ({
      queryKey: queryKeys.subtasks.byTask(task.id),
      queryFn: () => fetchSubtasks(task.id),
      enabled: canQueryProject && Boolean(listsQuery.data),
    })),
  });

  const subtasksByTaskId = useMemo(() => {
    const result: Record<number, Subtask[]> = {};
    allTasks.forEach((task, index) => {
      result[task.id] = subtasksQueries[index]?.data ?? [];
    });
    return result;
  }, [allTasks, subtasksQueries]);

  const doneCount = allTasks.filter((task) => task.status === 'done').length;
  const totalCount = allTasks.length;
  const dueDates = allTasks
    .map((task) => (task.dueDate ? new Date(task.dueDate) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));
  const maxDue = dueDates.length > 0 ? new Date(Math.max(...dueDates.map((d) => d.getTime()))) : undefined;

  const createTaskMutation = useMutation({
    mutationFn: ({ listId, payload }: { listId: number; payload: TaskCreatePayload }) =>
      createTask(listId, payload),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId: numericProjectId,
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: TaskUpdatePayload }) =>
      updateTask(taskId, payload),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId: numericProjectId,
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId: numericProjectId,
      });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, targetListId }: { taskId: number; targetListId: number }) =>
      moveTaskToList(taskId, targetListId),
  });

  const sortTaskListsMutation = useMutation({
    mutationFn: ({
      taskListId,
      newPreviousTaskListId,
    }: {
      taskListId: number;
      newPreviousTaskListId: number | null;
    }) => sortTaskLists(numericProjectId, { taskListId, newPreviousTaskListId }),
    onMutate: async ({ taskListId, newPreviousTaskListId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists(numericProjectId) });
      const previousLists = queryClient.getQueryData(queryKeys.projects.lists(numericProjectId)) as
        | typeof listsQuery.data
        | undefined;

      if (previousLists) {
        queryClient.setQueryData(
          queryKeys.projects.lists(numericProjectId),
          reorderTaskLists(previousLists, taskListId, newPreviousTaskListId),
        );
      }

      return { previousLists };
    },
    onError: (error, _variables, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(queryKeys.projects.lists(numericProjectId), context.previousLists);
      }
      if (error instanceof Error) {
        toast.error(error.message);
      }
    },
    onSettled: () => {
      invalidateProjectLists(queryClient, numericProjectId);
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ listId, isArchived }: { listId: number; isArchived: boolean }) =>
      updateTaskList(listId, { isArchived }),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId: numericProjectId,
        includeProjectLists: true,
      });
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (listId: number) => deleteTaskList(listId),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId: numericProjectId,
        includeProjectLists: true,
      });
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: ({ taskId, title }: { taskId: number; title: string }) =>
      createSubtask(taskId, { title }),
    onSuccess: (subtask) => {
      invalidateSubtasks(queryClient, subtask.taskId);
    },
    onError: (error) => {
      const fieldError = getApiFieldValidationMessage(error, ['name', 'title']);
      const summary = getApiValidationSummary(error);
      if (fieldError) {
        toast.error(fieldError);
        return;
      }
      if (summary) {
        toast.error(summary);
        return;
      }
      if (error instanceof Error) {
        toast.error(error.message);
      }
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, status }: { subtaskId: number; status: SubtaskStatus }) =>
      updateSubtask(subtaskId, { status }),
    onSuccess: (subtask) => {
      invalidateSubtasks(queryClient, subtask.taskId);
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    },
  });

  const handleTaskSubmit = async (payload: TaskCreatePayload & { status: TaskStatus; tagIds: number[] }) => {
    if (!activeListId && !activeTask) {
      throw new Error('Список задач не найден');
    }
    if (activeTask) {
      await updateTaskMutation.mutateAsync({ taskId: activeTask.id, payload });
    } else if (activeListId) {
      await createTaskMutation.mutateAsync({ listId: activeListId, payload });
    }
  };

  const handleCreateTask = (listId: number) => {
    setQuickTaskListId(listId);
    setQuickTaskTitle('');
    setQuickTaskError(null);
  };

  const handleQuickTaskSubmit = async (listId: number) => {
    const title = quickTaskTitle.trim();
    if (!title || createTaskMutation.isPending) return;

    try {
      setQuickTaskError(null);
      await createTaskMutation.mutateAsync({
        listId,
        payload: {
          title,
          status: 'in_progress',
        },
      });
      setQuickTaskTitle('');
      setQuickTaskListId(null);
    } catch (error) {
      const fieldError = getApiFieldValidationMessage(error, ['name', 'title']);
      const summary = getApiValidationSummary(error);
      if (fieldError) {
        setQuickTaskError(fieldError);
        return;
      }
      if (summary) {
        toast.error(summary);
        return;
      }
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const handleEdit = (task: Task) => {
    setActiveListId(task.listId);
    setActiveTask(task);
    setTaskModalOpen(true);
  };

  const handleDelete = (task: Task) => {
    if (deleteTaskMutation.isPending) return;
    deleteTaskMutation.mutate(task.id);
  };

  const handleCreateSubtask = (taskId: number, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    createSubtaskMutation.mutate({ taskId, title: trimmedTitle });
  };

  const handleToggleSubtask = (subtaskId: number, status: SubtaskStatus) => {
    updateSubtaskMutation.mutate({ subtaskId, status });
  };

  const handleTaskStatusChange = async (task: Task, nextStatus: TaskStatus) => {
    if (updateTaskMutation.isPending) return;

    try {
      if (nextStatus === 'done') {
        const relatedSubtasks = subtasksByTaskId[task.id] ?? [];
        const undoneSubtasks = relatedSubtasks.filter((subtask) => subtask.status !== 'done');

        if (undoneSubtasks.length > 0) {
          await Promise.all(
            undoneSubtasks.map((subtask) =>
              updateSubtaskMutation.mutateAsync({ subtaskId: subtask.id, status: 'done' }),
            ),
          );
        }
      }

      await updateTaskMutation.mutateAsync({ taskId: task.id, payload: { status: nextStatus } });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const handleOpen = (task: Task) => {
    const next = new URLSearchParams(searchParams);
    next.set('taskId', String(task.id));
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace: true, preventScrollReset: true });
  };

  const handleCloseDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('taskId');
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace: true, preventScrollReset: true });
  };

  const handleAddColumn = () => {
    const nextOrderNumber = (listsQuery.data?.length ?? 0) + 1;
    createListMutation.mutate(`Этап ${nextOrderNumber}`);
  };

  const handleArchiveColumn = (listId: number) => {
    if (updateListMutation.isPending) return;
    setActiveColumnMenuId(null);
    updateListMutation.mutate({ listId, isArchived: true });
  };

  const handleRestoreColumn = (listId: number) => {
    if (updateListMutation.isPending) return;
    setActiveColumnMenuId(null);
    updateListMutation.mutate({ listId, isArchived: false });
  };

  const handleDeleteColumn = (listId: number) => {
    if (deleteListMutation.isPending) return;
    const confirmed = window.confirm('Удалить колонку и все задачи в ней?');
    if (!confirmed) return;
    setActiveColumnMenuId(null);
    deleteListMutation.mutate(listId);
  };

  const canDropToList = (targetListId: number, targetListStatus: string): boolean =>
    Boolean(
      dragState &&
      dragState.fromListId !== targetListId &&
      targetListStatus !== 'archive' &&
      !moveTaskMutation.isPending,
    );

  const canReorderColumn = (targetListId: number): boolean =>
    Boolean(
      columnDragListId &&
      columnDragListId !== targetListId &&
      !sortTaskListsMutation.isPending,
    );

  const dropSlotStyle = dragState
    ? ({ '--kanban-drop-slot-height': `${Math.max(52, Math.round(dragState.cardHeight))}px` } as React.CSSProperties)
    : undefined;

  const handleTaskDragStart = (task: Task, event: React.DragEvent<HTMLDivElement>) => {
    if (moveTaskMutation.isPending) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
    setDragState({
      taskId: task.id,
      fromListId: validTaskListOverrides[task.id] ?? task.listId,
      cardHeight: event.currentTarget.getBoundingClientRect().height,
    });
  };

  useEffect(() => {
    if (!dropOverrideStorageKey) return;

    try {
      if (Object.keys(validTaskListOverrides).length === 0) {
        window.localStorage.removeItem(dropOverrideStorageKey);
      } else {
        window.localStorage.setItem(dropOverrideStorageKey, JSON.stringify(validTaskListOverrides));
      }
    } catch (error) {
      console.error('Failed to save task list overrides:', error);
    }
  }, [dropOverrideStorageKey, validTaskListOverrides]);

  const handleTaskDragEnd = () => {
    setDragState(null);
    setActiveDropListId(null);
    dropDepthRef.current = {};
  };

  const handleColumnSortDragStart = (listId: number, event: React.DragEvent<HTMLDivElement>) => {
    if (sortTaskListsMutation.isPending) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/taskflow-tasklist', String(listId));
    setColumnDragListId(listId);
    setActiveColumnSortTarget(null);
  };

  const handleColumnSortDragEnd = () => {
    setColumnDragListId(null);
    setActiveColumnSortTarget(null);
  };

  const resolveColumnPlacement = (
    event: React.DragEvent<HTMLDivElement>,
    target: HTMLDivElement,
  ): 'before' | 'after' => {
    const rect = target.getBoundingClientRect();
    return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
  };

  const resolveNewPreviousTaskListId = (
    lists: typeof displayedLists,
    taskListId: number,
    targetListId: number,
    placement: 'before' | 'after',
  ): number | null => {
    const filtered = lists.filter((list) => list.id !== taskListId);
    const targetIndex = filtered.findIndex((list) => list.id === targetListId);
    if (targetIndex === -1) {
      return null;
    }

    if (placement === 'after') {
      return filtered[targetIndex]?.id ?? null;
    }

    const previous = filtered[targetIndex - 1];
    return previous?.id ?? null;
  };

  const handleColumnDragEnter = (
    event: React.DragEvent<HTMLDivElement>,
    targetListId: number,
    targetListStatus: string,
  ) => {
    if (columnDragListId) {
      if (!canReorderColumn(targetListId)) {
        return;
      }

      event.preventDefault();
      setActiveColumnSortTarget({
        listId: targetListId,
        placement: resolveColumnPlacement(event, event.currentTarget),
      });
      return;
    }

    if (!canDropToList(targetListId, targetListStatus)) {
      return;
    }

    event.preventDefault();
    dropDepthRef.current[targetListId] = (dropDepthRef.current[targetListId] ?? 0) + 1;
    setActiveDropListId(targetListId);
  };

  const handleColumnDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetListId: number,
    targetListStatus: string,
  ) => {
    if (columnDragListId) {
      if (!canReorderColumn(targetListId)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const placement = resolveColumnPlacement(event, event.currentTarget);
      if (
        activeColumnSortTarget?.listId !== targetListId ||
        activeColumnSortTarget.placement !== placement
      ) {
        setActiveColumnSortTarget({ listId: targetListId, placement });
      }
      return;
    }

    if (!canDropToList(targetListId, targetListStatus)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (activeDropListId !== targetListId) {
      setActiveDropListId(targetListId);
    }
  };

  const handleColumnDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
    targetListId: number,
    targetListStatus: string,
  ) => {
    if (columnDragListId) {
      if (!canReorderColumn(targetListId)) {
        return;
      }

      const relatedTarget = event.relatedTarget as Node | null;
      if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
        return;
      }

      if (activeColumnSortTarget?.listId === targetListId) {
        setActiveColumnSortTarget(null);
      }
      return;
    }

    if (!canDropToList(targetListId, targetListStatus)) {
      return;
    }

    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    const nextDepth = Math.max((dropDepthRef.current[targetListId] ?? 1) - 1, 0);
    dropDepthRef.current[targetListId] = nextDepth;
    if (nextDepth === 0 && activeDropListId === targetListId) {
      setActiveDropListId(null);
    }
  };

  const handleColumnDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetListId: number,
    targetListStatus: string,
  ) => {
    if (columnDragListId) {
      if (!canReorderColumn(targetListId)) {
        return;
      }

      event.preventDefault();
      const placement =
        activeColumnSortTarget?.listId === targetListId
          ? activeColumnSortTarget.placement
          : resolveColumnPlacement(event, event.currentTarget);
      const newPreviousTaskListId = resolveNewPreviousTaskListId(
        displayedLists,
        columnDragListId,
        targetListId,
        placement,
      );

      setColumnDragListId(null);
      setActiveColumnSortTarget(null);

      try {
        await sortTaskListsMutation.mutateAsync({
          taskListId: columnDragListId,
          newPreviousTaskListId,
        });
      } catch {
        // handled in mutation callbacks
      }
      return;
    }

    if (!dragState || !canDropToList(targetListId, targetListStatus)) {
      return;
    }

    event.preventDefault();
    const { taskId } = dragState;

    setDragState(null);
    setActiveDropListId(null);
    dropDepthRef.current = {};
    dispatch({ type: 'UPDATE', taskId, targetListId });

    try {
      await moveTaskMutation.mutateAsync({ taskId, targetListId });
      invalidateTaskRelations(queryClient, {
        projectId: numericProjectId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось перенести задачу на бэкенде';
      toast.error(message, { description: 'Позиция сохранена локально.' });
    }
  };

  const projectDeadlineDate = parseProjectDate(projectQuery.data?.deadline) ?? maxDue;
  const projectDeadlineLabel = formatProjectDeadlineDate(projectDeadlineDate);
  const projectDeadlineOverdue = isProjectDeadlineOverdue(projectQuery.data?.deadline, projectQuery.data?.status);

  const showProjectError = !canQueryProject || projectQuery.isError;

  const deadlineReminderKey = useMemo(() => {
    const project = projectQuery.data;
    if (!project || !isProjectDeadlineOverdue(project.deadline, project.status)) {
      return null;
    }

    return `${project.id}:${project.deadline?.slice(0, 10) ?? 'none'}`;
  }, [projectQuery.data]);

  const deadlineReminderOpen = Boolean(
    deadlineReminderKey && deadlineReminderKey !== acknowledgedDeadlineReminderKey,
  );

  const acknowledgeDeadlineReminder = () => {
    if (!deadlineReminderKey) {
      return;
    }
    setAcknowledgedDeadlineReminderKey(deadlineReminderKey);
  };

  const handleChangeProjectDeadline = () => {
    if (deadlineReminderKey) {
      setAcknowledgedDeadlineReminderKey(deadlineReminderKey);
    }
    setProjectEditOpen(true);
  };

  const handleProjectUpdated = () => {
    invalidateProjects(queryClient);
    invalidateProject(queryClient, numericProjectId);
  };


  useEffect(() => {
    if (activeColumnMenuId === null) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (columnMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setActiveColumnMenuId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeColumnMenuId]);

  useEffect(() => {
    if (quickTaskListId === null) return;
    quickTaskInputRef.current?.focus();
  }, [quickTaskListId]);

  return (
    <>
      <div className="dashboard-layout">
        <DashboardSidebar />
        <div className="dashboard-main">
          <div className="project-header">
            <div className="project-header__left">
              <div className="project-pill">
                <span className="project-pill__badge">{projectQuery.data?.name?.[0] ?? 'П'}</span>
                <span className="project-pill__name">{projectQuery.data?.name ?? 'Проект'}</span>
              </div>
              <Tabs items={tabs} value={tab} onChange={setTab} className="project-tabs" />
            </div>

            <div className="project-summary">
              <div className="project-summary__pill">
                <span className="project-summary__dot" />
                {projectQuery.data ? projectStatusLabels[projectQuery.data.status] : 'В работе'}
              </div>
              <div className="project-summary__pill">
                Задач {doneCount}/{totalCount}
              </div>
              <div
                className={
                  `project-summary__pill project-summary__pill--deadline${projectDeadlineOverdue ? ' project-summary__pill--deadline-overdue' : ''}`
                }
              >
                <span className="project-summary__calendar" />
                <span className="project-summary__deadline-text">{projectDeadlineLabel}</span>
              </div>
            </div>
          </div>

          {tab === 'about' ? (
            <section className="surface p-6 stack stack-gap-sm">
              <h2 className="text-title-sm">Описание проекта</h2>
              <p className="text-body-md text-(--color-text-secondary)">
                {projectQuery.data?.description?.trim() || 'Описание проекта не заполнено.'}
              </p>
            </section>
          ) : null}

          {tab === 'tasks' ? (
            <div className="project-board">
              <div className="project-board__toolbar">
                <TaskBoardFilters
                  search={search}
                  onSearchChange={setSearch}
                  filtersOpen={filtersOpen}
                  onFiltersOpenChange={setFiltersOpen}
                  priorityDateFiltersEnabled={isTaskPriorityDateFiltersEnabled}
                  statusFilterEnabled={isTaskStatusFilterEnabled}
                  priorityFilter={priorityFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  tagFilters={tagFilters}
                  tags={tagsQuery.data ?? []}
                  onToggleTagFilter={toggleTagFilter}
                  onRemoveTagFilter={removeTagFilter}
                  dueFrom={dueFrom}
                  onDueFromChange={setDueFrom}
                  dueTo={dueTo}
                  onDueToChange={setDueTo}
                  activePriorityLabel={activePriorityLabel}
                  activeStatusLabel={activeStatusLabel}
                />
                <Button type="button" onClick={handleAddColumn} className="project-board__add">
                  Добавить колонку
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>

              {showProjectError ? (
                <EmptyState
                  title="Проект не найден"
                  description="Попробуйте выбрать проект снова."
                />
              ) : listsQuery.isLoading ? (
                <div className="stack stack-gap-sm">
                  <Skeleton variant="card" />
                  <Skeleton variant="card" />
                </div>
              ) : listsQuery.isError ? (
                <EmptyState
                  title="Не удалось загрузить списки"
                  description="Проверьте соединение и попробуйте еще раз."
                />
              ) : (
                <div className="kanban">
                  {displayedLists.map((list, index) => {
                    const isTaskDropActive = activeDropListId === list.id && canDropToList(list.id, list.status);
                    const isColumnDropActive = activeColumnSortTarget?.listId === list.id;
                    const isDropActive = isTaskDropActive || isColumnDropActive;

                    return (
                      <div
                        key={list.id}
                        className={`kanban-column${isDropActive ? ' kanban-column--drop-active' : ''}`}
                        onDragEnter={(event) => handleColumnDragEnter(event, list.id, list.status)}
                        onDragOver={(event) => handleColumnDragOver(event, list.id, list.status)}
                        onDragLeave={(event) => handleColumnDragLeave(event, list.id, list.status)}
                        onDrop={(event) => void handleColumnDrop(event, list.id, list.status)}
                      >
                        <div className={`surface kanban-stage${list.status === 'archive' ? ' kanban-stage--archived' : ''}`}>
                          <div
                            className="kanban-column__header"
                            draggable={!sortTaskListsMutation.isPending && displayedLists.length > 1}
                            onDragStart={(event) => handleColumnSortDragStart(list.id, event)}
                            onDragEnd={handleColumnSortDragEnd}
                          >
                            <span>{`${index + 1} этап`}</span>
                            <div className="menu" ref={activeColumnMenuId === list.id ? columnMenuRef : null}>
                              <button
                                type="button"
                                className="kanban-column__menu"
                                aria-label="Меню колонки"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveColumnMenuId((prev) => (prev === list.id ? null : list.id));
                                }}
                              >
                                <MoreVerticalIcon className="h-4 w-4" />
                              </button>
                              {activeColumnMenuId === list.id ? (
                                <div className="menu__popover kanban-column__menu-popover">
                                  {list.status === 'archive' ? (
                                    <button
                                      type="button"
                                      className="menu__item"
                                      onClick={() => handleRestoreColumn(list.id)}
                                      disabled={updateListMutation.isPending}
                                    >
                                      <RecoverIcon className="h-4 w-4" />
                                      Восстановить
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="menu__item"
                                      onClick={() => handleArchiveColumn(list.id)}
                                      disabled={updateListMutation.isPending}
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                      Сделано
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="menu__item menu__item--danger"
                                    onClick={() => handleDeleteColumn(list.id)}
                                    disabled={deleteListMutation.isPending}
                                  >
                                    <DeleteIcon className="h-4 w-4" />
                                    Удалить
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="kanban-column__add"
                            onClick={() => handleCreateTask(list.id)}
                            disabled={list.status === 'archive'}
                          >
                            Добавить задачу
                          </button>
                        </div>

                        <div className={`kanban-column__cards${isDropActive ? ' kanban-column__cards--drop-active' : ''}`}>
                          <div className="kanban-column__drop-slot" style={dropSlotStyle} />
                          {quickTaskListId === list.id ? (
                            <div className="kanban-column__quick-create">
                              <input
                                ref={quickTaskInputRef}
                                type="text"
                                className="kanban-column__quick-input"
                                placeholder="Задача"
                                value={quickTaskTitle}
                                onChange={(event) => {
                                  setQuickTaskTitle(event.target.value);
                                  if (quickTaskError) {
                                    setQuickTaskError(null);
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void handleQuickTaskSubmit(list.id);
                                  }
                                  if (event.key === 'Escape') {
                                    setQuickTaskListId(null);
                                    setQuickTaskTitle('');
                                    setQuickTaskError(null);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="kanban-column__quick-submit"
                                onClick={() => void handleQuickTaskSubmit(list.id)}
                                disabled={!quickTaskTitle.trim() || createTaskMutation.isPending}
                                aria-label="Создать задачу"
                              >
                                <ChevronRightIcon className="h-4 w-4" />
                              </button>
                              {quickTaskError ? (
                                <p className="text-body-sm text-[color:var(--color-danger-500)]">{quickTaskError}</p>
                              ) : null}
                            </div>
                          ) : null}
                          {(boardListTasks[list.id] ?? []).map((task) => (
                            <TaskBoardCard
                              key={task.id}
                              task={task}
                              columnArchived={list.status === 'archive'}
                              draggable={list.status !== 'archive'}
                              dragging={dragState?.taskId === task.id}
                              onDragStart={handleTaskDragStart}
                              onDragEnd={handleTaskDragEnd}
                              tagLookup={tagLookup}
                              subtasks={subtasksByTaskId[task.id] ?? []}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onOpen={handleOpen}
                              onSubtaskCreate={handleCreateSubtask}
                              onSubtaskToggle={handleToggleSubtask}
                              onStatusChange={(_, nextStatus) => void handleTaskStatusChange(task, nextStatus)}
                              subtasksDisabled={
                                list.status === 'archive' || createSubtaskMutation.isPending || updateSubtaskMutation.isPending
                              }
                              disabled={
                                list.status === 'archive' ||
                                updateTaskMutation.isPending ||
                                deleteTaskMutation.isPending ||
                                updateSubtaskMutation.isPending
                              }
                            />
                          ))}
                          {taskQueries[index]?.isLoading ? (
                            <Skeleton variant="card" />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <DashboardBottomNav />
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setActiveTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={activeTask}
        tags={tagsQuery.data}
        projectDeadline={projectQuery.data?.deadline ?? null}
      />
      <EditProjectModal
        isOpen={projectEditOpen}
        project={projectQuery.data ?? null}
        onClose={() => setProjectEditOpen(false)}
        onUpdated={handleProjectUpdated}
      />
      <ProjectDeadlineReminderModal
        isOpen={deadlineReminderOpen}
        projectName={projectQuery.data?.name}
        onAcknowledge={acknowledgeDeadlineReminder}
        onChangeDeadline={handleChangeProjectDeadline}
      />
      {isDrawerOpen ? (
        <TaskDetailDrawer taskId={drawerTaskId} onClose={handleCloseDrawer} />
      ) : null}
    </>
  );
}
