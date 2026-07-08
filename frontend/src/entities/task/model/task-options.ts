import type { TaskPriority, TaskStatus } from '@/shared/api';

export const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'planned', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнена' },
];

export const taskPriorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' },
];

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критичный',
};
