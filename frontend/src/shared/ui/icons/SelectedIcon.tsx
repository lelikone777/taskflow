import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function SelectedIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="13"
      viewBox="0 0 18 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M17 1L7.41421 10.5858C6.63317 11.3668 5.36683 11.3668 4.58579 10.5858L1 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
