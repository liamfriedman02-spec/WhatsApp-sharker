import type { ReactNode } from 'react';

const NUMBERS = [
  { value: '300+', label: 'Networks trust GetLinked' },
  { value: '200+', label: 'Powerful features' },
  { value: '24/7', label: 'Real-time tracking' },
];

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const REASONS = [
  {
    title: 'Route every lead',
    body: 'Buckets send each lead to the advertiser that can take it, by GEO, caps, budget and working hours.',
    icon: icon(
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="8" r="2.5" />
        <path d="M6 8.5v7M18 10.5c0 4-6 3-11 6" />
      </>,
    ),
  },
  {
    title: 'Recycle what didn’t convert',
    body: 'Unconverted leads go to the next eligible advertiser on their own, so less of your traffic goes to waste.',
    icon: icon(
      <>
        <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
        <path d="M4 3.5V8h4.5" />
        <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
        <path d="M20 20.5V16h-4.5" />
      </>,
    ),
  },
  {
    title: 'See profit live',
    body: 'Clicks, conversions, commissions and profit update in real time, per affiliate, offer and country.',
    icon: icon(
      <>
        <path d="M4 20h16" />
        <path d="M6 16l4.5-5 3.5 3 5-6.5" />
        <path d="M15 7.5h4v4" />
      </>,
    ),
  },
];

/** Right under the dashboard: the numbers, then three reasons to choose GetLinked. */
export function WhyGetLinked() {
  return (
    <section id="why" className="scroll-mt-20 pb-20 pt-6 sm:pb-28 sm:pt-10">
      <div className="container-page">
        <div className="rounded-[32px] bg-white px-6 py-12 text-center shadow-[0_40px_80px_-50px_rgb(14_34_95/0.35)] ring-1 ring-inset ring-line sm:px-12 sm:py-16">
          <p className="text-[0.9375rem] font-semibold text-bright">Why GetLinked</p>
          <h2 className="mx-auto mt-3 max-w-[22ch] font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink [text-wrap:balance]">
            Why networks choose GetLinked.
          </h2>
          <dl className="mt-10 grid divide-y divide-line sm:mt-14 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {NUMBERS.map((n) => (
              <div key={n.label} className="flex flex-col-reverse items-center gap-2 py-7 first:pt-0 last:pb-0 sm:px-6 sm:py-0">
                <dt className="text-[1rem] font-medium text-muted sm:text-[1.0625rem]">{n.label}</dt>
                <dd className="bg-[linear-gradient(180deg,var(--color-royal),var(--color-bright))] bg-clip-text font-display text-[clamp(3.25rem,7vw,5.25rem)] font-semibold leading-none tracking-[-0.045em] text-transparent tabular-nums">
                  {n.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 grid gap-10 sm:mt-16 md:grid-cols-3 md:gap-8">
          {REASONS.map((r) => (
            <div key={r.title} className="max-w-[24rem]">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#e6ecff] text-bright">{r.icon}</span>
              <h3 className="mt-5 font-display text-[1.375rem] font-semibold tracking-[-0.025em] text-ink">{r.title}</h3>
              <p className="mt-2 text-[1rem] leading-relaxed text-muted">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
