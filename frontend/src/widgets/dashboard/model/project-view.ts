import type { Project, ProjectStatus } from '@/shared/api';

export type ProjectPriority = 'high' | 'medium' | 'low';

export type ProjectSortOption =
  | 'created_desc'
  | 'created_asc'
  | 'deadline_desc'
  | 'deadline_asc'
  | 'alphabet_asc'
  | 'alphabet_desc'
  | 'tasks_done_desc'
  | 'tasks_unfinished_desc'
  | 'priority_desc'
  | 'priority_asc';

export type ProjectFilters = {
  statuses: ProjectStatus[];
  priorities: ProjectPriority[];
  activeOnly: boolean;
};

export type QuickStatusValue = ProjectStatus | 'all';

export const defaultProjectFilters: ProjectFilters = {
  statuses: [],
  priorities: [],
  activeOnly: false,
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  in_progress: 'В работе',
  on_pause: 'Приостановлен',
  under_threat: 'Под угрозой',
  not_active: 'Не активен',
  done: 'Завершен',
  archive: 'Архив',
  deleted: 'Удален',
};

export const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'in_progress', label: projectStatusLabels.in_progress },
  { value: 'on_pause', label: projectStatusLabels.on_pause },
  { value: 'under_threat', label: projectStatusLabels.under_threat },
  { value: 'not_active', label: projectStatusLabels.not_active },
  { value: 'done', label: projectStatusLabels.done },
  { value: 'archive', label: projectStatusLabels.archive },
];

export const projectPriorityLabels: Record<ProjectPriority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

export const projectPriorityOptions: Array<{ value: ProjectPriority; label: string }> = [
  { value: 'high', label: projectPriorityLabels.high },
  { value: 'medium', label: projectPriorityLabels.medium },
  { value: 'low', label: projectPriorityLabels.low },
];

export const projectSortOptionLabels: Record<ProjectSortOption, string> = {
  created_desc: 'Сначала новые',
  created_asc: 'Сначала старые',
  deadline_desc: 'Дедлайн: поздние',
  deadline_asc: 'Дедлайн: ранние',
  alphabet_asc: 'А-Я',
  alphabet_desc: 'Я-А',
  tasks_done_desc: 'Больше завершенных',
  tasks_unfinished_desc: 'Больше незавершенных',
  priority_desc: 'Сначала важные',
  priority_asc: 'Сначала менее важные',
};

export const projectSortOptions: Array<{ value: ProjectSortOption; label: string }> = [
  { value: 'created_desc', label: projectSortOptionLabels.created_desc },
  { value: 'created_asc', label: projectSortOptionLabels.created_asc },
  { value: 'deadline_desc', label: projectSortOptionLabels.deadline_desc },
  { value: 'deadline_asc', label: projectSortOptionLabels.deadline_asc },
  { value: 'tasks_done_desc', label: projectSortOptionLabels.tasks_done_desc },
  { value: 'tasks_unfinished_desc', label: projectSortOptionLabels.tasks_unfinished_desc },
  { value: 'priority_desc', label: projectSortOptionLabels.priority_desc },
  { value: 'priority_asc', label: projectSortOptionLabels.priority_asc },
  { value: 'alphabet_asc', label: projectSortOptionLabels.alphabet_asc },
  { value: 'alphabet_desc', label: projectSortOptionLabels.alphabet_desc },
];

const activeStatuses: ProjectStatus[] = ['in_progress', 'under_threat', 'on_pause'];

const priorityWeight: Record<ProjectPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function getProjectPriority(status: ProjectStatus): ProjectPriority {
  if (status === 'under_threat') {
    return 'high';
  }
  if (status === 'in_progress' || status === 'on_pause') {
    return 'medium';
  }
  return 'low';
}

function asTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function asCount(value?: number | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(value, 0);
}

function getUnfinishedCount(project: Project): number {
  const total = asCount(project.tasksCountAll);
  const done = asCount(project.tasksCountDone);
  return Math.max(total - done, 0);
}

function compareBySort(left: Project, right: Project, sortBy: ProjectSortOption): number {
  switch (sortBy) {
    case 'created_asc':
      return asTimestamp(left.createdAt) - asTimestamp(right.createdAt);
    case 'created_desc':
      return asTimestamp(right.createdAt) - asTimestamp(left.createdAt);
    case 'deadline_asc':
      return asTimestamp(left.deadline) - asTimestamp(right.deadline);
    case 'deadline_desc':
      return asTimestamp(right.deadline) - asTimestamp(left.deadline);
    case 'alphabet_asc':
      return left.name.localeCompare(right.name, 'ru');
    case 'alphabet_desc':
      return right.name.localeCompare(left.name, 'ru');
    case 'tasks_done_desc':
      return asCount(right.tasksCountDone) - asCount(left.tasksCountDone);
    case 'tasks_unfinished_desc':
      return getUnfinishedCount(right) - getUnfinishedCount(left);
    case 'priority_desc':
      return priorityWeight[getProjectPriority(right.status)] - priorityWeight[getProjectPriority(left.status)];
    case 'priority_asc':
      return priorityWeight[getProjectPriority(left.status)] - priorityWeight[getProjectPriority(right.status)];
    default:
      return 0;
  }
}

export function applyProjectView(
  projects: Project[],
  search: string,
  filters: ProjectFilters,
  sortBy: ProjectSortOption,
) {
  const query = search.trim().toLowerCase();

  const filtered = projects.filter((project) => {
    if (query && !project.name.toLowerCase().includes(query)) {
      return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(project.status)) {
      return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(getProjectPriority(project.status))) {
      return false;
    }
    if (filters.activeOnly && !activeStatuses.includes(project.status)) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((left, right) => compareBySort(left, right, sortBy));
}

