import type { ReactNode } from 'react';

export function SectionHeading({
  kicker,
  title,
  children,
  align = 'left',
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  align?: 'left' | 'center';
}) {
  const center = align === 'center';
  return (
    <div className={center ? 'mx-auto max-w-[46rem] text-center' : 'max-w-[46rem]'}>
      <p className="text-[0.9375rem] font-medium text-emerald">{kicker}</p>
      <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-fg [text-wrap:balance]">
        {title}
      </h2>
      {children && <p className={`mt-5 text-[1.0625rem] leading-relaxed text-slate sm:text-[1.125rem] ${center ? 'mx-auto max-w-[38rem]' : 'max-w-[38rem]'}`}>{children}</p>}
    </div>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[0.9375rem] leading-snug text-fg">
      <svg viewBox="0 0 16 16" className="mt-[3px] h-4 w-4 shrink-0 text-emerald" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
