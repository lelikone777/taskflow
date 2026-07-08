import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useProjectCreate } from '@/features/project-create';
import {
  DashboardBottomNav,
  DashboardSidebar,
  DashboardTasksList,
  DashboardToolbar,
  ProjectList,
} from '@/widgets/dashboard';
import {
  defaultProjectFilters,
  type ProjectFilters,
  type ProjectSortOption,
} from '@/widgets/dashboard/model/project-view';

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ProjectSortOption>('created_desc');
  const [filters, setFilters] = useState<ProjectFilters>(defaultProjectFilters);
  const { openCreateProject } = useProjectCreate();
  const view = searchParams.get('view') === 'tasks' ? 'tasks' : 'projects';
  const scope = searchParams.get('scope');
  const scopedFilters = scope === 'archive'
    ? { ...filters, activeOnly: false, statuses: ['archive'] as ProjectFilters['statuses'] }
    : filters;

  return (
    <>
      <div className="dashboard-layout">
        <DashboardSidebar />
        <div className="dashboard-main">
          <div className="stack stack-gap-md">
            {view === 'tasks' ? (
              <DashboardTasksList />
            ) : (
              <>
                <DashboardToolbar
                  searchValue={search}
                  onSearchChange={setSearch}
                  onCreate={openCreateProject}
                  sortBy={sortBy}
                  filters={filters}
                  onSortChange={setSortBy}
                  onFiltersChange={setFilters}
                />
                <ProjectList search={search} filters={scopedFilters} sortBy={sortBy} />
              </>
            )}
          </div>
        </div>
      </div>
      <DashboardBottomNav />
    </>
  );
}
