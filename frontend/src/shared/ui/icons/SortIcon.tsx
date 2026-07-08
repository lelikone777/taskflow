
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function SortIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
     <g clip-path="url(#clip0_1730_15829)">
<path d="M12.042 0.708496L14.8753 3.54183L12.042 6.37516" stroke="#3380F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M2.125 7.7915V6.37484C2.125 5.62339 2.42351 4.90272 2.95486 4.37137C3.48622 3.84001 4.20689 3.5415 4.95833 3.5415H14.875" stroke="#3380F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M4.95833 16.2917L2.125 13.4583L4.95833 10.625" stroke="#3380F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M14.875 9.2085V10.6252C14.875 11.3766 14.5765 12.0973 14.0451 12.6286C13.5138 13.16 12.7931 13.4585 12.0417 13.4585H2.125" stroke="#3380F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<defs>
<clipPath id="clip0_1730_15829">
<rect width="17" height="17" fill="white"/>
</clipPath>
</defs>
</svg>
  );
}
