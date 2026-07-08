import { useState } from 'react';

import { Button, FilterBar, Tag } from '@/shared/ui';
import { PlusIcon } from '@/shared/ui/icons';
import { ProjectsFilterPopover } from './ProjectsFilterPopover';
import {
  projectPriorityLabels,
  projectSortOptionLabels,
  projectStatusLabels,
  type ProjectFilters,
  type ProjectSortOption,
} from './model/project-view';

export type DashboardToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreate?: () => void;
  sortBy: ProjectSortOption;
  filters: ProjectFilters;
  onSortChange: (sortBy: ProjectSortOption) => void;
  onFiltersChange: (filters: ProjectFilters) => void;
};

export function DashboardToolbar({
  searchValue = '',
  onSearchChange,
  onCreate,
  sortBy,
  filters,
  onSortChange,
  onFiltersChange,
}: DashboardToolbarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const resetStatus = (status: ProjectFilters['statuses'][number]) => {
    onFiltersChange({
      ...filters,
      statuses: filters.statuses.filter((item) => item !== status),
    });
  };

  const resetPriority = (priority: ProjectFilters['priorities'][number]) => {
    onFiltersChange({
      ...filters,
      priorities: filters.priorities.filter((item) => item !== priority),
    });
  };

  return (
    <div className="surface dashboard-toolbar">
      <div className="dashboard-toolbar__row">
        <FilterBar
          searchValue={searchValue}
          onSearchChange={(value) => onSearchChange?.(value)}
          filtersOpen={isFiltersOpen}
          onFiltersOpenChange={setIsFiltersOpen}
          filterAriaLabel="Фильтры проектов"
          chips={(
            <>
              {sortBy !== 'created_desc' ? (
                <div className='project-board__chips-group'>
                  <span className='project-board__chips-group-label'>Сортировка:</span>
                  <div className='project-board__chips-group-tags'>
                    <Tag className="project-board__chip" onRemove={() => onSortChange('created_desc')}>
                      {projectSortOptionLabels[sortBy]}
                    </Tag>
                  </div>
                </div>
              ) : null}
              {filters.activeOnly ? (
                <div className='project-board__chips-group'>
                  <div className='project-board__chips-group-tags'>
                    <Tag
                      className="project-board__chip"
                      onRemove={() => onFiltersChange({ ...filters, activeOnly: false })}
                    >
                      Только активные
                    </Tag>
                  </div>
                </div>
              ) : null}
                  {filters.statuses.length > 0 ? (
                    <div className='project-board__chips-group'>
                      <span className='project-board__chips-group-label'>Статус:</span>
                      <div className='project-board__chips-group-tags'>
                        {filters.statuses.map((status) => (
                          <Tag key={status} className="project-board__chip" onRemove={() => resetStatus(status)}>
                            {projectStatusLabels[status]}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {filters.priorities.length > 0 ? (
                    <div className='project-board__chips-group'>
                      <span className='project-board__chips-group-label'>Приоритет:</span>
                      <div className='project-board__chips-group-tags'>
                        {filters.priorities.map((priority) => (
                          <Tag key={priority} className="project-board__chip" onRemove={() => resetPriority(priority)}>
                            {projectPriorityLabels[priority]}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              popover={(
                <ProjectsFilterPopover
                  id="projects-filter-popover"
                  sortBy={sortBy}
                  filters={filters}
                  onSortChange={onSortChange}
                  onFiltersChange={onFiltersChange}
                />
              )}
        />

              <Button type="button" className="dashboard-toolbar__create" onClick={onCreate}>
                Создать проект
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
      </div>
      );
}
