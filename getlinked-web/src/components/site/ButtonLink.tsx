import type { ReactNode } from 'react';

type Variant = 'primary' | 'glass';
type Size = 'sm' | 'md' | 'lg' | 'hero';

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium tracking-[-0.005em] transition-[background-color,box-shadow,color] duration-300 ease-out-expo';

const variants: Record<Variant, string> = {
  primary:
    'bg-emerald text-ink-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-12px_rgb(25_190_143/0.7)] hover:bg-emerald-hi hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_14px_40px_-12px_rgb(25_190_143/0.9)]',
  glass:
    'bg-white/[0.045] text-fg ring-1 ring-inset ring-white/[0.12] backdrop-blur-md hover:bg-white/[0.08] hover:ring-white/[0.2]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[0.875rem]',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-[52px] px-6 text-base',
  hero: 'h-12 px-5 text-[0.95rem] sm:h-[52px] sm:px-6 sm:text-base',
};

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </a>
  );
}
