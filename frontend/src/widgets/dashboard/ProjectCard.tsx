import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { ProjectStatus } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { CheckIcon, ChevronDownIcon, MoreVerticalIcon } from '@/shared/ui/icons';

const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Завершен' },
  { value: 'on_pause', label: 'Приостановлен' },
];

const statusLabelByValue: Partial<Record<ProjectStatus, string>> = {
  in_progress: 'В работе',
  done: 'Завершен',
  on_pause: 'Приостановлен',
  under_threat: 'В работе',
  not_active: 'В работе',
  archive: 'Архив',
};

export type ProjectCardProps = {
  name: string;
  status: ProjectStatus;
  tasksCount: number;
  tasksDone?: number | null;
  deadline?: string | null;
  createdAt: string;
  active?: boolean;
  isOverdue?: boolean;
  onStatusChange?: (status: ProjectStatus) => void;
  statusDisabled?: boolean;
  menu?: ReactNode;
};

export function ProjectCard({
  name,
  status,
  tasksCount,
  tasksDone,
  deadline,
  createdAt,
  active = false,
  isOverdue = false,
  onStatusChange,
  statusDisabled = false,
  menu,
}: ProjectCardProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement | null>(null);

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

  const currentStatusLabel =
    statusLabelByValue[status] ?? statusOptions.find((option) => option.value === status)?.label ?? 'В работе';
  const isMuted = status === 'done' || status === 'on_pause' || status === 'archive';
  const resolvedTasksCount = Number.isFinite(tasksCount) ? Math.max(tasksCount, 0) : 0;
  const resolvedDoneCount =
    typeof tasksDone === 'number' && Number.isFinite(tasksDone) ? Math.max(tasksDone, 0) : null;
  const tasksMetric =
    resolvedDoneCount !== null && resolvedTasksCount > 0
      ? `${Math.min(resolvedDoneCount, resolvedTasksCount)}/${resolvedTasksCount}`
      : String(resolvedTasksCount);

  return (
    <div
      className={cn(
        'project-card',
        active && 'project-card--active',
        isMuted && 'project-card--muted',
      )}
    >
      <div className="project-card__name" title={name}>
        {name}
      </div>

      <div className="project-card__status">
        <div className="project-card__status-menu" ref={statusRef}>
          <button
            type="button"
            className="project-card__status-trigger"
            disabled={statusDisabled}
            aria-label="Статус проекта"
            aria-expanded={isStatusOpen}
            onClick={(event) => {
              event.stopPropagation();
              if (statusDisabled) return;
              setIsStatusOpen((prev) => !prev);
            }}
          >
            <span className="truncate">{currentStatusLabel}</span>
            <ChevronDownIcon
              className={cn('h-4 w-4 transition-transform', isStatusOpen && 'rotate-180')}
            />
          </button>

          {isStatusOpen ? (
            <div
              className="menu__popover project-card__status-popover"
              onClick={(event) => event.stopPropagation()}
            >
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'menu__item project-card__status-item',
                    option.value === status && 'project-card__status-item--active',
                  )}
                  onClick={() => {
                    onStatusChange?.(option.value);
                    setIsStatusOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === status ? <CheckIcon className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="project-card__metric project-card__metric--tasks">
        <span className="project-card__metric-label">Кол-во задач</span>
        <span className="project-card__metric-value">{tasksMetric}</span>
      </div>

      <div className="project-card__metric project-card__metric--deadline">
        <span className="project-card__metric-label">Дедлайн</span>
        <span
          className={cn(
            'project-card__metric-value',
            isOverdue && 'project-card__metric-value--overdue',
          )}
        >
          {deadline ? `до ${deadline}` : '—'}
        </span>
      </div>

      <div className="project-card__metric project-card__metric--created">
        <span className="project-card__metric-label">Дата создания</span>
        <span className="project-card__metric-value">{createdAt}</span>
      </div>

      <div className="project-card__menu" onClick={(event) => event.stopPropagation()}>
        {menu ?? (
          <button type="button" className="menu__button" aria-label="Меню">
            <MoreVerticalIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
