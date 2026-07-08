import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
  getTaskStatusAction,
  mapAttachmentError,
} from '@/entities/task';
import {
  createSubtask,
  deleteAttachment,
  deleteSubtask,
  fetchAttachments,
  fetchProject,
  fetchSubtasks,
  fetchTags,
  fetchTask,
  invalidateAttachments,
  invalidateSubtasks,
  invalidateTask,
  invalidateTaskRelations,
  queryKeys,
  presignAttachment,
  updateSubtask,
  updateTask,
  upsertTaskReminder,
  uploadAttachment,
  type Attachment,
  type Subtask,
  type SubtaskStatus,
  type Tag,
  type Task,
  type TaskStatus,
} from '@/shared/api';
import { getApiFieldValidationMessage, getApiValidationSummary } from '@/shared/lib/apiValidation';
import { cn } from '@/shared/lib/cn';
import { getTaskDisplayStatus } from '@/shared/lib/taskBoard';
import {
  formatTaskDateTimeLabel,
  getDefaultTaskMeta,
  getTaskMeta,
  reminderRepeatLabel,
  setTaskMeta,
  toDateInputValue,
  type TaskReminderRepeat,
} from '@/shared/lib/taskMeta';
import { Button, EmptyState, IconButton, Input, Modal, Progress, Skeleton, Tag as TagChip } from '@/shared/ui';
import { CheckIcon, ChevronRightIcon, CloseIcon, PlusIcon, SettingsIcon } from '@/shared/ui/icons';
import { TaskModal, TaskScheduleModal } from '@/widgets/modals';
import { TaskAttachmentsWidget } from './TaskAttachmentsWidget';
import { TaskPrioritySelect } from './TaskPrioritySelect';
import { toast } from 'sonner';

type TaskDetailDrawerProps = {
  taskId: number | null;
  onClose: () => void;
};

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [takeInWorkCandidateTask, setTakeInWorkCandidateTask] = useState<Task | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSubtaskInputOpen, setIsSubtaskInputOpen] = useState(false);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setShowModal(false);
    setScheduleModalOpen(false);
    setTakeInWorkCandidateTask(null);
    setNewSubtaskTitle('');
    setSubtaskError(null);
    setAttachmentError(null);
  }, [isClosing]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const canQueryTask = Boolean(taskId && taskId > 0);

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => fetchTask(taskId!),
    enabled: canQueryTask,
  });

  const projectId = taskQuery.data?.projectId;
  const projectQuery = useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => fetchProject(projectId!),
    enabled: Boolean(projectId),
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.all(),
    queryFn: () => fetchTags(),
  });

  const attachmentsQuery = useQuery({
    queryKey: queryKeys.attachments.byTask(taskId),
    queryFn: () => fetchAttachments(taskId!),
    enabled: canQueryTask,
  });

  const subtasksQuery = useQuery({
    queryKey: queryKeys.subtasks.byTask(taskId),
    queryFn: () => fetchSubtasks(taskId!),
    enabled: canQueryTask,
  });

  const tagLookup = useMemo(() => {
    const entries = (tagsQuery.data ?? []).map((tag) => [tag.id, tag]);
    return Object.fromEntries(entries) as Record<number, Tag>;
  }, [tagsQuery.data]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: Parameters<typeof updateTask>[1] }) =>
      updateTask(taskId, payload),
    onSuccess: (_, variables) => {
      invalidateTaskRelations(queryClient, {
        taskId: variables.taskId,
        projectId,
      });
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (payload: { taskId: number; title: string }) =>
      createSubtask(payload.taskId, { title: payload.title }),
    onSuccess: () => {
      invalidateSubtasks(queryClient, taskId);
      setNewSubtaskTitle('');
      setSubtaskError(null);
      setIsSubtaskInputOpen(false);
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
    onSuccess: () => {
      invalidateSubtasks(queryClient, taskId);
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: number) => deleteSubtask(subtaskId),
    onSuccess: () => {
      invalidateSubtasks(queryClient, taskId);
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
      invalidateAttachments(queryClient, taskId);
    },
  });

  const handleTaskSubmit = async (payload: Parameters<typeof updateTask>[1] & { tagIds: number[] }) => {
    if (!taskId) {
      throw new Error('Задача не найдена');
    }
    await updateTaskMutation.mutateAsync({ taskId, payload });
    invalidateTask(queryClient, taskId);
  };

  const openEditModal = () => {
    setShowModal(true);
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

  const handleAddSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title || !taskId) return;
    setSubtaskError(null);
    createSubtaskMutation.mutate({ taskId, title });
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

    if (!taskId || files.length === 0) return;

    try {
      for (const file of files) {
        const { uploadUrl } = await presignMutation.mutateAsync({ taskId, file });
        await uploadMutation.mutateAsync({ uploadUrl, file });
      }
      invalidateAttachments(queryClient, taskId);
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
    .filter(Boolean) as Tag[];

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

  if (!taskId) {
    return null;
  }

  const handleAnimationEnd = () => {
    if (!isClosing) return;
    setIsClosing(false);
    onClose();
  };

  const handleTaskStatusChange = async (nextStatus: TaskStatus) => {
    if (!taskQuery.data || updateTaskMutation.isPending) {
      return;
    }

    try {
      if (nextStatus === 'done') {
        const undoneSubtasks = subtasks.filter((subtask) => subtask.status !== 'done');
        if (undoneSubtasks.length > 0) {
          await Promise.all(
            undoneSubtasks.map((subtask) =>
              updateSubtaskMutation.mutateAsync({ subtaskId: subtask.id, status: 'done' }),
            ),
          );
        }
      }

      await updateTaskMutation.mutateAsync({
        taskId: taskQuery.data.id,
        payload: { status: nextStatus },
      });

      if (taskQuery.data.status === 'planned' && nextStatus === 'in_progress') {
        const meta = getTaskMeta(taskQuery.data.id);
        const repeat =
          taskQuery.data.reminderRepeat && taskQuery.data.reminderRepeat !== 'none'
            ? taskQuery.data.reminderRepeat
            : meta.reminderRepeat;
        const reminderTime =
          taskQuery.data.reminderTimeHour != null && taskQuery.data.reminderTimeMinutes != null
            ? `${String(taskQuery.data.reminderTimeHour).padStart(2, '0')}:${String(taskQuery.data.reminderTimeMinutes).padStart(2, '0')}`
            : meta.reminderTime;
        const reminderDate = meta.reminderDate ?? meta.startDate ?? toDateInputValue(taskQuery.data.reminderDate ?? taskQuery.data.dueDate ?? null);

        if (repeat !== 'none' && reminderTime && reminderDate) {
          const [hourRaw, minutesRaw] = reminderTime.split(':');
          const hour = Number(hourRaw);
          const minutes = Number(minutesRaw);
          if (Number.isInteger(hour) && Number.isInteger(minutes)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayDate = today.toISOString().slice(0, 10);
            await upsertTaskReminder(taskQuery.data.id, {
              date: reminderDate < todayDate ? todayDate : reminderDate,
              hour,
              minutes,
              repeat,
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const handleDetailStatusClick = () => {
    if (!taskQuery.data || !currentStatusAction?.nextStatus) {
      return;
    }

    if (currentStatusAction.planned && currentStatusAction.nextStatus === 'in_progress') {
      requestTakeInWork(taskQuery.data);
      return;
    }

    void handleTaskStatusChange(currentStatusAction.nextStatus);
  };

  const handleDetailTakeInWorkConfirm = () => {
    if (!takeInWorkCandidateTask) {
      return;
    }
    setTakeInWorkCandidateTask(null);
    void handleTaskStatusChange('in_progress');
  };

  return (
    <div className="task-drawer" data-open="true" data-closing={isClosing}>
      <button type="button" className="task-drawer__backdrop" onClick={handleClose} aria-label="Закрыть задачу" />
      <aside className="task-drawer__panel task-detail-panel" onAnimationEnd={handleAnimationEnd}>
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
          <IconButton type="button" variant="outlined" size="sm" onClick={handleClose}>
            <CloseIcon className="h-4 w-4" />
          </IconButton>
        </div>

        {!canQueryTask || taskQuery.isError ? (
          <EmptyState title="Задача не найдена" description="Проверьте ссылку и попробуйте снова." />
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
                      <TagChip key={tag.id} className="task-detail__tag">
                        {tag.name}
                      </TagChip>
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
                {isSubtaskInputOpen ? (
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
                          setIsSubtaskInputOpen(false);
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
                      setIsSubtaskInputOpen(true);
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
      </aside>
      <TaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleTaskSubmit}
        task={taskQuery.data}
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
    </div>
  );
}
