import type { ProjectStatus } from '@/shared/api';

import { defaultDeadlineOverdueStatuses } from '../model/project-status';

type IsProjectDeadlineOverdueOptions = {
  overdueStatuses?: ProjectStatus[];
  now?: Date;
};

export function parseProjectDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const dateOnly = value.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    if (!Number.isNaN(localDate.getTime())) {
      return localDate;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function formatProjectDeadlineDate(value?: Date): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('ru-RU').format(value);
}

export function isProjectDeadlineOverdue(
  deadline?: string | null,
  status?: ProjectStatus,
  options?: IsProjectDeadlineOverdueOptions,
): boolean {
  const overdueStatuses = options?.overdueStatuses ?? defaultDeadlineOverdueStatuses;
  const now = options?.now ?? new Date();

  if (!deadline || !status || !overdueStatuses.includes(status)) {
    return false;
  }

  const deadlineDate = parseProjectDate(deadline);
  if (!deadlineDate) {
    return false;
  }

  deadlineDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return deadlineDate.getTime() < today.getTime();
}
