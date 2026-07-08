import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function DotIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      {...props}
    >
      <circle cx="12" cy="12" r="11.5" />
    </svg>
  );
}
