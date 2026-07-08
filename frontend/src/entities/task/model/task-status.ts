import type { TaskStatus } from '@/shared/api';

export type TaskStatusAction = {
  label: string;
  nextStatus: TaskStatus | null;
  done: boolean;
  planned: boolean;
};

export function getTaskStatusAction(status: TaskStatus): TaskStatusAction {
  if (status === 'planned') {
    return { label: 'Взять в работу', nextStatus: 'in_progress', done: false, planned: true };
  }

  if (status === 'done') {
    return { label: 'Сделано', nextStatus: null, done: true, planned: false };
  }

  return { label: 'Выполнить', nextStatus: 'done', done: false, planned: false };
}
