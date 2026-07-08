import type { ProjectStatus } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import {
  defaultProjectFilters,
  projectPriorityLabels,
  projectPriorityOptions,
  projectSortOptions,
  projectStatusOptions,
  type ProjectFilters,
  type ProjectPriority,
  type ProjectSortOption,
} from './model/project-view';

export type ProjectsFilterPopoverProps = {
  id?: string;
  sortBy: ProjectSortOption;
  filters: ProjectFilters;
  onSortChange: (sortBy: ProjectSortOption) => void;
  onFiltersChange: (filters: ProjectFilters) => void;
};

function toggleValue<T extends string>(items: T[], value: T): T[] {
  if (items.includes(value)) {
    return items.filter((item) => item !== value);
  }
  return [...items, value];
}

export function ProjectsFilterPopover({
  id,
  sortBy,
  filters,
  onSortChange,
  onFiltersChange,
}: ProjectsFilterPopoverProps) {
  const toggleStatus = (status: ProjectStatus) => {
    onFiltersChange({
      ...filters,
      statuses: toggleValue(filters.statuses, status),
    });
  };

  const togglePriority = (priority: ProjectPriority) => {
    onFiltersChange({
      ...filters,
      priorities: toggleValue(filters.priorities, priority),
    });
  };

  const toggleActiveOnly = () => {
    onFiltersChange({
      ...filters,
      activeOnly: !filters.activeOnly,
    });
  };

  const resetAll = () => {
    onSortChange('created_desc');
    onFiltersChange(defaultProjectFilters);
  };

  return (
    <div className="filter-popover project-board__filter-popover" id={id}>
      <div className="surface filter-popover__panel">
        <div className="stack stack-gap-sm">
          <div className="text-body-sm text-[color:var(--color-text-secondary)]">Статус проекта</div>
          <div className="stack stack-gap-xs">
            {projectStatusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'filter-popover__option',
                  filters.statuses.includes(option.value) && 'filter-popover__option--active',
                )}
                onClick={() => toggleStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className="filter-popover__item"
              onClick={() => onFiltersChange({ ...filters, statuses: [] })}
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <div className="surface filter-popover__panel">
        <div className="stack stack-gap-sm">
          <div className="text-body-sm text-[color:var(--color-text-secondary)]">Приоритет</div>
          <div className="stack stack-gap-xs">
            {projectPriorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'filter-popover__option',
                  filters.priorities.includes(option.value) && 'filter-popover__option--active',
                )}
                onClick={() => togglePriority(option.value)}
              >
                {projectPriorityLabels[option.value]}
              </button>
            ))}
            <button
              type="button"
              className="filter-popover__item"
              onClick={() => onFiltersChange({ ...filters, priorities: [] })}
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <div className="surface filter-popover__panel">
        <div className="stack stack-gap-sm">
          <div className="text-body-sm text-[color:var(--color-text-secondary)]">Режим выборки</div>
          <div className="stack stack-gap-xs">
            <button
              type="button"
              className={cn('filter-popover__item', filters.activeOnly && 'filter-popover__item--active')}
              onClick={toggleActiveOnly}
            >
              Только активные
            </button>
            <button
              type="button"
              className="filter-popover__item"
              onClick={() => onFiltersChange({ ...filters, activeOnly: false })}
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <div className="surface filter-popover__panel">
        <div className="stack stack-gap-sm">
          <div className="text-body-sm text-[color:var(--color-text-secondary)]">Сортировка</div>
          <div className="stack stack-gap-xs">
            {projectSortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'filter-popover__item',
                  sortBy === option.value && 'filter-popover__item--active',
                )}
                onClick={() => onSortChange(option.value)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className="filter-popover__item"
              onClick={() => onSortChange('created_desc')}
            >
              По умолчанию
            </button>
          </div>
        </div>
      </div>

      <div className="surface filter-popover__panel">
        <button type="button" className="filter-popover__item" onClick={resetAll}>
          Сбросить все фильтры
        </button>
      </div>
    </div>
  );
}

