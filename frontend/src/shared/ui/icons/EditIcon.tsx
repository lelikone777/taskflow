import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function EditIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M11 19.0488H19"
        stroke="#A0A0A0"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 4.38236C15.3536 4.02874 15.8332 3.83008 16.3333 3.83008C16.581 3.83008 16.8262 3.87885 17.0549 3.97361C17.2837 4.06837 17.4916 4.20727 17.6667 4.38236C17.8418 4.55746 17.9807 4.76533 18.0754 4.9941C18.1702 5.22287 18.219 5.46807 18.219 5.7157C18.219 5.96332 18.1702 6.20852 18.0754 6.43729C17.9807 6.66606 17.8418 6.87393 17.6667 7.04903L6.55556 18.1601L3 19.049L3.88889 15.4935L15 4.38236Z"
        stroke="#A0A0A0"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
