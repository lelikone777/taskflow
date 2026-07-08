import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

type BadgeVariant = 'soft' | 'solid' | 'outline';
type BadgeSize = 'sm' | 'md';
type BadgeColor =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
};

export function Badge({
  variant = 'soft',
  size = 'md',
  color = 'neutral',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn('badge', `badge--${size}`, `badge--${variant}`, `badge--${color}`, className)}
      {...props}
    />
  );
}
