import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type AvatarSize = 'xs' | 'sm' | 'md';

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  size?: AvatarSize;
  src?: string;
  alt?: string;
  fallback?: ReactNode;
};

export function Avatar({
  size = 'md',
  src,
  alt = 'Avatar',
  fallback,
  className,
  ...props
}: AvatarProps) {
  return (
    <div className={cn('avatar', `avatar--${size}`, className)} {...props}>
      {src ? <img src={src} alt={alt} /> : fallback}
    </div>
  );
}
