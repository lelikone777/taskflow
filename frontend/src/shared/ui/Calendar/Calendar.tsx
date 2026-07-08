import { useCallback, useMemo, useState } from 'react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';
import { IconButton } from '../Button';
import { Divider } from '../Divider';
import { Input } from '../Input';
import { ChevronRightIcon } from '../icons';

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

type CalendarCell = {
  date: Date;
  dayOfMonth: number;
} | null;

export type CalendarSize = 'default' | 'compact';

export type CalendarProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  showTimeBlock?: boolean;
  onDateSelect?: (date: Date) => void;
  value?: Date;
  initialDisplayDate?: Date;
  size?: CalendarSize;
};

export function Calendar({
  title,
  showTimeBlock = true,
  onDateSelect,
  value,
  initialDisplayDate,
  size = 'default',
  className,
  ...props
}: CalendarProps) {
  const now = useMemo(() => normalizeDate(new Date()), []);
  const initialDate = useMemo(
    () => normalizeDate(value ?? initialDisplayDate ?? new Date()),
    [initialDisplayDate, value],
  );
  const [displayDate, setDisplayDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [innerSelectedDate, setInnerSelectedDate] = useState<Date>(initialDate);

  const selectedDate = value ? normalizeDate(value) : innerSelectedDate;
  const isCompact = size === 'compact';
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  const daysGrid = useMemo((): CalendarCell[] => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const leadingEmptyDays = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: CalendarCell[] = [];
    for (let index = 0; index < leadingEmptyDays; index += 1) {
      result.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push({
        date: new Date(year, month, day),
        dayOfMonth: day,
      });
    }

    while (result.length < 42) {
      result.push(null);
    }
    return result;
  }, [month, year]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month, 1));
  }, [month, year]);

  const handleDateClick = useCallback(
    (date: Date) => {
      const normalized = normalizeDate(date);
      setInnerSelectedDate(normalized);
      onDateSelect?.(normalized);
    },
    [onDateSelect],
  );

  const goToPreviousMonth = useCallback(() => {
    setDisplayDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setDisplayDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }, []);

  return (
    <div className={cn('w-full', className)} {...props}>
      {title ? (
        <div className={cn(isCompact ? 'mb-3' : 'mb-5')}>
          <h2 className={cn(isCompact ? 'text-body font-medium text-center text-neutral-600' : 'text-h2 text-center text-neutral-500')}>
            {title}
          </h2>
        </div>
      ) : null}

      <div className={cn('grid items-center', isCompact ? 'mb-3 [--grid-gap:8px]' : 'mb-8 [--grid-gap:16px]')}>
        <h2 className={cn('capitalize', isCompact ? 'text-body-sm font-semibold col-span-10' : 'text-h2 col-span-10 max-sm:text-center')}>
          {monthLabel}
        </h2>
        <IconButton
          variant="outlined"
          size="sm"
          onClick={goToPreviousMonth}
          aria-label="Назад"
          className="border-none w-5 h-6 col-start-11"
        >
          <ChevronRightIcon width="100%" height="100%" stroke="#2a2a2a" className="[transform:scaleX(-1)]" />
        </IconButton>
        <IconButton
          variant="outlined"
          size="sm"
          onClick={goToNextMonth}
          aria-label="Вперед"
          className="border-none w-5 h-6 col-start-12"
        >
          <ChevronRightIcon width="100%" height="100%" stroke="#2a2a2a" />
        </IconButton>
      </div>

      <div className={cn('flex flex-col', isCompact ? 'gap-3 mb-3' : 'gap-8 mb-6')}>
        <div className={cn('grid grid--7', isCompact ? '[--grid-gap:8px]' : '[--grid-gap:20px]')}>
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className={cn(
                'text-center text-neutral-600',
                isCompact ? 'text-[11px] leading-[1.1] font-medium' : 'text-week font-medium',
              )}
            >
              {day}
            </div>
          ))}
        </div>
        <div className={cn('grid grid--7', isCompact ? '[--grid-gap:6px_8px]' : '[--grid-gap:18px_20px]')}>
          {daysGrid.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }

            const dayDate = day.date;
            const isSelected = isSameDate(dayDate, selectedDate);
            const isToday = isSameDate(dayDate, now);

            return (
              <div key={dayDate.toISOString()} className="text-center">
                <button
                  type="button"
                  onClick={() => handleDateClick(dayDate)}
                  className={cn(
                    'inline-flex items-center justify-center rounded-full transition-colors',
                    isCompact ? 'h-7 w-7 text-[12px] leading-none' : 'h-8 w-8 text-[14px] leading-none',
                    isSelected
                      ? 'bg-brand-600 text-neutral-150 font-semibold'
                      : isToday
                        ? 'text-brand-600 font-semibold'
                        : 'text-neutral-800 hover:bg-brand-100 hover:text-brand-600',
                  )}
                >
                  {day.dayOfMonth}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showTimeBlock ? (
        <div className={cn('flex flex-col', isCompact ? 'gap-4 mt-4' : 'gap-7 mt-6 mb-7')}>
          <div className="flex flex-row items-center justify-between">
            <span className={cn(isCompact ? 'text-body-sm font-medium text-neutral-800' : 'text-h2 text-neutral-800')}>Время</span>
            <div className="flex flex-row items-center gap-2">
              <Input size="lg" placeholder="00" className={cn(isCompact ? 'w-[62px]' : 'w-[90px]')} />
              <span>:</span>
              <Input size="lg" placeholder="00" className={cn(isCompact ? 'w-[62px]' : 'w-[90px]')} />
            </div>
          </div>
          <Divider />
        </div>
      ) : null}
    </div>
  );
}
