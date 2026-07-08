import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: SpinnerSize;
  progress?: number;
};

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};
const RAYS_COUNT = 8;

export function Spinner({ size = 'md', progress = 0, className, ...props }: SpinnerProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const activeRays = Math.round((clamped / 100) * RAYS_COUNT);

  return (
    <span className={cn('spinner-progress', sizeMap[size], className)} aria-hidden="true" {...props}>
      {Array.from({ length: RAYS_COUNT }).map((_, i) => (
        <span
          key={i}
          className={cn('spinner-progress__ray', i < activeRays ? 'spinner-progress__ray--active' : 'spinner-progress__ray--idle')}
          style={{
            transform: `translate(-50%, -50%) rotate(${i * (360 / RAYS_COUNT)}deg) translateY(-8px)`,
          }}
        />
      ))}
    </span>
  );
}
  



