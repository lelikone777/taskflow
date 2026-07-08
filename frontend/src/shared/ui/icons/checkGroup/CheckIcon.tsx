import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function CheckIcon({ className, ...props }: IconProps) {
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
      <path d="M19.2 8.40039L12 15.6004C11.2971 16.3033 10.5728 16.5732 9.6 15.6004L6 12.0004" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
