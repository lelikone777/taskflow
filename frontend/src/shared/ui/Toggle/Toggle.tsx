import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/shared/lib/cn';

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
};

export function Toggle({ label, className, id, ...props }: ToggleProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label className={cn('toggle', className)} htmlFor={inputId}>
      <input id={inputId} type="checkbox" className="toggle__input" {...props} />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      {label ? <span className="toggle__label">{label}</span> : null}
    </label>
  );
}
