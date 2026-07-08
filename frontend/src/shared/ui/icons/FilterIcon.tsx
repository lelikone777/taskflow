import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function FilterIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="23"
      viewBox="0 0 24 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M6 2L6 10M6 13V21M6 13H9M6 13H3M12 21V13M12 10V2M12 10H15M12 10H9M18 2V10M18 13V21M18 13H21M18 13H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
