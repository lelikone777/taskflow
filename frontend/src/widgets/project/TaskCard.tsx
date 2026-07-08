import { useEffect, useRef, useState } from 'react';

import { Badge, Select, Tag } from '@/shared/ui';
import { MoreVerticalIcon } from '@/shared/ui/icons';
import { formatDate } from '@/shared/lib/date';
import type { Tag as TagItem, Task, TaskPriority, TaskStatus } from '@/shared/api';

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'planned', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнена' },
];

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критичный',
};

const priorityColors: Record<TaskPriority, 'low' | 'medium' | 'high' | 'critical'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

export type TaskCardProps = {
  task: Task;
  tagLookup?: Record<number, TagItem>;
  onStatusChange?: (taskId: number, status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onOpen?: (task: Task) => void;
  disabled?: boolean;
};

export function TaskCard({
  task,
  tagLookup,
  onStatusChange,
  onEdit,
  onDelete,
  onOpen,
  disabled = false,
}: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const taskTags = task.tagIds
    .map((tagId) => tagLookup?.[tagId])
    .filter((tag): tag is TagItem => Boolean(tag));

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleClick = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [isMenuOpen]);

  const handleMenuAction = (action?: () => void) => {
    setIsMenuOpen(false);
    action?.();
  };

  return (
    <div className="surface task-card">
      <div className="task-card__header">
        <button type="button" className="task-card__title-button" onClick={() => onOpen?.(task)}>
          {task.title}
        </button>
        <div className="task-card__top-actions">
          <Select
            size="sm"
            className="task-card__status"
            value={task.status}
            onChange={(event) => onStatusChange?.(task.id, event.target.value as TaskStatus)}
            disabled={disabled}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="menu" ref={menuRef}>
            <button
              type="button"
              className="menu__button"
              aria-label="Меню задачи"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </button>
            {isMenuOpen ? (
              <div className="menu__popover">
                <button type="button" className="menu__item" onClick={() => handleMenuAction(() => onEdit?.(task))}>
                  Редактировать
                </button>
                <button type="button" className="menu__item" onClick={() => handleMenuAction(() => onOpen?.(task))}>
                  Открыть
                </button>
                <button
                  type="button"
                  className="menu__item menu__item--danger"
                  onClick={() => handleMenuAction(() => onDelete?.(task))}
                >
                  Удалить
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {task.description ? <p className="task-card__description">{task.description}</p> : null}

      <div className="task-card__meta">
        <div className="task-card__meta-item">
          <span className="task-card__meta-label">Срок</span>
          <span className="task-card__meta-value">{formatDate(task.dueDate)}</span>
        </div>
        <div className="task-card__meta-item">
          <span className="task-card__meta-label">Приоритет</span>
          <Badge size="sm" color={priorityColors[task.priority]}>
            {priorityLabels[task.priority]}
          </Badge>
        </div>
        <div className="task-card__meta-item">
          <span className="task-card__meta-label">Исполнитель</span>
          <span className="task-card__meta-value">{task.assigneeId ? `#${task.assigneeId}` : '—'}</span>
        </div>
      </div>

      {taskTags.length > 0 ? (
        <div className="task-card__tags">
          {taskTags.map((tag) => (
            <Tag key={tag.id}>{tag.name}</Tag>
          ))}
        </div>
      ) : null}
    </div>
  );
}
