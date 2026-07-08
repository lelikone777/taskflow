import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function DownloadIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 4V13.3333M12 13.3333L8 9.33333M12 13.3333L16 9.33333M5 16.6667V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V16.6667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
