import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 14, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
  </Icon>
);
export const IconCursor = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 3l8 3.5-3.4 1.2L7.4 11 4 3z" />
  </Icon>
);
export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" />
  </Icon>
);
export const IconTarget = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="2" />
  </Icon>
);
export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M3 13.5c.8-2.4 2.7-3.5 5-3.5s4.2 1.1 5 3.5" />
  </Icon>
);
export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="2.2" />
    <path d="M2 13c.6-2 2-3 4-3s3.4 1 4 3M10.5 4.2a2 2 0 010 3.6M12 10.2c1 .4 1.7 1.3 2 2.8" />
  </Icon>
);
export const IconRecycle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.2 5.5L7 2.6a1.2 1.2 0 012 0l1.2 2M11.8 7.4l1.6 2.8a1.2 1.2 0 01-1 1.8H10M6 12H3.6a1.2 1.2 0 01-1-1.8L4 7.8" />
    <path d="M9.5 3.6l.7 1.7-1.8.2M10.6 13.4L9.6 12l1.4-1.1M3 6.8l1 1.4 1.4-1" />
  </Icon>
);
export const IconLayers = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.5l5.5 2.8L8 8.1 2.5 5.3 8 2.5z" />
    <path d="M2.5 8.2L8 11l5.5-2.8M2.5 11L8 13.8l5.5-2.8" />
  </Icon>
);
export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2l5 1.8v4c0 3-2.2 5.2-5 6.2-2.8-1-5-3.2-5-6.2v-4L8 2z" />
  </Icon>
);
export const IconInvoice = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 2.5h8v11l-2-1.2-2 1.2-2-1.2-2 1.2v-11z" />
    <path d="M6 6h4M6 8.5h4" />
  </Icon>
);
export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="4.2" />
    <path d="M10.2 10.2l3 3" />
  </Icon>
);
export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11V7a4 4 0 018 0v4l1 1.5H3L4 11zM6.5 13.5a1.6 1.6 0 003 0" />
  </Icon>
);
export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.8 9.6A5 5 0 016.4 3.2a5 5 0 106.4 6.4z" />
  </Icon>
);
export const IconDollar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.5v11M10.8 5c-.4-1-1.5-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.1 0 2.9 5.8 1.4 5.8 4.4 0 1.2-1.3 2.2-3 2.2-1.4 0-2.6-.7-3-1.8" />
  </Icon>
);
export const IconCheck = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.9}>
    <path d="M3.5 8.4l2.9 2.8 6-6.4" />
  </Icon>
);
export const IconX = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.9}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
  </Icon>
);
export const IconGlobe = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.5 8h11M8 2.5c1.6 1.8 2.3 3.6 2.3 5.5S9.6 11.7 8 13.5C6.4 11.7 5.7 9.9 5.7 8S6.4 4.3 8 2.5z" />
  </Icon>
);
export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.6l1.7 3.4 3.7.5-2.7 2.6.7 3.7L8 11l-3.4 1.8.7-3.7-2.7-2.6 3.7-.5L8 2.6z" />
  </Icon>
);
export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3.2l2.2 1.4" />
  </Icon>
);
export const IconWallet = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="4" width="11" height="8.5" rx="1.5" />
    <path d="M2.5 6.5h11M10.5 9.2h1" />
  </Icon>
);
export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 2L4 9h3.5L7 14l5-7H8.5L9 2z" />
  </Icon>
);
export const IconSidebar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
    <path d="M6.5 3v10" />
  </Icon>
);
