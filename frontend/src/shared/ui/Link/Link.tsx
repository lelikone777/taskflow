import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type LinkVariant = 'grey' | 'black' | 'accent' | 'error' | 'multi';

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: LinkVariant;
  icon?: ReactNode;
};

export function Link({
  variant = 'accent',
  icon,
  className,
  children,
  ...props
}: LinkProps) {
  return (
    <a className={cn('link', `link--${variant}`, className)} {...props}>
      {icon ? <span className="link__icon">{icon}</span> : null}
      <span>{children}</span>
    </a>
  );
}
