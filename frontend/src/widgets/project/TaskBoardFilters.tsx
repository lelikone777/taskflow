import { useMemo } from 'react';

import { taskPriorityOptions, taskStatusOptions } from '@/entities/task';
import type { TaskPriority, TaskStatus } from '@/shared/api';
import { FilterBar, Input, Tag } from '@/shared/ui';

type TaskFilterTag = {
  id: number;
  name: string;
};

type TaskBoardFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (isOpen: boolean) => void;
  priorityDateFiltersEnabled?: boolean;
  statusFilterEnabled?: boolean;
  priorityFilter: TaskPriority | '';
  onPriorityFilterChange: (value: TaskPriority | '') => void;
  statusFilter: TaskStatus | '';
  onStatusFilterChange: (value: TaskStatus | '') => void;
  tagFilters: number[];
  tags: TaskFilterTag[];
  onToggleTagFilter: (tagId: number) => void;
  onRemoveTagFilter: (tagId: number) => void;
  dueFrom: string;
  onDueFromChange: (value: string) => void;
  dueTo: string;
  onDueToChange: (value: string) => void;
  activePriorityLabel?: string;
  activeStatusLabel?: string;
};

export function TaskBoardFilters({
  search,
  onSearchChange,
  filtersOpen,
  onFiltersOpenChange,
  priorityDateFiltersEnabled = true,
  statusFilterEnabled = false,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  tagFilters,
  tags,
  onToggleTagFilter,
  onRemoveTagFilter,
  dueFrom,
  onDueFromChange,
  dueTo,
  onDueToChange,
  activePriorityLabel,
  activeStatusLabel,
}: TaskBoardFiltersProps) {
  const tagsById = useMemo(() => {
    return new Map(tags.map((tag) => [tag.id, tag]));
  }, [tags]);

  return (
    <FilterBar
      searchValue={search}
      onSearchChange={onSearchChange}
      filtersOpen={filtersOpen}
      onFiltersOpenChange={onFiltersOpenChange}
      filterAriaLabel="Фильтры задач"
      chips={(
        <>
          {priorityDateFiltersEnabled && activePriorityLabel ? (
            <Tag className="project-board__chip" onRemove={() => onPriorityFilterChange('')}>
              Приоритет: {activePriorityLabel}
            </Tag>
          ) : null}
          {statusFilterEnabled && activeStatusLabel ? (
            <Tag className="project-board__chip" onRemove={() => onStatusFilterChange('')}>
              Статус: {activeStatusLabel}
            </Tag>
          ) : null}
          {tagFilters.map((tagId, index) => {
            const tag = tagsById.get(tagId);
            if (!tag) return null;
            return (
              <Tag key={tag.id} className="project-board__chip" onRemove={() => onRemoveTagFilter(tag.id)}>
                {index === 0 ? `Теги: ${tag.name}` : tag.name}
              </Tag>
            );
          })}
        </>
      )}
      popover={(
        <div className="filter-popover project-board__filter-popover">
          {priorityDateFiltersEnabled ? (
            <div className="surface filter-popover__panel">
              <div className="stack stack-gap-sm">
                <div className="text-body-sm text-[color:var(--color-text-secondary)]">Приоритет</div>
                <div className="stack stack-gap-xs">
                  {taskPriorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`filter-popover__item ${priorityFilter === option.value ? 'filter-popover__item--active' : ''}`}
                      onClick={() => onPriorityFilterChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="filter-popover__item"
                    onClick={() => onPriorityFilterChange('')}
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {statusFilterEnabled ? (
            <div className="surface filter-popover__panel">
              <div className="stack stack-gap-sm">
                <div className="text-body-sm text-[color:var(--color-text-secondary)]">Статус</div>
                <div className="stack stack-gap-xs">
                  {taskStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`filter-popover__item ${statusFilter === option.value ? 'filter-popover__item--active' : ''}`}
                      onClick={() => onStatusFilterChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="filter-popover__item"
                    onClick={() => onStatusFilterChange('')}
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="surface filter-popover__panel filter-popover__sub">
            <div className="stack stack-gap-sm">
              <div className="text-body-sm text-[color:var(--color-text-secondary)]">Теги</div>
              <div className="stack stack-gap-xs">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`filter-popover__option ${tagFilters.includes(tag.id) ? 'filter-popover__option--active' : ''}`}
                    onClick={() => onToggleTagFilter(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {priorityDateFiltersEnabled ? (
            <div className="surface filter-popover__panel">
              <div className="stack stack-gap-sm">
                <div className="text-body-sm text-[color:var(--color-text-secondary)]">Дата</div>
                <div className="stack stack-gap-xs">
                  <Input type="date" value={dueFrom} onChange={(event) => onDueFromChange(event.target.value)} />
                  <Input type="date" value={dueTo} onChange={(event) => onDueToChange(event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    />
  );
}
