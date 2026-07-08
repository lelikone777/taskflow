import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function ChevronLeftIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="39"
      height="24"
      viewBox="0 0 39 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M28 12.5H5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M12 19L5 12L12 5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
  );
}


