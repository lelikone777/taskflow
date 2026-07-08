import { useCallback, useMemo, useState, type DragEvent as ReactDragEvent } from 'react';

import type { Attachment, Subtask, SubtaskStatus, Tag as TagItem, Task, TaskStatus } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { getTaskMeta } from '@/shared/lib/taskMeta';
import { Button, Modal, Tag } from '@/shared/ui';
import { getTaskDisplayStatus, isTaskOverdue } from '@/shared/lib/taskBoard';
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PaperclipIcon,
  PlusIcon,
} from '@/shared/ui/icons';
import { TaskBoardCardActionsMenu } from './TaskBoardActionsMenu';
import { DotIcon } from '@/shared/ui/icons/checkGroup/DotIcon';
import { CheckIcon } from '@/shared/ui/icons/checkGroup/CheckIcon';
import { CheckIconFilled } from '@/shared/ui/icons/checkGroup/CheckIconFilled';


export type TaskBoardCardProps = {
  task: Task;
  columnArchived?: boolean;
  tagLookup?: Record<number, TagItem>;
  onStatusChange?: (taskId: number, status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onOpen?: (task: Task) => void;
  attachments?: Attachment[];
  subtasks?: Subtask[];
  onSubtaskToggle?: (subtaskId: number, status: SubtaskStatus) => void;
  onSubtaskCreate?: (taskId: number, title: string) => void;
  subtasksDisabled?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (task: Task, event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd?: (task: Task, event: ReactDragEvent<HTMLDivElement>) => void;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hasTimePart = (date: Date): boolean => {
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
};

const formatShortDate = (value?: string | null): string => {
  const date = parseDate(value);
  if (!date) return '—';

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatTaskMoment = (value: string | null | undefined, connector: 'до' | 'в'): string => {
  const date = parseDate(value);
  if (!date) return '—';

  const dateLabel = formatShortDate(value);
  if (!hasTimePart(date)) {
    return dateLabel;
  }

  return `${dateLabel} ${connector} ${formatTime(date)}`;
};

const formatDateWithOptionalTime = (
  value: string | null | undefined,
  connector: 'до' | 'в',
  timeValue?: string | null,
): string => {
  if (timeValue && /^\d{2}:\d{2}$/.test(timeValue)) {
    const date = parseDate(value);
    if (!date) return '—';
    return `${formatShortDate(value)} ${connector} ${timeValue}`;
  }

  return formatTaskMoment(value, connector);
};

const buildTimelineLabel = (
  task: Task,
  status: TaskStatus,
  taskMeta: ReturnType<typeof getTaskMeta>,
): string | null => {
  const startDateValue = taskMeta.startDate ?? task.dueDate ?? null;

  if (status === 'planned') {
    if (!startDateValue) return null;
    const startTimeValue = taskMeta.startTime ?? taskMeta.dueTime;
    return `Начало ${formatDateWithOptionalTime(startDateValue, 'в', startTimeValue)}`;
  }

  if (status === 'done') {
    const completionDate = task.completedAt ?? task.dueDate;
    if (!completionDate) return null;
    return `Сделано ${formatTaskMoment(completionDate, 'до')}`;
  }

  if (!task.dueDate) return null;
  return `Сделать ${formatDateWithOptionalTime(task.dueDate, 'до', taskMeta.dueTime)}`;
};

type TaskStatusAction = {
  label: string;
  nextStatus: TaskStatus | null;
  done: boolean;
  planned: boolean;
};

const getTaskStatusAction = (status: TaskStatus): TaskStatusAction => {
  if (status === 'planned') {
    return { label: 'Взять в работу', nextStatus: 'in_progress', done: false, planned: true };
  }

  if (status === 'done') {
    return { label: 'Сделано', nextStatus: null, done: true, planned: false };
  }

  return { label: 'Выполнить', nextStatus: 'done', done: false, planned: false };
};

export function TaskBoardCard({
  task,
  columnArchived = false,
  tagLookup,
  onStatusChange,
  onEdit,
  onDelete,
  onOpen,
  attachments = [],
  subtasks = [],
  onSubtaskToggle,
  onSubtaskCreate,
  subtasksDisabled = false,
  disabled = false,
  draggable = false,
  dragging = false,
  onDragStart,
  onDragEnd,
}: TaskBoardCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTakeInWorkConfirmOpen, setIsTakeInWorkConfirmOpen] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [isSubtaskCreateOpen, setIsSubtaskCreateOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const taskTags = useMemo(
    () =>
      task.tagIds
        .map((tagId) => tagLookup?.[tagId])
        .filter((tag): tag is TagItem => Boolean(tag)),
    [task.tagIds, tagLookup],
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);
  
  const displayStatus = useMemo(() => getTaskDisplayStatus(task), [task]);
  const statusAction = useMemo(() => getTaskStatusAction(displayStatus), [displayStatus]);
  const isOverdue = useMemo(() => isTaskOverdue(task), [task]);
  const statusDisabled = disabled || statusAction.nextStatus === null;
  const subtaskToggleDisabled = subtasksDisabled || statusAction.planned;
  const taskMeta = useMemo(() => getTaskMeta(task.id), [task.id]);
  const timelineLabel = useMemo(() => buildTimelineLabel(task, displayStatus, taskMeta), [task, displayStatus, taskMeta]);
  const displayDate = useMemo(() => formatShortDate(task.createdAt), [task.createdAt]);

  const hasSubtasks = subtasks.length > 0;
  const doneSubtasksCount = useMemo(
    () => subtasks.filter((subtask) => subtask.status === 'done').length,
    [subtasks],
  );

  const handleStatusClick = () => {
    if (!statusAction.nextStatus) return;
    if (statusAction.planned && statusAction.nextStatus === 'in_progress') {
      setIsTakeInWorkConfirmOpen(true);
      return;
    }
    onStatusChange?.(task.id, statusAction.nextStatus);
  };

  const handleTakeInWorkConfirmed = () => {
    setIsTakeInWorkConfirmOpen(false);
    onStatusChange?.(task.id, 'in_progress');
  };

  const handleCreateSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title || !onSubtaskCreate || subtasksDisabled) return;
    onSubtaskCreate(task.id, title);
    setNewSubtaskTitle('');
    setIsSubtaskCreateOpen(false);
  };

  const handleOpenSubtaskCreate = () => {
    if (subtasksDisabled) return;
    setIsSubtaskCreateOpen(true);
    if (hasSubtasks) {
      setIsSubtasksOpen(true);
    }
  };

  const handleToggleSubtask = (subtask: Subtask) => {
    if (!onSubtaskToggle || subtaskToggleDisabled) return;
    if (statusAction.planned) {
      setIsTakeInWorkConfirmOpen(true);
      return;
    }
    const nextSubtaskStatus: SubtaskStatus = subtask.status === 'done' ? 'todo' : 'done';
    onSubtaskToggle(subtask.id, nextSubtaskStatus);
  };

  return (
    <div
      className={cn(
        'surface task-board-card',
        `task-board-card--priority-${task.priority}`,
        statusAction.done && 'task-board-card--done',
        columnArchived && 'task-board-card--column-archived',
        isOverdue && 'task-board-card--overdue',
        draggable && 'task-board-card--draggable',
        dragging && 'task-board-card--dragging',
      )}
      draggable={draggable && !disabled}
      onDragStart={(event) => onDragStart?.(task, event)}
      onDragEnd={(event) => onDragEnd?.(task, event)}
    >
      <div className="task-board-card__header">
        <button type="button" className="task-board-card__title text-task-title truncate" onClick={() => onOpen?.(task)}>
          {task.title}
        </button>

        <TaskBoardCardActionsMenu
          task={task}
          isOpen={isMenuOpen}
          statusAction={statusAction}
          onToggle={toggleMenu}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpen={onOpen}
          onRestore={() => onStatusChange?.(task.id, 'in_progress')}
        />
      </div>

      <div className="task-board-card__meta">
        <button
          type="button"
          className={cn(
            'task-board-card__status',
            statusAction.planned && 'task-board-card__status--planned',
            statusAction.done && 'task-board-card__status--done',
            'text-body-sm',
          )}
          onClick={handleStatusClick}
          disabled={statusDisabled}
        >
          <div className="task-board-card__status-icon-container">
            {statusAction.done ? (
              <CheckIcon className="task-board-card__status-icon task-board-card__status-icon--done" />
            ) : (
              <>
                <DotIcon className="task-board-card__status-icon task-board-card__status-icon--default" />
                <CheckIcon className="task-board-card__status-icon task-board-card__status-icon--hover" />
                <CheckIconFilled className="task-board-card__status-icon task-board-card__status-icon--active" />
              </>
            )}
          </div>

          <span>{statusAction.label}</span>
        </button>
        <span className={cn('task-board-card__date text-body-sm')}>
          {displayDate}
        </span>
      </div>

      {timelineLabel ? (
        <div className="task-board-card__range text-body-sm">
          <div className="task-board-card__range-info">
            <CalendarIcon className={cn("task-board-card__calendar",
              statusAction.done ? "task-board-card__graphic-element--status-done" : "task-board-card__graphic-element--status-active"
            )} />
            <span className={cn(isOverdue && !statusAction.done && 'task-board-card__deadline--overdue')}>{timelineLabel}</span>
          </div>

          {attachments.length > 0 ? <PaperclipIcon className={cn("task-board-card__attachments",
            statusAction.done ? "task-board-card__graphic-element--status-done" : "task-board-card__graphic-element--status-active"
          )} /> : null}
        </div>
      ) : (
        <div className="task-board-card__range text-body-sm flex-row-reverse">
          <div className="task-board-card__range-info">
            {attachments.length > 0 ? <PaperclipIcon className={cn("task-board-card__attachments",
              statusAction.done ? "task-board-card__graphic-element--status-done" : "task-board-card__graphic-element--status-active"
            )} /> : null}
          </div>
        </div>
      )}

      {taskTags.length > 0 ? (
        <div className="task-board-card__tags text-tag">
          {taskTags.map((tag) => (
            <Tag key={tag.id} className="task-board-card__tag" style={{ backgroundColor: tag.color }}>
              {tag.name}
            </Tag>
          ))}
        </div>
      ) : null}

      <div className="task-board-card__subtasks">
        {hasSubtasks ? (
          <>
            <button
              type="button"
              className="task-board-card__subtask"
              onClick={() => setIsSubtasksOpen((prev) => !prev)}
            >
              <span>{`Подзадачи ${doneSubtasksCount}/${subtasks.length}`}</span>
              {isSubtasksOpen ? (
                <ChevronDownIcon className="h-4 w-4 task-board-card__subtask-icon" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 task-board-card__subtask-icon" />
              )}
            </button>

            {isSubtasksOpen ? (
              <div className="task-board-card__subtasks-content">
                <div className="task-board-card__subtasks-list">
                  {subtasks.map((subtask) => (
                    <button
                      key={subtask.id}
                      type="button"
                      className={cn(
                        'task-board-card__subtask-item',
                        subtask.status === 'done' && 'task-board-card__subtask-item--done',
                      )}
                      onClick={() => handleToggleSubtask(subtask)}
                      disabled={subtaskToggleDisabled}
                    >
                      <span
                        className={cn(
                          'task-board-card__subtask-check',
                          subtask.status === 'done' && 'task-board-card__subtask-check--done',
                        )}
                      >
                        {subtask.status === 'done' ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                      </span>
                      <span className="task-board-card__subtask-text">{subtask.title}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="task-board-card__subtask-link"
                  onClick={handleOpenSubtaskCreate}
                  disabled={subtasksDisabled}
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Добавить</span>
                </button>

                {isSubtaskCreateOpen ? (
                  <div className="task-board-card__subtask-quick">
                    <input
                      type="text"
                      className="task-board-card__subtask-quick-input"
                      placeholder="Задача"
                      value={newSubtaskTitle}
                      onChange={(event) => setNewSubtaskTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleCreateSubtask();
                        }
                        if (event.key === 'Escape') {
                          setIsSubtaskCreateOpen(false);
                          setNewSubtaskTitle('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="task-board-card__subtask-quick-submit"
                      onClick={handleCreateSubtask}
                      disabled={!newSubtaskTitle.trim() || subtasksDisabled}
                      aria-label="Создать подзадачу"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : isSubtaskCreateOpen ? (
          <div className="task-board-card__subtask-quick">
            <input
              type="text"
              className="task-board-card__subtask-quick-input"
              placeholder="Задача"
              value={newSubtaskTitle}
              onChange={(event) => setNewSubtaskTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCreateSubtask();
                }
                if (event.key === 'Escape') {
                  setIsSubtaskCreateOpen(false);
                  setNewSubtaskTitle('');
                }
              }}
            />
            <button
              type="button"
              className="task-board-card__subtask-quick-submit"
              onClick={handleCreateSubtask}
              disabled={!newSubtaskTitle.trim() || subtasksDisabled}
              aria-label="Создать подзадачу"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="task-board-card__subtask-action text-h4"
            onClick={handleOpenSubtaskCreate}
            disabled={subtasksDisabled}
          >
            <span>Добавить подзадачу</span>
            <PlusIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <Modal
        isOpen={isTakeInWorkConfirmOpen}
        onClose={() => setIsTakeInWorkConfirmOpen(false)}
        closeOnOverlay={false}
        showClose={false}
        className="task-board-card__confirm-modal"
      >
        <p className="task-board-card__confirm-title">
          Хотите взять в работу
          <br />
          задачу "{task.title}"?
        </p>
        <div className="task-board-card__confirm-actions">
          <Button type="button" size="sm" onClick={handleTakeInWorkConfirmed}>
            Да
          </Button>
          <Button type="button" size="sm" variant="outlined" onClick={() => setIsTakeInWorkConfirmOpen(false)}>
            Нет
          </Button>
        </div>
      </Modal>
    </div>
  );
}
