import { useEffect, useMemo, useState } from 'react';

import type { TaskStatus } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { toDateInputValue, type TaskReminderRepeat } from '@/shared/lib/taskMeta';
import { Button, Checkbox, Modal } from '@/shared/ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/ui/icons';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const REMINDER_REPEAT_OPTIONS: Array<{ value: TaskReminderRepeat; label: string }> = [
  { value: 'none', label: 'Нет' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'workdays', label: 'Пн-Пт' },
];

type CalendarCell = {
  key: string;
  dateValue: string | null;
  day: number | null;
};

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function isValidTimePart(value: string, max: number): boolean {
  if (!/^\d{1,2}$/.test(value)) {
    return false;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max;
}

function normalizeTimePart(value: string): string {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return '00';
  }
  return String(parsed).padStart(2, '0');
}

function splitTime(value?: string | null, fallback: [string, string] = ['00', '00']): [string, string] {
  if (!value) return fallback;
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return fallback;
  return [match[1], match[2]];
}

function createMonthGrid(monthCursor: Date): CalendarCell[] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = Array.from({ length: 42 }, (_, index) => ({
    key: `empty-${year}-${month}-${index}`,
    dateValue: null,
    day: null,
  }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const index = startWeekday + day - 1;
    const date = new Date(year, month, day);
    cells[index] = {
      key: toDateOnly(date),
      dateValue: toDateOnly(date),
      day,
    };
  }

  return cells;
}

type CalendarProps = {
  title: string;
  value: string;
  onChange: (value: string) => void;
  monthCursor: Date;
  onMonthCursorChange: (value: Date) => void;
};

function Calendar({
  title,
  value,
  onChange,
  monthCursor,
  onMonthCursorChange,
}: CalendarProps) {
  const cells = useMemo(() => createMonthGrid(monthCursor), [monthCursor]);
  const monthTitle = `${MONTH_LABELS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;

  return (
    <div className="task-schedule-modal__calendar-block">
      <div className="task-schedule-modal__calendar-title">{title}</div>

      <div className="task-schedule-modal__calendar-head">
        <div className="task-schedule-modal__month">{monthTitle}</div>
        <div className="task-schedule-modal__month-controls">
          <button
            type="button"
            className="task-schedule-modal__month-btn"
            aria-label="Предыдущий месяц"
            onClick={() => onMonthCursorChange(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="task-schedule-modal__month-btn"
            aria-label="Следующий месяц"
            onClick={() => onMonthCursorChange(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="task-schedule-modal__weekdays">
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday} className="task-schedule-modal__weekday">
            {weekday}
          </span>
        ))}
      </div>

      <div className="task-schedule-modal__days">
        {cells.map((cell) => {
          if (!cell.dateValue || !cell.day) {
            return <span key={cell.key} className="task-schedule-modal__day-empty" />;
          }

          const selected = value === cell.dateValue;
          return (
            <button
              key={cell.key}
              type="button"
              className={cn('task-schedule-modal__day', selected && 'task-schedule-modal__day--selected')}
              onClick={() => onChange(cell.dateValue!)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type TaskScheduleValue = {
  dueDate: string | null;
  dueTime: string | null;
  scheduleEnabled: boolean;
  startDate: string | null;
  startTime: string | null;
  reminderDate: string | null;
  reminderTime: string | null;
  reminderRepeat: TaskReminderRepeat;
};

export type TaskScheduleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: TaskScheduleValue) => Promise<void>;
  initialValue: TaskScheduleValue;
  taskStatus?: TaskStatus;
};

export function TaskScheduleModal({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  taskStatus,
}: TaskScheduleModalProps) {
  const [dueDate, setDueDate] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');

  const [dueTime, setDueTime] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);

  const [reminderHour, setReminderHour] = useState('08');
  const [reminderMinute, setReminderMinute] = useState('00');
  const [reminderRepeat, setReminderRepeat] = useState<TaskReminderRepeat>('none');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNoStartConfirm, setShowNoStartConfirm] = useState(false);
  const [dueMonthCursor, setDueMonthCursor] = useState(() => new Date());
  const [startMonthCursor, setStartMonthCursor] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dueDateValue = toDateInputValue(initialValue.dueDate);
    const startDateValue = toDateInputValue(initialValue.startDate);
    const [nextReminderHour, nextReminderMinute] = splitTime(initialValue.reminderTime, ['08', '00']);

    setDueDate(dueDateValue);
    setStartDate(startDateValue);
    setScheduleEnabled(initialValue.scheduleEnabled || Boolean(startDateValue));
    setDueTime(initialValue.dueTime ?? null);
    setStartTime(initialValue.startTime ?? null);
    setReminderHour(nextReminderHour);
    setReminderMinute(nextReminderMinute);
    setReminderRepeat(initialValue.reminderRepeat ?? 'none');
    setError(null);
    setIsSaving(false);
    setShowNoStartConfirm(false);

    setDueMonthCursor(dueDateValue ? new Date(dueDateValue) : new Date());
    setStartMonthCursor(startDateValue ? new Date(startDateValue) : new Date());
  }, [initialValue, isOpen]);

  const hasInvalidReminderTime = !isValidTimePart(reminderHour, 23) || !isValidTimePart(reminderMinute, 59);
  const resolveReminderDate = (
    shouldSchedule: boolean = scheduleEnabled,
    currentStartDate: string = startDate,
    currentDueDate: string = dueDate,
  ): string | null => {
    const value = shouldSchedule && currentStartDate ? currentStartDate : currentDueDate;
    return value || null;
  };

  const validate = (): boolean => {
    if (scheduleEnabled && dueDate && startDate) {
      const dueParsed = parseDateOnly(dueDate);
      const startParsed = parseDateOnly(startDate);
      if (dueParsed && startParsed && startParsed.getTime() > dueParsed.getTime()) {
        setError('Дата начала не может быть позже дедлайна');
        return false;
      }
    }

    if (reminderRepeat !== 'none') {
      if (!resolveReminderDate()) {
        setError('Для напоминания выберите дату задачи');
        return false;
      }
      if (taskStatus === 'planned' && scheduleEnabled && !startDate) {
        setError('Для напоминания у запланированной задачи укажите дату начала');
        return false;
      }
      if (hasInvalidReminderTime) {
        setError('Проверьте время напоминания');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const buildPayload = (skipScheduleWhenNoStart = false): TaskScheduleValue => {
    const shouldSchedule = scheduleEnabled && !(skipScheduleWhenNoStart && !startDate);
    const reminderTime =
      reminderRepeat === 'none'
        ? null
        : `${normalizeTimePart(reminderHour)}:${normalizeTimePart(reminderMinute)}`;
    const reminderDate = reminderRepeat === 'none' ? null : resolveReminderDate(shouldSchedule);

    return {
      dueDate: dueDate || null,
      dueTime: dueDate ? dueTime : null,
      scheduleEnabled: shouldSchedule,
      startDate: shouldSchedule ? startDate || null : null,
      startTime: shouldSchedule && startDate ? startTime : null,
      reminderDate,
      reminderTime,
      reminderRepeat,
    };
  };

  const submit = async (skipScheduleWhenNoStart = false) => {
    if (!validate()) {
      return;
    }

    if (scheduleEnabled && !startDate && !skipScheduleWhenNoStart) {
      setShowNoStartConfirm(true);
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(buildPayload(skipScheduleWhenNoStart));
      onClose();
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError('Не удалось сохранить сроки задачи');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        showClose={false}
        closeOnOverlay={true}
        className="task-schedule-modal"
      >
        <div className="task-schedule-modal__content">
          <Calendar
            title="Сделать задачу до"
            value={dueDate}
            onChange={setDueDate}
            monthCursor={dueMonthCursor}
            onMonthCursorChange={setDueMonthCursor}
          />

          <div className="task-schedule-modal__row">
            <span>Напоминание</span>
            <div className="task-schedule-modal__time">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                className={cn(
                  'task-schedule-modal__time-input',
                  reminderRepeat !== 'none' && hasInvalidReminderTime && 'task-schedule-modal__time-input--error',
                )}
                value={reminderHour}
                onChange={(event) => setReminderHour(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                disabled={reminderRepeat === 'none'}
              />
              <span className="task-schedule-modal__time-separator">:</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                className={cn(
                  'task-schedule-modal__time-input',
                  reminderRepeat !== 'none' && hasInvalidReminderTime && 'task-schedule-modal__time-input--error',
                )}
                value={reminderMinute}
                onChange={(event) => setReminderMinute(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                disabled={reminderRepeat === 'none'}
              />
            </div>
          </div>

          <div className="task-schedule-modal__row">
            <span>Повторы</span>
            <select
              className="task-schedule-modal__repeat"
              value={reminderRepeat}
              onChange={(event) => {
                const next = event.target.value as TaskReminderRepeat;
                setReminderRepeat(next);
                if (next !== 'none' && !isValidTimePart(reminderHour, 23)) {
                  setReminderHour('08');
                }
                if (next !== 'none' && !isValidTimePart(reminderMinute, 59)) {
                  setReminderMinute('00');
                }
              }}
            >
              {REMINDER_REPEAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="task-schedule-modal__row task-schedule-modal__row--checkbox">
            <Checkbox
              checked={scheduleEnabled}
              onChange={(event) => setScheduleEnabled(event.target.checked)}
              label="Запланировать задачу"
            />
          </div>

          {scheduleEnabled ? (
            <>
              <div className="task-schedule-modal__divider" />
              <Calendar
                title="Начало задачи"
                value={startDate}
                onChange={setStartDate}
                monthCursor={startMonthCursor}
                onMonthCursorChange={setStartMonthCursor}
              />
            </>
          ) : null}

          {error ? <p className="task-schedule-modal__error">{error}</p> : null}

          <div className="task-schedule-modal__actions">
            <Button type="button" onClick={() => void submit()} disabled={isSaving}>
              Сохранить
            </Button>
            <Button type="button" variant="outlined" onClick={onClose} disabled={isSaving}>
              Отменить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showNoStartConfirm}
        onClose={() => setShowNoStartConfirm(false)}
        closeOnOverlay={false}
        showClose={false}
        className="task-schedule-confirm-modal"
      >
        <p className="task-schedule-confirm-modal__title">
          Вы не поставили начало даты.
          <br />
          Сохранить?
        </p>
        <div className="task-schedule-confirm-modal__actions">
          <Button type="button" onClick={() => void submit(true)}>
            Да
          </Button>
          <Button type="button" variant="outlined" onClick={() => setShowNoStartConfirm(false)}>
            Нет
          </Button>
        </div>
      </Modal>
    </>
  );
}
