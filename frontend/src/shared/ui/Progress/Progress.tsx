import type { HTMLAttributes, CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';

type ProgressColor = 'success' | 'brand' | 'warning' | 'danger' | 'neutral';

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  color?: ProgressColor;
};

const colorMap: Record<ProgressColor, string> = {
  success: 'var(--color-success-500)',
  brand: 'var(--color-brand-600)',
  warning: 'var(--color-warning-500)',
  danger: 'var(--color-danger-500)',
  neutral: 'var(--color-neutral-400)',
};

export function Progress({ value, color = 'success', className, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('progress', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      style={
        {
          '--progress-value': `${clamped}%`,
          '--progress-color': colorMap[color],
        } as CSSProperties
      }
      {...props}
    >
      <div className="progress__bar" />
    </div>
  );
}
