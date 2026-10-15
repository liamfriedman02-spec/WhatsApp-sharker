import type { ReactNode } from 'react';

/** primary and outline sit on light backgrounds; white and outlineLight sit on the brand blue. */
type Variant = 'primary' | 'outline' | 'white' | 'outlineLight';
type Size = 'sm' | 'md' | 'lg' | 'hero';

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] font-semibold tracking-[-0.005em] transition-[background-color,box-shadow,color] duration-300 ease-out-expo';

const variants: Record<Variant, string> = {
  primary: 'bg-royal text-white shadow-[0_10px_28px_-12px_rgb(28_63_166/0.7)] hover:bg-bright',
  outline: 'bg-white text-ink ring-1 ring-inset ring-line hover:ring-[#b6c1d6]',
  white: 'bg-white text-royal shadow-[0_12px_30px_-12px_rgb(3_10_40/0.55)] hover:bg-[#eef3ff]',
  outlineLight: 'text-white ring-[1.5px] ring-inset ring-white/50 hover:bg-white/10 hover:ring-white/80',
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
