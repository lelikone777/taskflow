import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type DividerProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

export function Divider({ label, className, ...props }: DividerProps) {
  if (!label) {
    return <div className={cn('divider', 'divider--line', className)} role="separator" {...props} />;
  }

  return (
    <div className={cn('divider', className)} role="separator" {...props}>
      <span className="divider__text">{label}</span>
    </div>
  );
}
