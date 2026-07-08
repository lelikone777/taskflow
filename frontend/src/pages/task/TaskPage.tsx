import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
  formatProjectDeadlineDate,
  isProjectDeadlineOverdue,
  parseProjectDate,
  projectStatusLabels,
} from '@/entities/project';
import {
  getTaskStatusAction,
  mapAttachmentError,
} from '@/entities/task';
import {
  createTask,
  createTaskList,
  createSubtask,
  deleteTaskList,
  deleteAttachment,
  deleteTask,
  deleteSubtask,
  fetchAttachments,
  fetchProject,
  fetchTaskLists,
  fetchSubtasks,
  fetchTags,
  fetchTask,
  fetchTasks,
  invalidateAttachments,
  invalidateProject,
  invalidateProjectLists,
  invalidateProjects,
  invalidateSubtasks,
  invalidateTask,
  invalidateTaskRelations,
  moveTaskToList,
  queryKeys,
  presignAttachment,
  reorderTaskLists,
  sortTaskLists,
  updateSubtask,
  updateTaskList,
  updateTask,
  upsertTaskReminder,
  uploadAttachment,
  type Attachment,
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
import { cn } from '@/shared/lib/cn';
import { getTaskDisplayStatus, sortTasksForBoard } from '@/shared/lib/taskBoard';
import {
  formatTaskDateTimeLabel,
  getDefaultTaskMeta,
  getTaskMeta,
  reminderRepeatLabel,
  toDateInputValue,
  setTaskMeta,
  type TaskReminderRepeat,
} from '@/shared/lib/taskMeta';
import { Button, EmptyState, IconButton, Input, Modal, Progress, Skeleton, Tag } from '@/shared/ui';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  DeleteIcon,
  MoreVerticalIcon,
  PlusIcon,
  RecoverIcon,
  SettingsIcon,
} from '@/shared/ui/icons';
import { DashboardBottomNav, DashboardSidebar } from '@/widgets/dashboard';
import { EditProjectModal, ProjectDeadlineReminderModal, TaskModal, TaskScheduleModal } from '@/widgets/modals';
import { TaskBoardCard } from '@/widgets/project/TaskBoardCard';
import { TaskBoardFilters } from '@/widgets/project/TaskBoardFilters';
import { useTaskBoardFilters } from '@/widgets/project/model/useTaskBoardFilters';
import { TaskAttachmentsWidget } from '@/widgets/task/TaskAttachmentsWidget';
import { TaskPrioritySelect } from '@/widgets/task/TaskPrioritySelect';
import { toast } from 'sonner';

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

export function TaskPage() {
  const { taskId } = useParams();
  const numericTaskId = Number(taskId);
  const navigate = useNavigate();
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
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [takeInWorkCandidateTask, setTakeInWorkCandidateTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [quickTaskListId, setQuickTaskListId] = useState<number | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskError, setQuickTaskError] = useState<string | null>(null);
  const [activeColumnMenuId, setActiveColumnMenuId] = useState<number | null>(null);
  const canQueryTask = Number.isFinite(numericTaskId) && numericTaskId > 0;
  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.detail(numericTaskId),
    queryFn: () => fetchTask(numericTaskId),
    enabled: canQueryTask,
  });

  const projectId = taskQuery.data?.projectId;
  const dropOverrideStorageKey = useMemo(
    () => (projectId ? `taskflow:task-list-overrides:${projectId}` : null),
    [projectId],
  );

  const [taskListOverrides, dispatch] = useReducer(overridesReducer, {});

// Загрузка при смене ключа
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  const [isDetailSubtaskInputOpen, setIsDetailSubtaskInputOpen] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const quickTaskInputRef = useRef<HTMLInputElement | null>(null);
  const dropDepthRef = useRef<Record<number, number>>({});
  const projectQuery = useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => fetchProject(projectId!),
    enabled: Boolean(projectId),
  });

  const listsQuery = useQuery({
    queryKey: queryKeys.projects.lists(projectId),
    queryFn: () => fetchTaskLists(projectId!),
    enabled: Boolean(projectId),
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.all(),
    queryFn: () => fetchTags(),
  });

  const attachmentsQuery = useQuery({
    queryKey: queryKeys.attachments.byTask(numericTaskId),
    queryFn: () => fetchAttachments(numericTaskId),
    enabled: canQueryTask,
  });

  const subtasksQuery = useQuery({
    queryKey: queryKeys.subtasks.byTask(numericTaskId),
    queryFn: () => fetchSubtasks(numericTaskId),
    enabled: canQueryTask,
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
    mutationFn: (name: string) => createTaskList(projectId!, { name }),
    onSuccess: (list) => {
      invalidateProjectLists(queryClient, projectId);
      setActiveListId(list.id);
    },
    onError: () => {
      defaultListCreatedRef.current = false;
    },
  });

  useEffect(() => {
    if (!projectId) return;
    if (listsQuery.isLoading) return;
    if (!listsQuery.data || listsQuery.data.length > 0) return;
    if (defaultListCreatedRef.current) return;

    defaultListCreatedRef.current = true;
    createListMutation.mutate('Основной');
  }, [projectId, listsQuery.isLoading, listsQuery.data, createListMutation]);

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

  const allTasks = useMemo(() => Object.values(listTasks).flat(), [listTasks]);

  const validTaskListOverrides = useMemo(() => {
    if (Object.keys(taskListOverrides).length === 0) {
      return taskListOverrides;
    }

    const availableListIds = new Set((listsQuery.data ?? []).map(list => list.id));
    const result: Record<number, number> = {};
    let hasInvalidEntries = false;

    for (const [taskIdStr, targetListId] of Object.entries(taskListOverrides)) {
      const taskId = Number(taskIdStr);
      const task = allTasks.find(t => t.id === taskId);

      if (task && availableListIds.has(targetListId) && task.listId !== targetListId) {
        result[taskId] = targetListId;
      } else {
        hasInvalidEntries = true;
      }
    }

    return hasInvalidEntries ? result : taskListOverrides;
  }, [allTasks, listsQuery.data, taskListOverrides]);

  useEffect(() => {
    if (!dropOverrideStorageKey) {
      return;
    }

    if (Object.keys(validTaskListOverrides).length === 0) {
      window.localStorage.removeItem(dropOverrideStorageKey);
      return;
    }

    window.localStorage.setItem(dropOverrideStorageKey, JSON.stringify(validTaskListOverrides));
  }, [dropOverrideStorageKey, validTaskListOverrides]);


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

  const boardSubtasksQueries = useQueries({
    queries: allTasks.map((task) => ({
      queryKey: queryKeys.subtasks.byTask(task.id),
      queryFn: () => fetchSubtasks(task.id),
      enabled: Boolean(projectId && listsQuery.data),
    })),
  });
  const subtasksByTaskId = useMemo(() => {
    const result: Record<number, Subtask[]> = {};
    allTasks.forEach((task, index) => {
      result[task.id] = boardSubtasksQueries[index]?.data ?? [];
    });
    return result;
  }, [allTasks, boardSubtasksQueries]);
  const doneCount = allTasks.filter((item) => item.status === 'done').length;
  const totalCount = allTasks.length;

  const dueDates = allTasks
    .map((item) => (item.dueDate ? new Date(item.dueDate) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));
  const maxDue = dueDates.length > 0 ? new Date(Math.max(...dueDates.map((d) => d.getTime()))) : undefined;

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: TaskUpdatePayload }) =>
      updateTask(taskId, payload),
    onSuccess: (_, variables) => {
      invalidateTaskRelations(queryClient, {
        projectId,
        taskId: variables.taskId,
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ listId, payload }: { listId: number; payload: TaskCreatePayload }) =>
      createTask(listId, payload),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId,
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId,
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
    }) => sortTaskLists(projectId!, { taskListId, newPreviousTaskListId }),
    onMutate: async ({ taskListId, newPreviousTaskListId }) => {
      if (!projectId) {
        return { previousLists: undefined };
      }

      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists(projectId) });
      const previousLists = queryClient.getQueryData(queryKeys.projects.lists(projectId)) as
        | typeof listsQuery.data
        | undefined;

      if (previousLists) {
        queryClient.setQueryData(
          queryKeys.projects.lists(projectId),
          reorderTaskLists(previousLists, taskListId, newPreviousTaskListId),
        );
      }

      return { previousLists };
    },
    onError: (error, _variables, context) => {
      if (projectId && context?.previousLists) {
        queryClient.setQueryData(queryKeys.projects.lists(projectId), context.previousLists);
      }
      if (error instanceof Error) {
        toast.error(error.message);
      }
    },
    onSettled: () => {
      invalidateProjectLists(queryClient, projectId);
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ listId, isArchived }: { listId: number; isArchived: boolean }) =>
      updateTaskList(listId, { isArchived }),
    onSuccess: () => {
      invalidateTaskRelations(queryClient, {
        projectId,
        taskId: numericTaskId,
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
        projectId,
        taskId: numericTaskId,
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
    mutationFn: (payload: { taskId: number; title: string }) =>
      createSubtask(payload.taskId, { title: payload.title }),
    onSuccess: (subtask) => {
      invalidateSubtasks(queryClient, subtask.taskId);
      setSubtaskError(null);
      if (subtask.taskId === numericTaskId) {
        setNewSubtaskTitle('');
        setIsDetailSubtaskInputOpen(false);
      }
    },
    onError: (error) => {
      const fieldError = getApiFieldValidationMessage(error, ['name', 'title']);
      const summary = getApiValidationSummary(error);
      if (fieldError) {
        setSubtaskError(fieldError);
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
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: number) => deleteSubtask(subtaskId),
    onSuccess: () => {
      invalidateSubtasks(queryClient, numericTaskId);
    },
  });

  const presignMutation = useMutation({
    mutationFn: ({ taskId, file }: { taskId: number; file: File }) =>
      presignAttachment(taskId, {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ uploadUrl, file }: { uploadUrl: string; file: File }) =>
      uploadAttachment(uploadUrl, file),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(attachmentId),
    onSuccess: () => {
      invalidateAttachments(queryClient, numericTaskId);
    },
  });

  const handleTaskSubmit = async (payload: TaskCreatePayload & { status: TaskStatus; tagIds: number[] }) => {
    if (activeTask) {
      await updateTaskMutation.mutateAsync({ taskId: activeTask.id, payload });
      invalidateTask(queryClient, activeTask.id);
    } else if (activeListId) {
      await createTaskMutation.mutateAsync({ listId: activeListId, payload });
    } else if (numericTaskId) {
      await updateTaskMutation.mutateAsync({ taskId: numericTaskId, payload });
      invalidateTask(queryClient, numericTaskId);
    } else {
      throw new Error('Задача не найдена');
    }
  };

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setSubtaskError(null);
    createSubtaskMutation.mutate({ taskId: numericTaskId, title });
  };

  const handleCreateBoardSubtask = (taskId: number, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSubtaskError(null);
    createSubtaskMutation.mutate({ taskId, title: trimmedTitle });
  };

  const requestTakeInWork = (task: Task) => {
    setTakeInWorkCandidateTask(task);
  };

  const handleToggleSubtask = (subtask: Subtask) => {
    if (taskQuery.data && getTaskDisplayStatus(taskQuery.data) === 'planned') {
      requestTakeInWork(taskQuery.data);
      return;
    }
    const nextStatus: SubtaskStatus = subtask.status === 'done' ? 'todo' : 'done';
    updateSubtaskMutation.mutate({ subtaskId: subtask.id, status: nextStatus });
  };

  const handleDeleteSubtask = (subtask: Subtask) => {
    if (deleteSubtaskMutation.isPending) return;
    const confirmed = window.confirm(`Удалить подзадачу «${subtask.title}»?`);
    if (!confirmed) return;
    deleteSubtaskMutation.mutate(subtask.id);
  };

  const handleUploadFiles = async (files: File[]) => {
    setAttachmentError(null);

    if (!numericTaskId || files.length === 0) return;

    try {
      for (const file of files) {
        const { uploadUrl } = await presignMutation.mutateAsync({ taskId: numericTaskId, file });
        await uploadMutation.mutateAsync({ uploadUrl, file });
      }
      invalidateAttachments(queryClient, numericTaskId);
    } catch (error) {
      if (isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        const message =
          (typeof detail === 'string' && detail) ||
          error.response?.data?.message ||
          'Не удалось загрузить файл';
        setAttachmentError(mapAttachmentError(message));
      } else if (error instanceof Error) {
        setAttachmentError(error.message);
      } else {
        setAttachmentError('Не удалось загрузить файл');
      }
      throw error;
    }
  };

  const handleDeleteAttachment = (attachment: Attachment) => {
    if (deleteAttachmentMutation.isPending) return;
    const confirmed = window.confirm(`Удалить файл «${attachment.filename}»?`);
    if (!confirmed) return;
    deleteAttachmentMutation.mutate(attachment.id);
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    if (!attachment.s3Key) {
      setAttachmentError('Файл пока недоступен для скачивания. Обновите страницу и попробуйте снова.');
      return;
    }
    window.open(attachment.s3Key, '_blank', 'noopener,noreferrer');
  };

  const attachments = attachmentsQuery.data ?? [];
  const subtasks = subtasksQuery.data ?? [];
  const completedCount = subtasks.filter((item) => item.status === 'done').length;
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  const isUploading = presignMutation.isPending || uploadMutation.isPending;

  const taskTags = (taskQuery.data?.tagIds ?? [])
    .map((tagId) => tagLookup[tagId])
    .filter(Boolean) as TagEntity[];

  const currentTaskMeta = taskQuery.data ? getTaskMeta(taskQuery.data.id) : getDefaultTaskMeta();

  const dueDateLabel = taskQuery.data
    ? formatTaskDateTimeLabel(taskQuery.data.dueDate, currentTaskMeta.dueTime, 'до')
    : '—';
  const hasDueDate = dueDateLabel !== '—';
  const startDateLabel = currentTaskMeta.startDate
    ? formatTaskDateTimeLabel(currentTaskMeta.startDate, currentTaskMeta.startTime, 'в')
    : null;
  const resolvedReminderTime =
    taskQuery.data?.reminderTimeHour != null && taskQuery.data?.reminderTimeMinutes != null
      ? `${String(taskQuery.data.reminderTimeHour).padStart(2, '0')}:${String(taskQuery.data.reminderTimeMinutes).padStart(2, '0')}`
      : currentTaskMeta.reminderTime;
  const resolvedReminderRepeat = taskQuery.data?.reminderRepeat ?? currentTaskMeta.reminderRepeat;
  const reminderTimeLabel = resolvedReminderTime ? `В ${resolvedReminderTime}` : 'Нет';
  const reminderRepeatText = reminderRepeatLabel(resolvedReminderRepeat);
  const hasReminder = Boolean(resolvedReminderTime);
  const hasAnySchedule = Boolean(startDateLabel) || hasDueDate;
  const currentTaskDisplayStatus = taskQuery.data ? getTaskDisplayStatus(taskQuery.data) : null;
  const currentStatusAction = currentTaskDisplayStatus ? getTaskStatusAction(currentTaskDisplayStatus) : null;

  const projectName = projectQuery.data?.name ?? 'Проект';
  const projectBadge = projectName.trim().charAt(0).toUpperCase();
  const projectDeadlineDate = parseProjectDate(projectQuery.data?.deadline) ?? maxDue;
  const projectDeadlineLabel = formatProjectDeadlineDate(projectDeadlineDate);
  const projectDeadlineOverdue = isProjectDeadlineOverdue(projectQuery.data?.deadline, projectQuery.data?.status);

  const handleCreateTask = (listId: number) => {
    setQuickTaskListId(listId);
    setQuickTaskTitle('');
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

  const handleEditTask = (task: Task) => {
    setActiveListId(task.listId);
    setActiveTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    if (deleteTaskMutation.isPending) return;
    deleteTaskMutation.mutate(task.id);
  };

  const getTodayDateOnly = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  };

  const resolveReminderSyncPayload = (
    task: Task,
  ): { date: string; hour: number; minutes: number; repeat: TaskReminderRepeat } | null => {
    const meta = getTaskMeta(task.id);
    const repeat = task.reminderRepeat && task.reminderRepeat !== 'none' ? task.reminderRepeat : meta.reminderRepeat;
    if (repeat === 'none') {
      return null;
    }

    const reminderTime =
      task.reminderTimeHour != null && task.reminderTimeMinutes != null
        ? `${String(task.reminderTimeHour).padStart(2, '0')}:${String(task.reminderTimeMinutes).padStart(2, '0')}`
        : meta.reminderTime;
    if (!reminderTime) {
      return null;
    }

    const [hourRaw, minutesRaw] = reminderTime.split(':');
    const hour = Number(hourRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isInteger(hour) || !Number.isInteger(minutes)) {
      return null;
    }

    const fallbackDate = toDateInputValue(task.reminderDate ?? task.dueDate ?? null);
    const candidateDate = meta.reminderDate ?? meta.startDate ?? fallbackDate;
    if (!candidateDate) {
      return null;
    }

    const todayDate = getTodayDateOnly();
    const date = candidateDate < todayDate ? todayDate : candidateDate;

    return {
      date,
      hour,
      minutes,
      repeat,
    };
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

      if (task.status === 'planned' && nextStatus === 'in_progress') {
        const reminderPayload = resolveReminderSyncPayload(task);
        if (reminderPayload) {
          await upsertTaskReminder(task.id, reminderPayload);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const handleOpenTask = (task: Task) => {
    navigate(`/task/${task.id}`);
  };

  const handleDetailStatusClick = () => {
    if (!taskQuery.data || !currentStatusAction?.nextStatus) {
      return;
    }

    if (currentStatusAction.planned && currentStatusAction.nextStatus === 'in_progress') {
      requestTakeInWork(taskQuery.data);
      return;
    }

    void handleTaskStatusChange(taskQuery.data, currentStatusAction.nextStatus);
  };

  const handleDetailTakeInWorkConfirm = () => {
    if (!takeInWorkCandidateTask) {
      return;
    }
    const task = takeInWorkCandidateTask;
    setTakeInWorkCandidateTask(null);
    void handleTaskStatusChange(task, 'in_progress');
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
        projectId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось перенести задачу на бэкенде';
      toast.error(message, { description: 'Позиция сохранена локально.' });
    }
  };

  const openEditModal = () => {
    if (!taskQuery.data) return;
    setActiveTask(taskQuery.data);
    setActiveListId(taskQuery.data.listId);
    setTaskModalOpen(true);
  };

  const openScheduleModal = () => {
    if (!taskQuery.data) {
      return;
    }
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (value: {
    dueDate: string | null;
    dueTime: string | null;
    scheduleEnabled: boolean;
    startDate: string | null;
    startTime: string | null;
    reminderDate: string | null;
    reminderTime: string | null;
    reminderRepeat: TaskReminderRepeat;
  }) => {
    if (!taskQuery.data) {
      throw new Error('Задача не найдена');
    }

    const nextStatus: TaskStatus = value.scheduleEnabled
      ? 'planned'
      : taskQuery.data.status === 'planned'
        ? 'in_progress'
        : taskQuery.data.status;

    await updateTaskMutation.mutateAsync({
      taskId: taskQuery.data.id,
      payload: {
        dueDate: value.dueDate ? new Date(value.dueDate).toISOString() : null,
        status: nextStatus,
        startAt: value.scheduleEnabled && value.startDate
          ? new Date(`${value.startDate}T${value.startTime ?? '00:00'}:00`).toISOString()
          : null,
        deadline: value.dueDate
          ? new Date(`${value.dueDate}T${value.dueTime ?? '23:59'}:00`).toISOString()
          : null,
      },
    });

    if (nextStatus !== 'planned' && value.reminderRepeat !== 'none' && value.reminderDate && value.reminderTime) {
      const [hourRaw, minutesRaw] = value.reminderTime.split(':');
      const hour = Number(hourRaw);
      const minutes = Number(minutesRaw);
      if (Number.isInteger(hour) && Number.isInteger(minutes)) {
        await upsertTaskReminder(taskQuery.data.id, {
          date: value.reminderDate,
          hour,
          minutes,
          repeat: value.reminderRepeat,
        });
      }
    }

    setTaskMeta(taskQuery.data.id, {
      dueTime: value.dueTime,
      startDate: value.startDate,
      startTime: value.startTime,
      reminderDate: value.reminderDate,
      reminderTime: value.reminderTime,
      reminderRepeat: value.reminderRepeat,
    });

    invalidateTaskRelations(queryClient, {
      projectId,
      taskId: taskQuery.data.id,
    });
  };

  const handlePriorityChange = async (nextPriority: 'high' | 'medium' | 'low') => {
    if (!taskQuery.data || updateTaskMutation.isPending) {
      return;
    }
    if (taskQuery.data.priority === nextPriority) {
      return;
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId: taskQuery.data.id,
        payload: { priority: nextPriority },
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

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
    if (!projectId) {
      return;
    }
    invalidateProjects(queryClient);
    invalidateProject(queryClient, projectId);
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
          <div className="task-detail-layout">
            <div className="task-detail-main">
              <div className="project-header">
                <div className="project-header__left">
                  <div className="project-pill">
                    <span className="project-pill__badge">{projectBadge || 'П'}</span>
                    <span className="project-pill__name">{projectName}</span>
                  </div>
                  <div className="project-tabs tabs tabs--underline">
                    <button type="button" className="tab tab--md" data-active="true">Задачи</button>
                    <button type="button" className="tab tab--md">О проекте</button>
                  </div>
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

                {listsQuery.isLoading ? (
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
                                onEdit={handleEditTask}
                                onDelete={handleDeleteTask}
                                onOpen={handleOpenTask}
                                onSubtaskCreate={handleCreateBoardSubtask}
                                onSubtaskToggle={(subtaskId, status) =>
                                  updateSubtaskMutation.mutate({ subtaskId, status })
                                }
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
            </div>
            <div className="task-detail-panel surface">
              <div className="task-detail__header">
                <div className="task-detail__header-left">
                  {currentStatusAction ? (
                    <button
                      type="button"
                      className={cn(
                        'task-detail__status-action',
                        currentStatusAction.done && 'task-detail__status-action--done',
                        currentStatusAction.planned && 'task-detail__status-action--planned',
                      )}
                      onClick={handleDetailStatusClick}
                      disabled={!currentStatusAction.nextStatus || updateTaskMutation.isPending}
                    >
                      <span className="task-detail__status-dot">
                        {currentStatusAction.done ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                      </span>
                      <span>{currentStatusAction.label}</span>
                    </button>
                  ) : null}
                  <div className="stack stack-gap-xs">
                    <div className="task-detail__title">{taskQuery.data?.title ?? 'Задача'}</div>
                    {projectQuery.data ? (
                      <Link
                        to={`/project/${projectQuery.data.id}`}
                        className="text-body-sm text-(--color-text-secondary) hover:text-(--color-text-primary)"
                      >
                        {projectQuery.data.name}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <IconButton type="button" variant="outlined" size="sm" onClick={() => navigate(-1)}>
                  <CloseIcon className="h-4 w-4" />
                </IconButton>
              </div>

              {!canQueryTask || taskQuery.isError ? (
                <EmptyState
                  title="Задача не найдена"
                  description="Проверьте ссылку и попробуйте снова."
                />
              ) : taskQuery.isLoading ? (
                <div className="stack stack-gap-sm">
                  <Skeleton className="w-40" />
                  <Skeleton className="w-64" />
                  <Skeleton className="w-56" />
                </div>
              ) : (
                <div className="stack stack-gap-md">
                  <div className="task-detail__section">
                    <div className="task-detail__row">
                      <span className="task-detail__label">Сроки</span>
                      <div className="task-detail__value-row task-detail__value-row--wrap">
                        {startDateLabel ? (
                          <div className="task-detail__pill task-detail__pill--deadline">
                            <span className="task-detail__icon task-detail__icon--calendar" />
                            <span>{`Начало ${startDateLabel}`}</span>
                          </div>
                        ) : null}
                        {hasDueDate ? (
                          <div className="task-detail__pill task-detail__pill--deadline">
                            <span className="task-detail__icon task-detail__icon--calendar" />
                            <span>{`Сделать ${dueDateLabel}`}</span>
                          </div>
                        ) : null}
                        {!hasAnySchedule ? (
                          <div className="task-detail__pill task-detail__pill--muted">
                            <span>Нет</span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="task-detail__edit"
                          onClick={openScheduleModal}
                          aria-label="Изменить сроки"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="task-detail__row">
                      <span className="task-detail__label">Напоминание</span>
                      <div className="task-detail__value-row task-detail__value-row--wrap">
                        {hasReminder ? (
                          <>
                            <div className="task-detail__pill task-detail__pill--reminder">
                              <span className="task-detail__icon task-detail__icon--clock" />
                              <span>{reminderTimeLabel}</span>
                            </div>
                            {resolvedReminderRepeat !== 'none' ? (
                              <div className="task-detail__pill task-detail__pill--reminder-repeat">
                                <span className="task-detail__icon task-detail__icon--repeat">↻</span>
                                <span>{reminderRepeatText}</span>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="task-detail__pill task-detail__pill--muted">
                            <span>Нет</span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="task-detail__edit"
                          onClick={openScheduleModal}
                          aria-label="Изменить напоминание"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="task-detail__row">
                      <span className="task-detail__label">Приоритет</span>
                      <div className="task-detail__value-row">
                        {taskQuery.data ? (
                          <TaskPrioritySelect
                            value={taskQuery.data.priority}
                            onChange={handlePriorityChange}
                            disabled={updateTaskMutation.isPending}
                          />
                        ) : (
                          <span className="task-detail__value">—</span>
                        )}
                      </div>
                    </div>
                    <div className="task-detail__row">
                      <span className="task-detail__label">Проект</span>
                      <div className="task-detail__value-row">
                        <div className="task-detail__pill task-detail__pill--project">
                          <span className="task-detail__project-badge">{projectBadge}</span>
                          <span>{projectName}</span>
                        </div>
                        <button
                          type="button"
                          className="task-detail__edit"
                          onClick={openEditModal}
                          aria-label="Изменить проект"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="task-detail__row task-detail__row--top">
                      <span className="task-detail__label">Теги</span>
                      <div className="task-detail__value-row task-detail__value-row--top">
                        <div className="task-detail__tags">
                          {taskTags.length === 0 ? <span className="task-detail__value">—</span> : null}
                          {taskTags.map((tag) => (
                            <Tag key={tag.id} className="task-detail__tag">
                              {tag.name}
                            </Tag>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="task-detail__edit"
                          onClick={openEditModal}
                          aria-label="Изменить теги"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="task-detail__row task-detail__row--top">
                      <span className="task-detail__label">Описание</span>
                      <div className="task-detail__value-row task-detail__value-row--top">
                        <div className="task-detail__description">
                          {taskQuery.data?.description || 'Описание отсутствует.'}
                        </div>
                        <button
                          type="button"
                          className="task-detail__edit"
                          onClick={openEditModal}
                          aria-label="Изменить описание"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="task-detail__section">
                    <div className="task-detail__subtasks-header">
                      <span className="task-detail__subtitle">Подзадачи</span>
                      <span className="text-body-sm text-(--color-text-secondary)">
                        {completedCount}/{subtasks.length}
                      </span>
                    </div>
                    <div className="task-detail__progress">
                      <Progress value={progress} color="brand" />
                      <span className="task-detail__progress-count">{completedCount}/{subtasks.length}</span>
                    </div>

                    <div className="task-detail__subtasks-list">
                      {subtasks.length === 0 ? (
                        <div className="text-body-sm text-(--color-text-secondary)">
                          Подзадач пока нет.
                        </div>
                      ) : (
                        subtasks.map((subtask) => (
                          <div key={subtask.id} className="task-detail__subtask">
                            <label className="task-detail__subtask-label">
                              <input
                                type="checkbox"
                                className="task-detail__subtask-toggle"
                                checked={subtask.status === 'done'}
                                disabled={updateSubtaskMutation.isPending}
                                onChange={() => handleToggleSubtask(subtask)}
                              />
                              <span className={subtask.status === 'done' ? 'is-done' : undefined}>
                                {subtask.title}
                              </span>
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="link"
                              className="task-detail__subtask-delete"
                              onClick={() => handleDeleteSubtask(subtask)}
                            >
                              Удалить
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="task-detail__subtask-create">
                      {isDetailSubtaskInputOpen ? (
                        <div className="task-detail__subtask-quick">
                          <Input
                            placeholder="Задача"
                            value={newSubtaskTitle}
                            onChange={(event) => {
                              setNewSubtaskTitle(event.target.value);
                              if (subtaskError) {
                                setSubtaskError(null);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                handleAddSubtask();
                              }
                              if (event.key === 'Escape') {
                                setNewSubtaskTitle('');
                                setIsDetailSubtaskInputOpen(false);
                                setSubtaskError(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="task-detail__subtask-quick-submit"
                            onClick={handleAddSubtask}
                            disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                            aria-label="Создать подзадачу"
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                          </button>
                          {subtaskError ? (
                            <p className="text-body-sm text-[color:var(--color-danger-500)]">{subtaskError}</p>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="task-detail__subtask-trigger"
                          onClick={() => {
                            setSubtaskError(null);
                            setIsDetailSubtaskInputOpen(true);
                          }}
                          disabled={createSubtaskMutation.isPending}
                        >
                          <span>Добавить подзадачу</span>
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="task-detail__section">
                    <div className="task-detail__subtitle">Вложения</div>
                    <TaskAttachmentsWidget
                      attachments={attachments}
                      canUpload
                      isLoading={attachmentsQuery.isLoading}
                      isUploading={isUploading}
                      isDeleting={deleteAttachmentMutation.isPending}
                      error={attachmentError}
                      onUploadFiles={handleUploadFiles}
                      onDeleteAttachment={handleDeleteAttachment}
                      onDownloadAttachment={handleDownloadAttachment}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
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
      <TaskScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSubmit={handleScheduleSubmit}
        taskStatus={taskQuery.data?.status}
        initialValue={{
          dueDate: taskQuery.data?.dueDate ?? null,
          dueTime: currentTaskMeta.dueTime,
          scheduleEnabled: taskQuery.data?.status === 'planned' || Boolean(currentTaskMeta.startDate),
          startDate: currentTaskMeta.startDate,
          startTime: currentTaskMeta.startTime,
          reminderDate: taskQuery.data?.reminderDate ?? currentTaskMeta.reminderDate,
          reminderTime:
            taskQuery.data?.reminderTimeHour != null && taskQuery.data?.reminderTimeMinutes != null
              ? `${String(taskQuery.data.reminderTimeHour).padStart(2, '0')}:${String(taskQuery.data.reminderTimeMinutes).padStart(2, '0')}`
              : currentTaskMeta.reminderTime,
          reminderRepeat: taskQuery.data?.reminderRepeat ?? currentTaskMeta.reminderRepeat,
        }}
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
      <Modal
        isOpen={Boolean(takeInWorkCandidateTask)}
        onClose={() => setTakeInWorkCandidateTask(null)}
        closeOnOverlay={false}
        showClose={false}
        className="task-detail__confirm-modal"
      >
        <p className="task-detail__confirm-title">
          Хотите взять в работу
          <br />
          задачу "{takeInWorkCandidateTask?.title ?? ''}"?
        </p>
        <div className="task-detail__confirm-actions">
          <Button type="button" size="sm" onClick={handleDetailTakeInWorkConfirm}>
            Да
          </Button>
          <Button type="button" size="sm" variant="outlined" onClick={() => setTakeInWorkCandidateTask(null)}>
            Нет
          </Button>
        </div>
      </Modal>
    </>
  );
}
