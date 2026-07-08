import type { SelectHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { ChevronDownIcon } from '@/shared/ui/icons';

type SelectSize = 'sm' | 'md' | 'lg';

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  size?: SelectSize;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  hasError?: boolean;
  helperText?: string;
  errorText?: string;
};

export function Select({
  size = 'md',
  leftSlot,
  rightSlot,
  hasError = false,
  helperText,
  errorText,
  className,
  children,
  ...props
}: SelectProps) {
  const resolvedError = hasError || Boolean(errorText);
  const resolvedHelper = errorText ?? helperText;

  return (
    <div className={cn('field', className)}>
      <div
        className={cn(
          'input-group',
          `input-group--${size}`,
          resolvedError && 'input-group--error',
        )}
      >
        {leftSlot ? <span className="input-slot">{leftSlot}</span> : null}
        <select className={cn('select', `input--${size}`)} {...props}>
          {children}
        </select>
        <span className="input-slot">
          {rightSlot ?? <ChevronDownIcon className="h-4 w-4" />}
        </span>
      </div>
      {resolvedHelper ? (
        <div className={cn('field__helper', resolvedError && 'field__helper--error')}>
          {resolvedHelper}
        </div>
      ) : null}
    </div>
  );
}
