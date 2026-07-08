import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

type SkeletonVariant = 'line' | 'circle' | 'card';
type SkeletonTone = 'default' | 'muted';
type SkeletonSize = 'sm' | 'md' | 'lg';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
  tone?: SkeletonTone;
  size?: SkeletonSize;
};

const sizeMap: Record<SkeletonSize, string> = {
  sm: 'skeleton--sm',
  md: '',
  lg: 'skeleton--lg',
};

export function Skeleton({
  variant = 'line',
  tone = 'default',
  size = 'md',
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        `skeleton--${variant}`,
        sizeMap[size],
        tone === 'muted' && 'skeleton--muted',
        className,
      )}
      {...props}
    />
  );
}
