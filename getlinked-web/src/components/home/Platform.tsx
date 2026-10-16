import type { ReactNode } from 'react';
import { SectionHeading } from './Section';
import {
  AffiliatesScreen,
  AnalyticsScreen,
  BucketScreen,
  InvoiceScreen,
  MonitoringScreen,
  PostbackScreen,
  ProcessingScreen,
  RecyclingScreen,
} from './screens';

type Feature = { id: string; title: string; body: string; screen: ReactNode };

const CORE: Feature[] = [
  {
    id: 'distribution',
    title: 'Smart Lead Distribution',
    body: 'Route leads automatically based on GEO, caps, budgets, buyer availability and custom rules.',
    screen: <BucketScreen />,
  },
  {
    id: 'recycling',
    title: 'Automated Lead Recycling',
    body: 'Give unconverted leads another opportunity with scheduled redistribution and customizable recycling rules.',
    screen: <RecyclingScreen />,
  },
  {
    id: 'processing',
    title: 'High-Speed Lead Processing',
    body: 'Process and distribute high volumes of traffic with fast, automated workflows.',
    screen: <ProcessingScreen />,
  },
  {
    id: 'tracking',
    title: 'Real-Time Tracking & Analytics',
    body: 'Monitor clicks, leads, conversions, revenue and partner performance from one dashboard.',
    screen: <AnalyticsScreen />,
  },
];

const MORE: Feature[] = [
  {
    id: 'postbacks',
    title: 'Postbacks and integrations',
    body: 'Advertisers report statuses, deposits and FTDs by postback or API, matched to the original click.',
    screen: <PostbackScreen />,
  },
  {
    id: 'affiliates',
    title: 'Partner management',
    body: 'Every affiliate on their own deal: CPA, CPL, RevShare or hybrid, with users and permissions.',
    screen: <AffiliatesScreen />,
  },
  {
    id: 'finance-tools',
    title: 'Finance and invoices',
    body: 'Income, commissions and profit update as conversions land, and invoices are ready when the period closes.',
    screen: <InvoiceScreen />,
  },
  {
    id: 'monitoring',
    title: 'Lead quality and monitoring',
    body: 'Duplicate checks and quality scores stop bad leads, and alerts flag an advertiser endpoint that stops responding.',
    screen: <MonitoringScreen />,
  },
];

/** A feature card: a cropped GetLinked screen on top, the title and one line below it. */
function FeatureCard({ id, title, body, screen, compact = false }: Feature & { compact?: boolean }) {
  return (
    <article id={id} className="flex scroll-mt-28 flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#e9effb_0%,#f5f7fc_70%)] ring-1 ring-inset ring-line">
      <div
        className={`relative min-w-0 overflow-hidden px-5 pt-5 [mask-image:linear-gradient(180deg,#000_70%,transparent)] sm:px-8 sm:pt-8 ${
          compact ? 'h-[230px] sm:h-[250px]' : 'h-[270px] sm:h-[330px]'
        }`}
      >
        {screen}
      </div>
      <div className={compact ? 'px-6 pb-6 sm:px-8 sm:pb-7' : 'px-6 pb-7 pt-1 sm:px-8 sm:pb-9'}>
        <h3 className={`font-display font-semibold tracking-[-0.025em] text-ink ${compact ? 'text-[1.25rem]' : 'text-[1.5rem] sm:text-[1.625rem]'}`}>{title}</h3>
        <p className="mt-2 max-w-[30rem] text-[1rem] leading-relaxed text-muted">{body}</p>
      </div>
    </article>
  );
}

/** The complete affiliate management platform: the core four, then the rest of the operation. */
export function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-line bg-white py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading kicker="Platform" title="Everything You Need to Run Your Affiliate Network.">
          From intelligent lead distribution to automated recycling, real-time tracking, and financial management. GetLinked
          brings your entire operation together in one powerful platform.
        </SectionHeading>

        <div className="mt-14 grid gap-5 sm:mt-16 md:grid-cols-2">
          {CORE.map((f) => (
            <FeatureCard key={f.id} {...f} />
          ))}
        </div>

        <h3 className="mt-20 font-display text-[1.5rem] font-semibold tracking-[-0.025em] text-ink sm:mt-24">The rest of your operation, built in.</h3>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {MORE.map((f) => (
            <FeatureCard key={f.id} {...f} compact />
          ))}
        </div>
        <p className="mt-6 text-[0.8125rem] text-faint">Product screens show sample data.</p>
      </div>
    </section>
  );
}
