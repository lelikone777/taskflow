import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { createProject, updateProject } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { Button, Input, Modal } from '@/shared/ui';
import { ChevronDownIcon, EditIcon, PlusIcon, SelectedIcon } from '@/shared/ui/icons';

export type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

type CreateStatus = 'in_progress' | 'done' | 'on_pause';

const createStatusOptions: Array<{ value: CreateStatus; label: string }> = [
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Завершен' },
  { value: 'on_pause', label: 'Приостановлен' },
];

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  const element = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof element.showPicker === 'function') {
    element.showPicker();
    return;
  }
  element.focus();
  element.click();
}

function getTodayLocalISODate(): string {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function extractApiErrorMessage(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) {
    return null;
  }

  const maybeResponse = (err as { response?: { data?: unknown } }).response;
  const data = maybeResponse?.data;
  if (!data || typeof data !== 'object') {
    return null;
  }

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === 'string') {
      return first.msg;
    }
  }

  return null;
}

export function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<CreateStatus>('in_progress');
  const [nameTouched, setNameTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const deadlineRef = useRef<HTMLInputElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const todayIso = getTodayLocalISODate();

  const nameError =
    trimmedName.length === 0
      ? 'Введите название проекта'
      : trimmedName.length < 3
        ? 'Минимум 3 символа'
        : trimmedName.length > 100
          ? 'Максимум 100 символов'
          : null;
  const descriptionError = trimmedDescription.length > 1000 ? 'Максимум 1000 символов' : null;
  const deadlineError = deadline.trim().length === 0 ? 'Укажите дату окончания проекта' : null;

  const deadlinePastError = deadline.trim().length > 0 && deadline < todayIso;
  const canSubmit =
    !isSubmitting &&
    !nameError &&
    !descriptionError &&
    !deadlineError &&
    !deadlinePastError;
  const currentStatusLabel =
    createStatusOptions.find((item) => item.value === status)?.label ?? 'В работе';

  useEffect(() => {
    if (!isStatusOpen) {
      return;
    }

    const handleClickOutside = (event: PointerEvent) => {
      if (statusRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsStatusOpen(false);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isStatusOpen]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setDeadline('');
    setStatus('in_progress');
    setNameTouched(false);
    setDescriptionTouched(false);
    setDeadlineTouched(false);
    setSubmitError(null);
    setIsStatusOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNameTouched(true);
    setDescriptionTouched(true);
    setDeadlineTouched(true);
    setSubmitError(null);

    if (nameError || descriptionError || deadlineError || deadlinePastError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const createdProject = await createProject({
        name: trimmedName,
        description: trimmedDescription || undefined,
        deadline,
      });

      if (status !== 'in_progress') {
        await updateProject(createdProject.id, { status });
      }

      resetForm();
      onCreated?.();
      onClose();
    } catch (err) {
      const apiMessage = extractApiErrorMessage(err);
      if (apiMessage) {
        setSubmitError(apiMessage);
        return;
      }
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Не удалось создать проект');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="project-form-modal"
      title={
        <>
          <Input
            className="project-form__name"
            form='create-project-form'
            placeholder="Введите название"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setNameTouched(true)}
            hasError={nameTouched && Boolean(nameError)}
          />
          {nameTouched && nameError ? (
            <p className="text-body-sm text-[color:var(--color-danger-500)]">{nameError}</p>
          ) : null}

        </>
      }
      footer={
        <>
          <Button
            type="submit"
            size="md"
            disabled={!canSubmit}
            form="create-project-form"
            className="project-form-modal__submit"
          >
            Создать проект
          </Button>
          <Button
            type="button"
            size="md"
            variant="outlined"
            onClick={handleClose}
            className="project-form-modal__cancel"
          >
            Отмена
          </Button>
        </>
      }
    >
      <form id="create-project-form" className="project-form" onSubmit={handleSubmit}>
        <textarea
          className="project-form__description"
          placeholder="Описание проекта"
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, 1000))}
          onBlur={() => setDescriptionTouched(true)}
        />
        {descriptionTouched && descriptionError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{descriptionError}</p>
        ) : null}

        <div className="project-form__fields">
          <div className="project-form__field-row">
            <span className="project-form__field-label">Статус</span>
            <div className="project-form__field-dropdown" ref={statusRef}>
              <button
                type="button"
                className="project-form__field-control project-form__field-control--menu"
                aria-label="Статус проекта"
                aria-expanded={isStatusOpen}
                onClick={() => setIsStatusOpen((prev) => !prev)}
              >
                <span>{currentStatusLabel}</span>
                <ChevronDownIcon className={cn('h-6 w-6 transition-transform', isStatusOpen && 'rotate-180')} />
              </button>
              {isStatusOpen ? (
                <div className="menu__popover project-form__field-popover">
                  {createStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'menu__item project-form__field-item',
                        status === option.value && 'project-form__field-item--active',
                      )}
                      onClick={() => {
                        setStatus(option.value);
                        setIsStatusOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {status === option.value ? (
                        <SelectedIcon className="project-form__selected-icon" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="project-form__field-row">
            <span className="project-form__field-label">Дедлайн</span>
            <div className='project-form__field-group'>
              <button
                type="button"
                className={cn(
                  'project-form__field-control project-form__field-control--button',
                )}
                onClick={() => openDatePicker(deadlineRef.current)}
              >
                <span className={cn('project-form__field-value', deadline && 'project-form__field-value--filled')}>
                  {deadline ? <>Сделать <span className='project-form__field-value-date'>{formatDateLabel(deadline)}</span></> : 'Поставить'}
                </span>
                {!deadline && <PlusIcon className="h-6 w-6" />}
              </button>
              {deadline && <EditIcon className='h-6 w-6 flex-none' />}
            </div>
            <input
              ref={deadlineRef}
              className="project-form__date-input-hidden"
              type="date"
              value={deadline}
              min={todayIso}
              onChange={(event) => setDeadline(event.target.value)}
              onBlur={() => setDeadlineTouched(true)}
              aria-label="Дата окончания проекта"
              tabIndex={-1}
            />
          </div>
        </div>

        {deadlineTouched && deadlineError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{deadlineError}</p>
        ) : null}
        {deadlineTouched && !deadlineError && deadlinePastError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">
            Дата окончания не может быть в прошлом
          </p>
        ) : null}
        {submitError ? (
          <p className="text-body-sm text-[color:var(--color-danger-500)]">{submitError}</p>
        ) : null}
      </form>
    </Modal>
  );
}
