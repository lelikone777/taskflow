export const isMockApiEnabled = import.meta.env.VITE_USE_MOCK_API === 'true';
export const isTaskPriorityDateFiltersEnabled =
  import.meta.env.VITE_ENABLE_TASK_PRIORITY_DATE_FILTERS !== 'false';
export const isTaskStatusFilterEnabled =
  import.meta.env.VITE_ENABLE_TASK_STATUS_FILTER === 'true';
