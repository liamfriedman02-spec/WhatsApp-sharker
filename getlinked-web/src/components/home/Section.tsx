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
      <p className="text-[0.9375rem] font-semibold text-bright">{kicker}</p>
      <h2 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink [text-wrap:balance]">
        {title}
      </h2>
      {children && <p className={`mt-5 text-[1.0625rem] leading-relaxed text-muted sm:text-[1.125rem] ${center ? 'mx-auto max-w-[38rem]' : 'max-w-[38rem]'}`}>{children}</p>}
    </div>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[0.9375rem] font-medium leading-snug text-ink">
      <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e6ecff] text-bright">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
