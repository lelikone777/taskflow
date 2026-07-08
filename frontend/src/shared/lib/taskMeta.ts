export type TaskReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'workdays';

export type TaskMeta = {
  startDate: string | null;
  startTime: string | null;
  dueTime: string | null;
  reminderDate: string | null;
  reminderTime: string | null;
  reminderRepeat: TaskReminderRepeat;
};

const STORAGE_KEY = 'taskflow_task_meta_v1';

type TaskMetaRecord = Record<string, Partial<TaskMeta>>;

const defaultTaskMeta: TaskMeta = {
  startDate: null,
  startTime: null,
  dueTime: null,
  reminderDate: null,
  reminderTime: null,
  reminderRepeat: 'none',
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStore(): TaskMetaRecord {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as TaskMetaRecord;
  } catch {
    return {};
  }
}

function writeStore(record: TaskMetaRecord) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function sanitizeMeta(meta?: Partial<TaskMeta> | null): TaskMeta {
  const repeat = meta?.reminderRepeat;
  const normalizedRepeat: TaskReminderRepeat =
    repeat === 'daily' || repeat === 'weekly' || repeat === 'monthly' || repeat === 'workdays'
      ? repeat
      : 'none';

  return {
    startDate: normalizeDate(meta?.startDate),
    startTime: normalizeTime(meta?.startTime),
    dueTime: normalizeTime(meta?.dueTime),
    reminderDate: normalizeDate(meta?.reminderDate),
    reminderTime: normalizeTime(meta?.reminderTime),
    reminderRepeat: normalizedRepeat,
  };
}

export function getDefaultTaskMeta(): TaskMeta {
  return { ...defaultTaskMeta };
}

export function getTaskMeta(taskId: number): TaskMeta {
  const record = readStore();
  const key = String(taskId);
  const current = record[key];

  if (!current) {
    return getDefaultTaskMeta();
  }

  return sanitizeMeta(current);
}

export function setTaskMeta(taskId: number, nextMeta: Partial<TaskMeta>): TaskMeta {
  const record = readStore();
  const key = String(taskId);
  const current = sanitizeMeta(record[key] ?? {});
  const merged = sanitizeMeta({
    ...current,
    ...nextMeta,
  });

  record[key] = merged;
  writeStore(record);

  return merged;
}

export function clearTaskMeta(taskId: number) {
  const record = readStore();
  const key = String(taskId);
  if (!(key in record)) {
    return;
  }

  delete record[key];
  writeStore(record);
}

export function parseTaskDate(dateValue?: string | null): Date | null {
  const normalized = normalizeDate(dateValue);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function toDateInputValue(dateValue?: string | null): string {
  return normalizeDate(dateValue) ?? '';
}

export function formatTaskDateLabel(dateValue?: string | null): string {
  const parsed = parseTaskDate(dateValue);
  if (!parsed) {
    return '—';
  }

  return new Intl.DateTimeFormat('ru-RU').format(parsed);
}

export function formatTaskDateTimeLabel(
  dateValue?: string | null,
  timeValue?: string | null,
  connector: 'в' | 'до' = 'в',
): string {
  const dateLabel = formatTaskDateLabel(dateValue);
  if (dateLabel === '—') {
    return dateLabel;
  }

  const normalizedTime = normalizeTime(timeValue);
  if (!normalizedTime) {
    return dateLabel;
  }

  return `${dateLabel} ${connector} ${normalizedTime}`;
}

export function reminderRepeatLabel(repeat: TaskReminderRepeat): string {
  switch (repeat) {
    case 'daily':
      return 'Каждый день';
    case 'weekly':
      return 'Еженедельно';
    case 'monthly':
      return 'Ежемесячно';
    case 'workdays':
      return 'Пн-Пт';
    case 'none':
    default:
      return 'Нет';
  }
}
