import { useEffect, useMemo, useRef, useState } from 'react';

import type { TaskPriority } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { CheckIcon, ChevronDownIcon } from '@/shared/ui/icons';

type EditablePriority = 'high' | 'medium' | 'low';

type PriorityOption = {
  value: EditablePriority;
  label: string;
};

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' },
];

function toEditablePriority(value: TaskPriority): EditablePriority {
  if (value === 'high' || value === 'critical') return 'high';
  if (value === 'medium') return 'medium';
  return 'low';
}

type TaskPrioritySelectProps = {
  value: TaskPriority;
  onChange: (value: EditablePriority) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function TaskPrioritySelect({
  value,
  onChange,
  disabled = false,
  className,
}: TaskPrioritySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedPriority = toEditablePriority(value);

  const selectedOption = useMemo(
    () => PRIORITY_OPTIONS.find((option) => option.value === selectedPriority) ?? PRIORITY_OPTIONS[2],
    [selectedPriority],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('task-priority-select', className)}>
      <button
        type="button"
        className={cn('task-priority-select__trigger', open && 'task-priority-select__trigger--open')}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Приоритет задачи"
      >
        <span className="task-priority-select__value">
          <span className={cn('task-priority-select__dot', `task-priority-select__dot--${selectedOption.value}`)} />
          <span>{selectedOption.label}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            'task-priority-select__chevron',
            open && 'task-priority-select__chevron--open',
          )}
        />
      </button>

      {open ? (
        <div className="task-priority-select__menu" role="listbox">
          {PRIORITY_OPTIONS.map((option) => {
            const selected = option.value === selectedOption.value;
            return (
              <button
                key={option.value}
                type="button"
                className={cn('task-priority-select__item', selected && 'task-priority-select__item--selected')}
                onClick={() => {
                  setOpen(false);
                  void onChange(option.value);
                }}
                role="option"
                aria-selected={selected}
              >
                <span className="task-priority-select__value">
                  <span className={cn('task-priority-select__dot', `task-priority-select__dot--${option.value}`)} />
                  <span>{option.label}</span>
                </span>
                {selected ? <CheckIcon className="h-4 w-4 text-[color:var(--color-brand-600)]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
