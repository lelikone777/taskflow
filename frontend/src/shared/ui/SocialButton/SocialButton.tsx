import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type SocialButtonSize = 'sm' | 'md';

export type SocialButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: SocialButtonSize;
  icon?: ReactNode;
};

export function SocialButton({
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: SocialButtonProps) {
  return (
    <button className={cn('social-btn', `social-btn--${size}`, className)} {...props}
    type={type}>
      {icon ? <span className="social-btn__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
