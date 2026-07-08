import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function PaperclipIcon({ className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      width="30"
      height="29"
      viewBox="0 0 30 29"
      fill="none"
      color="#4E8EE3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <g clip-path="url(#clip0_1871_5665)">
<path d="M22.8666 13.7081L15.2082 21.3664C14.27 22.3046 12.9976 22.8317 11.6707 22.8317C10.3439 22.8317 9.07145 22.3046 8.13325 21.3664C7.19505 20.4282 6.66797 19.1558 6.66797 17.8289C6.66797 16.5021 7.19505 15.2296 8.13325 14.2914L15.7916 6.6331C16.4171 6.00763 17.2654 5.65625 18.1499 5.65625C19.0345 5.65625 19.8828 6.00763 20.5082 6.6331C21.1337 7.25857 21.4851 8.10689 21.4851 8.99144C21.4851 9.87598 21.1337 10.7243 20.5082 11.3498L12.8416 19.0081C12.5288 19.3208 12.1047 19.4965 11.6624 19.4965C11.2201 19.4965 10.796 19.3208 10.4832 19.0081C10.1705 18.6954 9.99482 18.2712 9.99482 17.8289C9.99482 17.3867 10.1705 16.9625 10.4832 16.6498L17.5582 9.5831" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
</g>
<defs>
<clipPath id="clip0_1871_5665">
<rect width="20" height="20" fill="white" transform="translate(5 4.5)"/>
</clipPath>
</defs>
</svg>
  );
}





