import type { SVGProps } from 'react';

const P: Record<string, JSX.Element> = {
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M4 11l8-7 8 7v9H4z" />,
  ranking: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bookmark: <path d="M6 4h12v16l-6-4-6 4z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  down: <path d="M6 9l6 6 6-6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
    </>
  ),
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  thumb: <path d="M7 11v9H4v-9h3zm0 0l4-7a2 2 0 012 2v3h5a2 2 0 012 2l-1.5 7a2 2 0 01-2 1.5H7" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  file: <path d="M7 3h7l4 4v14H7zM14 3v4h4" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 20,
  stroke = 1.8,
  filled = false,
  ...rest
}: { name: IconName | string; size?: number; stroke?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, 'stroke'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
