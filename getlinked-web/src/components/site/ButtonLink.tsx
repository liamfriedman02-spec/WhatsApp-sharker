import type { ReactNode } from 'react';

/** primary and outline sit on light backgrounds; white and outlineLight sit on the emerald brand surfaces. */
type Variant = 'primary' | 'outline' | 'white' | 'outlineLight';
type Size = 'sm' | 'md' | 'lg' | 'hero';

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] font-semibold tracking-[-0.005em] transition-[background-color,box-shadow,color,transform] duration-300 active:scale-[0.98] ease-out-expo';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-[0_10px_28px_-12px_rgb(11_90_66/0.7)] hover:bg-accent',
  outline: 'bg-white text-ink ring-1 ring-inset ring-line hover:ring-[#b3c4bb]',
  white: 'bg-white text-brand shadow-[0_12px_30px_-12px_rgb(2_20_14/0.55)] hover:bg-[#eef6f1]',
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
