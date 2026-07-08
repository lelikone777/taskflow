import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type InputSize = 'sm' | 'md' | 'lg';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: InputSize;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  hasError?: boolean;
  inputClassName?: string;
};

export function Input({
  size = 'md',
  leftSlot,
  rightSlot,
  hasError = false,
  className,
  inputClassName,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(
        'input-group',
        `input-group--${size}`,
        hasError && 'input-group--error',
        className,
      )}
    >
      {leftSlot ? <span className="input-slot">{leftSlot}</span> : null}
      <input className={cn('input', `input--${size}`, inputClassName)} {...props} />
      {rightSlot ? <span className="input-slot">{rightSlot}</span> : null}
    </div>
  );
}
