import { SectionHeading } from './Section';

const QUESTIONS = [
  {
    q: 'What is GetLinked?',
    a: 'GetLinked is a platform for affiliate tracking, lead distribution and network management. It tracks clicks, leads and conversions, routes each lead to the right advertiser, and calculates commissions and profit.',
  },
  {
    q: 'Who is it for?',
    a: 'Affiliate networks, lead distributors, brands and media buyers working in Finance and iGaming.',
  },
  {
    q: 'How does lead distribution work?',
    a: 'You group advertisers into buckets with rules for GEO, working hours, priority, weights, caps and budgets. For each lead, GetLinked checks advertisers in order and delivers to the first one that can accept it.',
  },
  {
    q: 'What happens to leads that don’t convert?',
    a: 'With Lead Recycling, a lead that isn’t converted within the time you choose is sent to the next eligible advertiser. Advertisers that already received it are skipped, and you set the maximum number of cycles.',
  },
  {
    q: 'How do conversions and FTDs get into GetLinked?',
    a: 'Advertisers send statuses, deposits and FTDs by postback or API. Each one is matched to its original click, and your outgoing postbacks to affiliates fire automatically.',
  },
  {
    q: 'Can I see profit per affiliate, offer or country?',
    a: 'Yes. Reports show clicks, leads, conversions, EPC and profit, and you can drill down from the whole network to a single affiliate, offer and country.',
  },
  {
    q: 'How do we get started?',
    a: 'Book a demo. We’ll walk through how your affiliates, advertisers and routing rules would run in GetLinked.',
  },
];

export function Faq() {
  return (
    <section id="resources" className="scroll-mt-20 border-t border-line bg-white py-24 sm:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <SectionHeading kicker="Questions" title="What teams ask before they switch." />
        <div className="divide-y divide-line border-y border-line">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-[1.0625rem] font-semibold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg viewBox="0 0 16 16" className="ml-auto h-4 w-4 shrink-0 text-accent transition-transform duration-300 group-open:rotate-45" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </summary>
              <p className="max-w-[40rem] pb-6 pr-8 text-[1rem] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
