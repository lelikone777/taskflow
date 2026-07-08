import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

type IconButtonVariant = 'primary' | 'tonal' | 'outlined';
type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

export function IconButton({
  variant = 'tonal',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn('btn', 'btn--icon', `btn--${variant}`, `btn--${size}`, className)}
      type={type}
      {...props}
    />
  );
}
