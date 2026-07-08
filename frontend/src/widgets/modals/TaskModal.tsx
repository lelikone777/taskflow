import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
  mapAttachmentError,
  taskStatusOptions,
} from '@/entities/task';
import { getApiFieldValidationMessage, getApiValidationSummary } from '@/shared/lib/apiValidation';
import { formatDate } from '@/shared/lib/date';
import { Button, Checkbox, Input, Modal, Select } from '@/shared/ui';
import {
  createTag,
  deleteAttachment,
  fetchAttachments,
  invalidateAttachments,
  queryKeys,
  presignAttachment,
  uploadAttachment,
  type Attachment,
  type Tag,
  type Task,
  type TaskCreatePayload,
  type TaskPriority,
  type TaskStatus,
} from '@/shared/api';
import { TaskAttachmentsWidget } from '@/widgets/task/TaskAttachmentsWidget';
import { TaskPrioritySelect } from '@/widgets/task/TaskPrioritySelect';

const toInputDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

type TaskModalPayload = TaskCreatePayload & {
  status: TaskStatus;
  tagIds: number[];
};

export type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: TaskModalPayload) => Promise<void>;
  task?: Task | null;
  tags?: Tag[];
  projectDeadline?: string | null;
};

const mapTagError = (message: string): string => {
  if (message === 'Tag already exists') {
    return 'Тег с таким названием уже существует.';
  }
  if (message === 'Validation error') {
    return 'Проверьте название и цвет тега.';
  }
  return message;
};


const mapSubmitError = (message: string): string => {
  if (
    message.includes('Дата окончания задачи') &&
    message.includes('не может быть позже') &&
    message.includes('даты окончания проекта')
  ) {
    return 'Срок задачи не может быть позже дедлайна проекта';
  }

  return message;
};

const resolveSubmitError = (error: unknown): string => {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return mapSubmitError(detail);
    }

    if (Array.isArray(detail)) {
      const summary = getApiValidationSummary(error);
      if (summary) {
        return mapSubmitError(summary);
      }
    }

    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return mapSubmitError(message);
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return mapSubmitError(error.message);
  }

  return 'Не удалось сохранить задачу';
};

export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  tags = [],
  projectDeadline = null,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverTitleError, setServerTitleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3380f6');
  const [tagError, setTagError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const isEdit = Boolean(task);
  const projectDeadlineInput = toInputDate(projectDeadline);

  const attachmentsQuery = useQuery({
    queryKey: queryKeys.attachments.byTask(task?.id),
    queryFn: () => fetchAttachments(task!.id),
    enabled: Boolean(task?.id),
  });

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setDueDate(toInputDate(task?.dueDate));
    setPriority(task?.priority ?? 'low');
    setStatus(task?.status ?? 'planned');
    setSelectedTags(task?.tagIds ?? []);
    setTitleTouched(false);
    setDescriptionTouched(false);
    setDueDateTouched(false);
    setSubmitError(null);
    setServerTitleError(null);
    setTagError(null);
    setAttachmentError(null);
  }, [isOpen, task]);

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  const titleError =
    trimmedTitle.length === 0
      ? 'Введите название задачи'
      : trimmedTitle.length < 3
        ? 'Минимум 3 символа'
        : trimmedTitle.length > 150
          ? 'Максимум 150 символов'
          : null;

  const resolvedTitleError = titleError ?? serverTitleError;
  const descriptionError = trimmedDescription.length > 2000 ? 'Максимум 2000 символов' : null;

  const dueDateError = useMemo(() => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return 'Неверный формат даты';
    if (parsed < today) return 'Срок не может быть в прошлом';
    if (projectDeadlineInput) {
      const projectDeadlineDate = new Date(projectDeadlineInput);
      if (parsed > projectDeadlineDate) {
        return 'Срок задачи не может быть позже дедлайна проекта';
      }
    }
    return null;
  }, [dueDate, projectDeadlineInput]);

  const canSubmit = !isSubmitting && !titleError && !descriptionError && !dueDateError;

  const trimmedTagName = newTagName.trim();
  const isTagNameValid = trimmedTagName.length >= 1 && trimmedTagName.length <= 30;
  const isTagColorValid = /^#([A-Fa-f0-9]{6})$/.test(newTagColor);

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: (created) => {
      queryClient.setQueryData<Tag[]>(queryKeys.tags.all(), (prev) => {
        const existing = prev ?? [];
        if (existing.some((tag) => tag.id === created.id)) {
          return existing;
        }
        return [created, ...existing];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() });
      setSelectedTags((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      setNewTagName('');
      setTagError(null);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.message ?? 'Не удалось создать тег';
        setTagError(mapTagError(message));
      } else if (error instanceof Error) {
        setTagError(error.message);
      } else {
        setTagError('Не удалось создать тег');
      }
    },
  });

  const handleCreateTag = () => {
    setTagError(null);
    if (!isTagNameValid) {
      setTagError('Введите название тега (1–30 символов).');
      return;
    }
    if (!isTagColorValid) {
      setTagError('Выберите корректный цвет тега.');
      return;
    }
    createTagMutation.mutate({ name: trimmedTagName, color: newTagColor });
  };

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
      if (task?.id) {
        invalidateAttachments(queryClient, task.id);
      }
    },
  });

  const handleUploadFiles = async (files: File[]) => {
    setAttachmentError(null);

    if (!task?.id || files.length === 0) return;

    try {
      for (const file of files) {
        const { uploadUrl } = await presignMutation.mutateAsync({ taskId: task.id, file });
        await uploadMutation.mutateAsync({ uploadUrl, file });
      }
      invalidateAttachments(queryClient, task.id);
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

  const buildPayload = (overrideStatus?: TaskStatus): TaskModalPayload => ({
    title: trimmedTitle,
    description: trimmedDescription || undefined,
    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    priority,
    status: overrideStatus ?? status,
    tagIds: selectedTags,
  });

  const validateBeforeSubmit = () => {
    setTitleTouched(true);
    setDescriptionTouched(true);
    setDueDateTouched(true);
    return !titleError && !descriptionError && !dueDateError;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setServerTitleError(null);
    if (!validateBeforeSubmit()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload());
      onClose();
    } catch (err) {
      const titleFieldError = getApiFieldValidationMessage(err, ['name', 'title']);
      if (titleFieldError) {
        setTitleTouched(true);
        setServerTitleError(titleFieldError);
      } else {
        setSubmitError(resolveSubmitError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDone = async () => {
    setSubmitError(null);
    setServerTitleError(null);
    if (!validateBeforeSubmit()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload('done'));
      onClose();
    } catch (err) {
      const titleFieldError = getApiFieldValidationMessage(err, ['name', 'title']);
      if (titleFieldError) {
        setTitleTouched(true);
        setServerTitleError(titleFieldError);
      } else {
        setSubmitError(resolveSubmitError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const attachments = attachmentsQuery.data ?? [];
  const canUpload = Boolean(task?.id);
  const isUploading = presignMutation.isPending || uploadMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Редактировать задачу' : 'Создать задачу'}
      size="lg"
      className="task-modal"
      footer={
        <>
          <Button type="submit" size="sm" disabled={!canSubmit} form="task-form">
            Сохранить
          </Button>
          {isEdit && status !== 'done' ? (
            <Button type="button" size="sm" variant="outlined" onClick={handleMarkDone}>
              Отметить выполненной
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outlined" onClick={onClose}>
            Закрыть
          </Button>
        </>
      }
    >
      <form id="task-form" className="stack stack-gap-sm" onSubmit={handleSubmit}>
        <label className="text-body-sm text-[color:var(--color-text-secondary)]">
          Название <span className="text-[color:var(--color-danger-500)]">*</span>
        </label>
        <Input
          placeholder="Название задачи"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (serverTitleError) {
              setServerTitleError(null);
            }
            if (submitError) {
              setSubmitError(null);
            }
          }}
          onBlur={() => setTitleTouched(true)}
          hasError={titleTouched && Boolean(resolvedTitleError)}
        />
        {titleTouched && resolvedTitleError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{resolvedTitleError}</p>
        ) : null}

        <label className="text-body-sm text-[color:var(--color-text-secondary)]">Описание</label>
        <Input
          placeholder="Описание задачи"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => setDescriptionTouched(true)}
          hasError={descriptionTouched && Boolean(descriptionError)}
        />
        {descriptionTouched && descriptionError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{descriptionError}</p>
        ) : null}

        <label className="text-body-sm text-[color:var(--color-text-secondary)]">Срок</label>
        <Input
          type="date"
          value={dueDate}
          max={projectDeadlineInput || undefined}
          onChange={(event) => setDueDate(event.target.value)}
          onBlur={() => setDueDateTouched(true)}
          hasError={dueDateTouched && Boolean(dueDateError)}
        />
        {dueDateTouched && dueDateError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{dueDateError}</p>
        ) : null}
        {!dueDateError && projectDeadlineInput ? (
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">
            Дедлайн проекта: {formatDate(projectDeadlineInput)}
          </p>
        ) : null}

        <label className="text-body-sm text-[color:var(--color-text-secondary)]">Приоритет</label>
        <TaskPrioritySelect
          value={priority}
          onChange={(value) => setPriority(value)}
          className="task-priority-select--field"
        />

        <label className="text-body-sm text-[color:var(--color-text-secondary)]">Статус</label>
        <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div className="stack stack-gap-xs">
          <label className="text-body-sm text-[color:var(--color-text-secondary)]">Теги</label>
          {tags.length === 0 ? (
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">Теги пока не созданы.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <Checkbox
                  key={tag.id}
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => {
                    setSelectedTags((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id],
                    );
                  }}
                  label={tag.name}
                />
              ))}
            </div>
          )}

          <div className="task-tag-create">
            <Input
              placeholder="Новый тег"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
            />
            <input
              type="color"
              className="task-tag-create__color"
              value={newTagColor}
              onChange={(event) => setNewTagColor(event.target.value)}
              aria-label="Цвет тега"
            />
            <Button
              type="button"
              size="sm"
              variant="outlined"
              onClick={handleCreateTag}
              disabled={!isTagNameValid || !isTagColorValid || createTagMutation.isPending}
            >
              Добавить тег
            </Button>
          </div>
          {tagError ? (
            <p className="text-body-sm text-[color:var(--color-danger-500)]">{tagError}</p>
          ) : null}
        </div>

        <div className="stack stack-gap-xs">
          <label className="text-body-sm text-[color:var(--color-text-secondary)]">Вложения</label>
          <TaskAttachmentsWidget
            attachments={attachments}
            canUpload={canUpload}
            isLoading={attachmentsQuery.isLoading}
            isUploading={isUploading}
            isDeleting={deleteAttachmentMutation.isPending}
            error={attachmentError}
            onUploadFiles={handleUploadFiles}
            onDeleteAttachment={handleDeleteAttachment}
            onDownloadAttachment={handleDownloadAttachment}
          />
        </div>

        {submitError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{submitError}</p>
        ) : null}
      </form>
    </Modal>
  );
}
