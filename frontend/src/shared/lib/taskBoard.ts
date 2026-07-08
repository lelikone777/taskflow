import type { Task, TaskPriority, TaskStatus } from '@/shared/api';
import { getTaskMeta } from '@/shared/lib/taskMeta';

type BoardGroup = 1 | 2 | 3 | 4 | 5;

const IMPORTANT_PRIORITIES = new Set<TaskPriority>(['high', 'critical']);

const IN_PROGRESS_PRIORITY_ORDER: Record<TaskPriority, number> = {
  medium: 0,
  low: 1,
  high: 2,
  critical: 3,
};

const IMPORTANT_PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function toTimestamp(value?: string | null): number | null {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function parseDateOnly(value: string): Date | null {
  const normalized = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function applyTime(date: Date, timeValue?: string | null): Date {
  if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return date;
  }

  const [hours, minutes] = timeValue.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return date;
  }

  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function toDateTimeTimestamp(value?: string | null, timeValue?: string | null): number | null {
  if (!value) return null;

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return applyTime(dateOnly, timeValue).getTime();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (timeValue && /^\d{2}:\d{2}$/.test(timeValue)) {
    return applyTime(parsed, timeValue).getTime();
  }

  return parsed.getTime();
}

function getTaskPlannedStartTimestamp(task: Task): number | null {
  const meta = getTaskMeta(task.id);

  if (meta.startDate) {
    return toDateTimeTimestamp(meta.startDate, meta.startTime ?? meta.dueTime);
  }

  return toDateTimeTimestamp(task.dueDate, meta.dueTime);
}

function compareNullableAsc(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function getStartOfDayTimestamp(date: Date): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart.getTime();
}

export function isTaskImportant(task: Task): boolean {
  return IMPORTANT_PRIORITIES.has(task.priority);
}

export function getTaskDisplayStatus(task: Task, now = new Date()): TaskStatus {
  if (task.status !== 'planned') {
    return task.status;
  }

  const startAt = getTaskPlannedStartTimestamp(task);
  if (startAt !== null && startAt <= now.getTime()) {
    return 'in_progress';
  }

  return 'planned';
}

export function isTaskOverdue(task: Task, now = new Date()): boolean {
  if (getTaskDisplayStatus(task, now) !== 'in_progress') {
    return false;
  }

  const dueAt = toTimestamp(task.dueDate);
  if (dueAt === null) {
    return false;
  }

  return dueAt < getStartOfDayTimestamp(now);
}

function getTaskCompletionTimestamp(task: Task): number | null {
  return toTimestamp(task.completedAt) ?? toTimestamp(task.updatedAt) ?? toTimestamp(task.dueDate);
}

function getBoardGroup(task: Task, now: Date): BoardGroup {
  const status = getTaskDisplayStatus(task, now);

  if (status === 'done') {
    return 5;
  }

  if (status === 'planned') {
    return 4;
  }

  if (isTaskImportant(task)) {
    return 1;
  }

  if (isTaskOverdue(task, now)) {
    return 2;
  }

  return 3;
}

function compareImportant(left: Task, right: Task, now: Date): number {
  const leftOverdue = isTaskOverdue(left, now);
  const rightOverdue = isTaskOverdue(right, now);
  if (leftOverdue !== rightOverdue) {
    return leftOverdue ? -1 : 1;
  }

  const byDueDate = compareNullableAsc(toTimestamp(left.dueDate), toTimestamp(right.dueDate));
  if (byDueDate !== 0) {
    return byDueDate;
  }

  const byPriority = IMPORTANT_PRIORITY_ORDER[left.priority] - IMPORTANT_PRIORITY_ORDER[right.priority];
  if (byPriority !== 0) {
    return byPriority;
  }

  return left.id - right.id;
}

function compareOverdue(left: Task, right: Task): number {
  const byDueDate = compareNullableAsc(toTimestamp(left.dueDate), toTimestamp(right.dueDate));
  if (byDueDate !== 0) {
    return byDueDate;
  }

  const byPriority = IMPORTANT_PRIORITY_ORDER[left.priority] - IMPORTANT_PRIORITY_ORDER[right.priority];
  if (byPriority !== 0) {
    return byPriority;
  }

  return left.id - right.id;
}

function compareInProgress(left: Task, right: Task): number {
  const byDueDate = compareNullableAsc(toTimestamp(left.dueDate), toTimestamp(right.dueDate));
  if (byDueDate !== 0) {
    return byDueDate;
  }

  const byPriority = IN_PROGRESS_PRIORITY_ORDER[left.priority] - IN_PROGRESS_PRIORITY_ORDER[right.priority];
  if (byPriority !== 0) {
    return byPriority;
  }

  return left.id - right.id;
}

function comparePlanned(left: Task, right: Task): number {
  const byStartDate = compareNullableAsc(
    getTaskPlannedStartTimestamp(left),
    getTaskPlannedStartTimestamp(right),
  );
  if (byStartDate !== 0) {
    return byStartDate;
  }

  return left.id - right.id;
}

function compareDone(left: Task, right: Task): number {
  const byCompletedAt = compareNullableAsc(getTaskCompletionTimestamp(left), getTaskCompletionTimestamp(right));
  if (byCompletedAt !== 0) {
    return byCompletedAt;
  }

  return left.id - right.id;
}

export function sortTasksForBoard(tasks: Task[], now = new Date()): Task[] {
  return [...tasks].sort((left, right) => {
    const leftGroup = getBoardGroup(left, now);
    const rightGroup = getBoardGroup(right, now);

    if (leftGroup !== rightGroup) {
      return leftGroup - rightGroup;
    }

    switch (leftGroup) {
      case 1:
        return compareImportant(left, right, now);
      case 2:
        return compareOverdue(left, right);
      case 3:
        return compareInProgress(left, right);
      case 4:
        return comparePlanned(left, right);
      case 5:
        return compareDone(left, right);
      default:
        return left.id - right.id;
    }
  });
}
