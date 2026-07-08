import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';
import { Button } from '../Button';
import { GoogleIcon, GitLabIcon } from '../icons';

export type AuthProvider = 'google' | 'gitlab';

export type AuthButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  provider: AuthProvider;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const providerConfig = {
  google: {
    label: 'Войти через Google',
    icon: GoogleIcon,
  },
  gitlab: {
    label: 'Войти через GitLab',
    icon: GitLabIcon,
  },
} as const;

export function AuthButton({
  provider,
  fullWidth = false,
  size = 'md',
  className,
  ...props
}: AuthButtonProps) {
  const { label, icon: Icon } = providerConfig[provider];

  return (
    <Button
      variant="outlined"
      size={size}
      fullWidth={fullWidth}
      className={cn('auth-btn', className)}
      {...props}
    >
      <Icon className="auth-btn__icon" />
      <span>{label}</span>
    </Button>
  );
}
