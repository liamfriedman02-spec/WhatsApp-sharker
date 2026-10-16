import { LeadTrack } from './LeadTrack';
import { SectionHeading } from './Section';

const FEATURES = [
  ['Tracking', '#tracking'],
  ['Lead processing', '#processing'],
  ['Lead distribution', '#distribution'],
  ['Caps and budgets', '#distribution'],
  ['Lead Recycling', '#recycling'],
  ['Postbacks', '#postbacks'],
  ['Commissions and profit', '#finance-tools'],
] as const;

export function Journey() {
  return (
    <section id="journey" className="scroll-mt-20 pb-20 pt-12 sm:pb-28 sm:pt-16">
      <div className="container-page">
        <SectionHeading kicker="How it works" title="One lead, from click to profit.">
          A click from Affiliate #214 becomes a lead, skips two advertisers that can’t take it, gets recycled when the first
          buyer doesn’t convert, and ends as an FTD with commission and profit worked out.
        </SectionHeading>
        <LeadTrack />
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[0.875rem] text-faint">In this journey:</span>
          {FEATURES.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-muted ring-1 ring-inset ring-line transition-colors hover:text-royal hover:ring-[#b6c1d6]"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
