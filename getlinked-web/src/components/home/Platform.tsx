import type { ReactNode } from 'react';
import { CheckItem, SectionHeading } from './Section';
import { AffiliatesScreen, BucketScreen, ClicksScreen, DrillDownScreen, InvoiceScreen, MonitoringScreen, PostbackScreen, RecyclingScreen } from './screens';

const CORE = [
  {
    id: 'tracking',
    kicker: 'Tracking',
    title: 'Every click, lead and conversion, tied to its source.',
    body: 'GetLinked records each click the moment it lands and keeps it attached to the lead and conversion it becomes. You always know which affiliate, offer, sub ID, country and device a result came from.',
    points: ['Click, lead and conversion tracking', 'Sub IDs and click IDs', 'Postbacks and pixels', 'FTD and deposit tracking'],
    screen: <ClicksScreen />,
  },
  {
    id: 'distribution',
    kicker: 'Lead distribution',
    title: 'Each lead goes to the advertiser that can take it.',
    body: 'Buckets hold your routing rules. For every lead, GetLinked checks advertisers in priority order against GEO, working hours, caps and budget, skips the ones that can’t accept it, and delivers to the first one that can.',
    points: ['Buckets by GEO and offer', 'Priority and weighted rotation', 'Daily and total caps', 'Budgets and working hours'],
    screen: <BucketScreen />,
  },
  {
    id: 'recycling',
    kicker: 'Lead Recycling',
    title: 'Leads that don’t convert get a second chance.',
    body: 'When an advertiser doesn’t convert a lead within the time you set, Lead Recycling sends it to the next eligible advertiser, skipping anyone who already had it. You decide the delay and how many cycles a lead can go through.',
    points: ['Time-based recycling rules', 'Skips previous advertisers', 'Cycle limits', 'Respects working hours'],
    screen: <RecyclingScreen />,
  },
  {
    id: 'postbacks',
    kicker: 'Postbacks and integrations',
    title: 'Statuses and FTDs come back on their own.',
    body: 'Advertisers report lead statuses, deposits and FTDs by postback or API. GetLinked matches each one to the original click, updates reports instantly and fires your outgoing postbacks to affiliates.',
    points: ['Incoming and outgoing postbacks', 'Advertiser API integrations', 'Status mapping', 'Delivery log for every call'],
    screen: <PostbackScreen />,
  },
];

const MORE = [
  {
    id: 'reports',
    title: 'Reports and drill-down',
    body: 'Go from network totals to one affiliate, one offer and one country in a few clicks. Clicks, leads, conversion rate, FTDs, EPC and profit side by side.',
    screen: <DrillDownScreen />,
  },
  {
    id: 'affiliates',
    title: 'Affiliates and payouts',
    body: 'Run every partner from one place, each on their own deal: CPA, CPL, RevShare or hybrid. Users and permissions control who sees what.',
    screen: <AffiliatesScreen />,
  },
  {
    id: 'finance-tools',
    title: 'Finance and invoices',
    body: 'Income, commissions and profit are calculated as conversions land, so balances stay current and invoices are ready when the period closes.',
    screen: <InvoiceScreen />,
  },
  {
    id: 'monitoring',
    title: 'Lead quality and monitoring',
    body: 'Duplicate checks and lead quality scores stop bad leads early, and system alerts tell you when an advertiser endpoint stops responding.',
    screen: <MonitoringScreen />,
  },
];

function FeatureRow({ id, kicker, title, body, points, screen, flip }: (typeof CORE)[number] & { flip: boolean; screen: ReactNode }) {
  return (
    <div id={id} className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
      <div className={flip ? 'lg:order-2' : ''}>
        <p className="text-[0.9375rem] font-semibold text-bright">{kicker}</p>
        <h3 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.375rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink [text-wrap:balance]">{title}</h3>
        <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-muted">{body}</p>
        <ul className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {points.map((p) => (
            <CheckItem key={p}>{p}</CheckItem>
          ))}
        </ul>
      </div>
      <div className={`min-w-0 ${flip ? 'lg:order-1' : ''}`}>{screen}</div>
    </div>
  );
}

/** Every part of the platform, from the first click to the invoice. */
export function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-line bg-white py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading kicker="Platform" title="Everything a lead touches, in one system.">
          Tracking, distribution, recycling, postbacks, reporting and payouts run on the same data. Every number you see
          traces back to a real click.
        </SectionHeading>

        <div className="mt-20 space-y-24 sm:mt-24 sm:space-y-32">
          {CORE.map((f, i) => (
            <FeatureRow key={f.id} {...f} flip={i % 2 === 1} />
          ))}
        </div>

        <div className="mt-28 sm:mt-36">
          <h3 className="max-w-[40rem] font-display text-[clamp(1.75rem,3vw,2.375rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink [text-wrap:balance]">
            And everything you need to run the network around it.
          </h3>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {MORE.map((m) => (
              <article key={m.id} id={m.id} className="flex scroll-mt-28 flex-col rounded-[28px] bg-paper p-5 ring-1 ring-inset ring-line sm:p-7">
                <div className="min-w-0 flex-1">{m.screen}</div>
                <h4 className="mt-7 font-display text-[1.375rem] font-semibold tracking-[-0.02em] text-ink">{m.title}</h4>
                <p className="mt-2 max-w-[32rem] text-[1rem] leading-relaxed text-muted">{m.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-[0.8125rem] text-faint">Product screens show sample data.</p>
        </div>
      </div>
    </section>
  );
}
