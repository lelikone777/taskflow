import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function DeleteIcon({ className, ...props }: IconProps) {
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
      <path d="M9.99963 11.5L10.4441 16.1667M13.9996 11.5L13.5552 16.1667M4.34961 7.92453H6.16088M6.16088 7.92453C10.8766 7.92453 19.6334 7.92453 19.6334 7.92453M6.16088 7.92453L6.80569 17.2079C6.91491 18.7803 8.2223 20 9.79848 20H14.2229C15.79 20 17.093 18.7939 17.214 17.2316L17.9345 7.92453C17.9345 7.92453 10.2872 7.92453 6.16088 7.92453ZM8.87791 7.92453V6C8.87791 4.89543 9.77334 4 10.8779 4H13.2175C14.3221 4 15.2175 4.89543 15.2175 6V7.92453" stroke="#2A2A2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
  );
}






