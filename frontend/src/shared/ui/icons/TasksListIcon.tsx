
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function TasksListIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
    <path d="M7.72334 9.91667H14.5059M7.72334 14.9167H14.5059M7.72334 19.9167H14.5059M19.5929 8.03125L17.5611 10.0283C17.3956 10.191 17.1272 10.191 16.9616 10.0283L16.2016 9.28125M19.5929 13.0312L17.5611 15.0283C17.3956 15.191 17.1272 15.191 16.9616 15.0283L16.2016 14.2812M19.5929 18.0312L17.5611 20.0283C17.3956 20.191 17.1272 20.191 16.9616 20.0283L16.2016 19.2812M4.33203 4.91667V21.5833C4.33203 22.5038 5.0912 23.25 6.02768 23.25H20.4407C21.3772 23.25 22.1364 22.5038 22.1364 21.5833V8.35221C22.1364 7.88188 21.9342 7.43345 21.5797 7.11753L17.7249 3.68198C17.413 3.40398 17.007 3.25 16.5859 3.25H6.02768C5.0912 3.25 4.33203 3.99619 4.33203 4.91667Z" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

