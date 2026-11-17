import React from "react"

const PATHS = {
    play: (
        <>
            <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
            <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
            <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
            <path d="M16.75 4.5v5M14.25 7h5" />
        </>
    ),
    stats: <path d="M5 20V12M10 20V6M15 20v-9M20 20V9" />,
    how: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.6" />
            <path d="M12 17.2v.1" />
        </>
    ),
    restart: (
        <>
            <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
            <path d="M4 4v4.5h4.5" />
        </>
    ),
    share: (
        <>
            <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
            <path d="M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5" />
        </>
    ),
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    sound: (
        <>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
    ),
    mute: (
        <>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            <path d="m16 9.5 5 5M21 9.5l-5 5" />
        </>
    ),
}

export default function Icon({ name, size = 22 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            aria-hidden="true"
        >
            {PATHS[name]}
        </svg>
    )
}
