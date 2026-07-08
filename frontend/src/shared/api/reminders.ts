import { api } from './client';
import { resolveTaskRoute } from './tasks';
import type { TaskReminderRepeat } from '@/shared/lib/taskMeta';

export type ReminderTaskStatus = 'planned' | 'in_progress' | 'done';

export type UserReminder = {
  id: number;
  wasRead: boolean;
  taskName: string;
  taskDescription: string | null;
  taskStatus: ReminderTaskStatus;
  sentDate: string;
  sentTimeHour: number;
  sentTimeMinutes: number;
  expired: boolean;
};

type UserReminderResponse = {
  id: number;
  was_read: boolean;
  task_name: string;
  task_description?: string | null;
  task_status: string;
  sent_date: string;
  sent_time_hour: number;
  sent_time_minutes: number;
  expired: boolean;
};

type UserRemindersResponse = {
  reminders?: UserReminderResponse[] | null;
};

function normalizeStatus(status?: string | null): ReminderTaskStatus {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('done') || normalized.includes('\u0437\u0430\u0432\u0435\u0440\u0448')) {
    return 'done';
  }
  if (normalized.includes('schedule') || normalized.includes('planned') || normalized.includes('\u0437\u0430\u043f\u043b\u0430\u043d')) {
    return 'planned';
  }
  return 'in_progress';
}

function mapReminder(item: UserReminderResponse): UserReminder {
  return {
    id: item.id,
    wasRead: item.was_read,
    taskName: item.task_name,
    taskDescription: item.task_description ?? null,
    taskStatus: normalizeStatus(item.task_status),
    sentDate: item.sent_date,
    sentTimeHour: item.sent_time_hour,
    sentTimeMinutes: item.sent_time_minutes,
    expired: item.expired,
  };
}

export async function fetchUserReminders(): Promise<UserReminder[]> {
  const { data } = await api.get<UserRemindersResponse>('/user/reminders/');
  return (data.reminders ?? []).map(mapReminder);
}

export async function markReminderRead(reminderId: number): Promise<void> {
  await api.patch(`/user/reminders/${reminderId}`, { was_read: true });
}

export async function deleteReminder(reminderId: number): Promise<void> {
  await api.delete(`/user/reminders/${reminderId}`);
}

const reminderPeriodicMap: Record<TaskReminderRepeat, string> = {
  none: 'Нет',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  workdays: 'Пн-Пт',
};

export type UpsertTaskReminderPayload = {
  date: string;
  hour: number;
  minutes: number;
  repeat: TaskReminderRepeat;
};

export async function upsertTaskReminder(
  taskId: number,
  payload: UpsertTaskReminderPayload,
): Promise<void> {
  const route = await resolveTaskRoute(taskId);
  await api.patch(`/projects/${route.projectId}/tasklist/${route.listId}/task/${taskId}/reminders/`, {
    reminder_date: payload.date,
    reminder_time_hour: payload.hour,
    reminder_time_minutes: payload.minutes,
    reminder_periodic: reminderPeriodicMap[payload.repeat],
  });
}
