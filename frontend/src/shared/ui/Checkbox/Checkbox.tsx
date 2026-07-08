import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/shared/lib/cn';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label className={cn('checkbox', className)} htmlFor={inputId}>
      <input id={inputId} type="checkbox" className="checkbox__input" {...props} />
      <span className="checkbox__control" aria-hidden="true" />
      {label ? <span className="checkbox__label">{label}</span> : null}
    </label>
  );
}
