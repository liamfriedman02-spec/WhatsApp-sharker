import type { ReactNode } from 'react';
import { DEMO_URL } from '@/components/site/links';
import { SectionHeading } from './Section';

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

/** Twelve of the platform's features. Ids are anchors used by the footer. */
const FEATURES: { id?: string; title: string; body: string; icon: ReactNode }[] = [
  {
    id: 'distribution',
    title: 'Lead routing',
    body: 'Send each lead to the right buyer by GEO, offer and custom rules.',
    icon: icon(
      <>
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="8" r="2.4" />
        <path d="M6 8.4v7.2M18 10.4c0 4-6 3-10.6 6" />
      </>,
    ),
  },
  {
    id: 'recycling',
    title: 'Lead Recycling',
    body: 'Unconverted leads go to the next eligible buyer on a schedule you set.',
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
    id: 'processing',
    title: 'Lead injection',
    body: 'Push high volumes of leads to buyers quickly and reliably.',
    icon: icon(<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />),
  },
  {
    title: 'Caps and budgets',
    body: 'Daily and total caps and budgets for every advertiser.',
    icon: icon(
      <>
        <path d="M4 18a8 8 0 1 1 16 0" />
        <path d="M12 18l4-5" />
        <circle cx="12" cy="18" r="1.2" fill="currentColor" />
      </>,
    ),
  },
  {
    title: 'Schedules',
    body: 'Deliver leads only during each buyer’s working hours.',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>,
    ),
  },
  {
    title: 'Postbacks',
    body: 'Incoming and outgoing postbacks, matched to every click.',
    icon: icon(
      <>
        <path d="M4 8h13l-3.5-3.5" />
        <path d="M20 16H7l3.5 3.5" />
      </>,
    ),
  },
  {
    title: 'Partner management',
    body: 'Affiliates, advertisers and offers, all in one place.',
    icon: icon(
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 13.8A5.5 5.5 0 0 1 20.5 19" />
      </>,
    ),
  },
  {
    title: 'Payouts',
    body: 'CPA, CPL, RevShare and hybrid deals, calculated automatically.',
    icon: icon(
      <>
        <rect x="3" y="6" width="18" height="13" rx="3" />
        <path d="M3 10h18M16 14.5h1.5" />
      </>,
    ),
  },
  {
    title: 'Invoices',
    body: 'Built from real conversions and ready when the period closes.',
    icon: icon(
      <>
        <path d="M6 3h9l3 3v15l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5z" />
        <path d="M9 9h6M9 13h6" />
      </>,
    ),
  },
  {
    id: 'tracking',
    title: 'Real-time analytics',
    body: 'Clicks, leads, conversions, revenue and profit, as they happen.',
    icon: icon(
      <>
        <path d="M4 20h16" />
        <path d="M7 16v-4M12 16V8M17 16v-6" />
      </>,
    ),
  },
  {
    title: 'Users and permissions',
    body: 'Decide who on your team can see and change what.',
    icon: icon(<path d="M12 3l7 2.6v5.2c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V5.6z" />),
  },
  {
    title: 'Lead quality',
    body: 'Duplicate checks and quality scores before a lead reaches a buyer.',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
      </>,
    ),
  },
];

/** The complete affiliate management platform, as a wall of features. */
export function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-line bg-white py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading kicker="Platform" title="Everything You Need to Run Your Affiliate Network.">
          From intelligent lead distribution to automated recycling, real-time tracking, and financial management. GetLinked
          brings your entire operation together in one powerful platform.
        </SectionHeading>

        <div className="mt-14 overflow-hidden rounded-[28px] ring-1 ring-line sm:mt-16">
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li key={f.title} id={f.id} className="group scroll-mt-28 bg-white transition-colors duration-300 hover:bg-paper">
                <div data-reveal className="flex gap-4 px-5 py-5 sm:block sm:p-7">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-tint text-accent transition-[background-color,color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:bg-brand group-hover:text-white">
                    {f.icon}
                  </span>
                  <span className="block min-w-0">
                    <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink sm:mt-5">{f.title}</h3>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted sm:mt-1.5">{f.body}</p>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 border-t border-line bg-paper px-6 py-6 sm:flex-row sm:items-center sm:px-7">
            <p className="text-[1rem] text-ink">
              <span data-count="200" data-suffix="+" className="font-display text-[1.25rem] font-semibold tracking-[-0.02em] text-brand tabular-nums">200+</span>
              <span className="ml-2 font-medium">features in total, built for Finance and iGaming.</span>
            </p>
            <a
              href={DEMO_URL}
              className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-brand transition-colors hover:text-accent sm:ml-auto"
            >
              See them all in a demo
              <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
