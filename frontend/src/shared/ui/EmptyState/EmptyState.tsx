import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn('empty', className)} {...props}>
      {icon ? <div className="empty__icon">{icon}</div> : null}
      <div className="empty__title">{title}</div>
      {description ? <div className="empty__description">{description}</div> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
