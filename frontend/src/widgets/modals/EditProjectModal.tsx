import { useEffect, useRef, useState, type FormEvent } from 'react';

import { updateProject, type Project } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { Button, Input, Modal } from '@/shared/ui';
import { ChevronDownIcon, EditIcon, PlusIcon, SelectedIcon } from '@/shared/ui/icons';

export type EditProjectModalProps = {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onUpdated?: () => void;
};

type EditableProjectStatus = 'in_progress' | 'done' | 'on_pause';

const statusOptions: Array<{ value: EditableProjectStatus; label: string }> = [
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Завершен' },
  { value: 'on_pause', label: 'Приостановлен' },
];

function toEditableStatus(status: Project['status']): EditableProjectStatus {
  if (status === 'done') {
    return 'done';
  }
  if (status === 'on_pause') {
    return 'on_pause';
  }
  return 'in_progress';
}

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

export function EditProjectModal({ isOpen, project, onClose, onUpdated }: EditProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<EditableProjectStatus>('in_progress');
  const [nameTouched, setNameTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  const [statusTouched, setStatusTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const deadlineRef = useRef<HTMLInputElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !project) return;
    setName(project.name ?? '');
    setDescription(project.description ?? '');
    setStartAt(project.startAt ? project.startAt.slice(0, 10) : '');
    setDeadline(project.deadline ? project.deadline.slice(0, 10) : '');
    setStatus(toEditableStatus(project.status));
    setNameTouched(false);
    setDescriptionTouched(false);
    setDeadlineTouched(false);
    setStatusTouched(false);
    setSubmitError(null);
    setIsStatusOpen(false);
  }, [isOpen, project]);

  useEffect(() => {
    if (!isStatusOpen) {
      return undefined;
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

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

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
  const dateRangeError =
    startAt && deadline && new Date(startAt).getTime() > new Date(deadline).getTime()
      ? 'Дата окончания должна быть не раньше даты начала'
      : null;

  const canSubmit =
    !isSubmitting && !nameError && !descriptionError && !deadlineError && !dateRangeError && Boolean(project);
  const currentStatusLabel = statusOptions.find((option) => option.value === status)?.label ?? 'В работе';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;
    setNameTouched(true);
    setDescriptionTouched(true);
    setDeadlineTouched(true);
    setSubmitError(null);

    if (nameError || descriptionError || deadlineError || dateRangeError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProject(project.id, {
        name: trimmedName,
        description: trimmedDescription || undefined,
        startAt: startAt || undefined,
        deadline,
        ...(statusTouched ? { status } : {}),
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Не удалось обновить проект');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="project-form-modal"
      title={
        <>
          <Input
            className="project-form__name"
            form='edit-project-form'
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
          <Button type="submit" size="md" disabled={!canSubmit} form="edit-project-form" className="project-form-modal__submit">
            Сохранить
          </Button>
          <Button type="button" size="md" variant="outlined" onClick={onClose} className="project-form-modal__cancel">
            Отмена
          </Button>
        </>
      }
    >
      <form id="edit-project-form" className="project-form" onSubmit={handleSubmit}>
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
          <div className='project-form__field-row'>
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
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        'menu__item project-form__field-item',
                        status === option.value && 'project-form__field-item--active',
                      )}
                      onClick={() => {
                        setStatus(option.value);
                        setStatusTouched(true);
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
              onChange={(event) => setDeadline(event.target.value)}
              onBlur={() => setDeadlineTouched(true)}
              aria-label="Дата окончания проекта"
              tabIndex={-1}
            />
          </div>
          <div className="project-form__field-row">
            <span className="project-form__field-label">Кол-во задач</span>
            <span className='project-form__field-control project-form__field-control--value'>{`${project.tasksCountDone ?? 0}/${project.tasksCountAll ?? 0}`}</span>
          </div>
        </div>
        {
          deadlineTouched && deadlineError ? (
            <p className="text-body-sm text-[color:var(--color-danger-500)]">{deadlineError}</p>
          ) : null
        }
        {
          dateRangeError ? (
            <p className="text-body-sm text-[color:var(--color-danger-500)]">{dateRangeError}</p>
          ) : null
        }
        {
          submitError ? (
            <p className="text-body-sm text-[color:var(--color-danger-500)]">{submitError}</p>
          ) : null
        }
      </form >
    </Modal >
  );
}
