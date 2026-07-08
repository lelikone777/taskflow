

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function AddImageIcon({ className, ...props }: IconProps) {
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
            <path d="M12.9998 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V12.9998L16 8.99979L9 15.9998M4 15.9998L8 11.9998L10.5 14.4998M15.1716 17.5858H20M17.5858 20V15.1716M12 8.5C12 9.32843 11.3284 10 10.5 10C9.67157 10 9 9.32843 9 8.5C9 7.67157 9.67157 7 10.5 7C11.3284 7 12 7.67157 12 8.5Z" stroke="CurrentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
