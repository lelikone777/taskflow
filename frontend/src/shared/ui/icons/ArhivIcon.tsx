

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function ArhivIcon({ className, ...props }: IconProps) {
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
     <path d="M15.5 6C16.8807 6 18 7.11929 18 8.5V17C18 18.6569 16.6569 20 15 20H9C7.34315 20 6 18.6569 6 17L6 8.5C6 7.11929 7.11929 6 8.50001 6M10 4H14C14.8284 4 15.5 4.67157 15.5 5.5V6.5C15.5 7.32843 14.8284 8 14 8H10C9.17157 8 8.5 7.32843 8.5 6.5V5.5C8.5 4.67157 9.17157 4 10 4Z" stroke="#2A2A2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
     </svg>
  );
}
