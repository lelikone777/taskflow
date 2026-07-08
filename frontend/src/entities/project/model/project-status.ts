import type { ProjectStatus } from '@/shared/api';

export const projectStatusLabels: Record<ProjectStatus, string> = {
  in_progress: 'В работе',
  not_active: 'Не активен',
  under_threat: 'Под угрозой',
  on_pause: 'На паузе',
  done: 'Завершен',
  archive: 'Архив',
  deleted: 'Удален',
};

export const defaultDeadlineOverdueStatuses: ProjectStatus[] = [
  'in_progress',
  'under_threat',
  'on_pause',
  'not_active',
];
