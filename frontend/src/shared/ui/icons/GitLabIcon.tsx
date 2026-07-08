import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function GitLabIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path d="M8.00065 14.3334L5.33398 6.66675H10.6673L8.00065 14.3334Z" fill="#E53935" />
      <path d="M8 14.3334L14 6.66675H10.6667L8 14.3334Z" fill="#FF7043" />
      <path d="M12.3327 1.66675L13.9993 6.66675H10.666L12.3327 1.66675Z" fill="#E53935" />
      <path d="M8 14.3334L14 6.66675L15 9.33341L8 14.3334Z" fill="#FFA726" />
      <path d="M8 14.3334L2 6.66675H5.33333L8 14.3334Z" fill="#FF7043" />
      <path d="M3.66667 1.66675L2 6.66675H5.33333L3.66667 1.66675Z" fill="#E53935" />
      <path d="M8 14.3334L2 6.66675L1 9.33341L8 14.3334Z" fill="#FFA726" />
    </svg>
  );
}