import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/shared/lib/cn';

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
};

export function Radio({ label, className, id, ...props }: RadioProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label className={cn('radio', className)} htmlFor={inputId}>
      <input id={inputId} type="radio" className="radio__input" {...props} />
      <span className="radio__control" aria-hidden="true" />
      {label ? <span className="radio__label">{label}</span> : null}
    </label>
  );
}
