import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
  onRemove?: () => void;
  removableLabel?: string;
  active?: boolean;
  disabled?: boolean;
};

export function Tag({
  icon,
  onRemove,
  removableLabel = 'Удалить тег',
  active = false,
  disabled = false,
  className,
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn('tag', active && 'tag--active', disabled && 'tag--disabled', className)}
      aria-disabled={disabled}
      {...props}
    >
      {icon ? <span className="tag__icon">{icon}</span> : null}
      <span className="tag__label">{children}</span>
      {onRemove ? (
        <TagRemoveButton onClick={onRemove} aria-label={removableLabel} disabled={disabled} />
      ) : null}
    </span>
  );
}

type TagRemoveButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

function TagRemoveButton({ className, ...props }: TagRemoveButtonProps) {
  return (
    <button type="button" className={cn('tag__close', className)} {...props}>
      ×
    </button>
  );
}
