import { LeadJourney } from './LeadJourney';
import { SectionHeading } from './Section';

const FEATURES = [
  ['Tracking', '#tracking'],
  ['Lead distribution', '#distribution'],
  ['Caps and budgets', '#distribution'],
  ['Lead Recycling', '#recycling'],
  ['Postbacks', '#postbacks'],
  ['Commissions and profit', '#finance'],
] as const;

export function Journey() {
  return (
    <section id="journey" className="scroll-mt-20 py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading kicker="How it works" title="Follow one lead through GetLinked.">
          A click from Affiliate #214 becomes a lead, skips two advertisers that can’t take it, gets recycled when the first
          buyer doesn’t convert, and ends as an FTD with commission and profit worked out.
        </SectionHeading>
        <div className="mt-12 sm:mt-14">
          <LeadJourney />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[0.875rem] text-slate-dim">In this journey:</span>
          {FEATURES.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-full border border-line px-3 py-1.5 text-[0.8125rem] text-slate transition-colors hover:border-white/20 hover:text-fg"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
