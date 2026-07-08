import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function FilterMenuArrowIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="8"
      height="14"
      viewBox="0 0 8 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0.75 12.75L6.43539 7.45711C6.85487 7.06658 6.85487 6.43342 6.43539 6.04289L0.750002 0.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
