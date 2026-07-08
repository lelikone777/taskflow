import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function CheckIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="12" fill="#9FE3CD" stroke='#9FE3CD'/>
<path d="M19.2 8.3999L12 15.5999C11.2971 16.3028 10.5728 16.5727 9.6 15.5999L6 11.9999" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
  );
}

