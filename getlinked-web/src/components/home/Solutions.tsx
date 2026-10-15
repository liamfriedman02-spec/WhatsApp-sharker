import { CheckItem, SectionHeading } from './Section';

const VERTICALS = [
  {
    id: 'finance',
    name: 'Finance',
    title: 'For finance networks and brands',
    body: 'Crypto, investing and trading offers live on lead quality and timing. Route each lead by GEO and working hours, cap advertisers per day, and give unconverted leads a second buyer.',
    tags: ['Crypto', 'Investing', 'Trading'],
    points: ['GEO and schedule routing', 'Daily caps per advertiser', 'FTD and deposit tracking', 'Lead Recycling'],
    glow: 'rgb(57 119 232 / 0.28)',
  },
  {
    id: 'igaming',
    name: 'iGaming',
    title: 'For casino and sportsbook programs',
    body: 'Track players from the first click to their first deposit, pay every affiliate on the deal you agreed, and see which partners and countries actually make you money.',
    tags: ['Casino', 'Sportsbook'],
    points: ['CPA, RevShare and hybrid deals', 'FTD tracking by postback', 'Affiliate and sub ID reports', 'Profit per affiliate and country'],
    glow: 'rgb(25 190 143 / 0.24)',
  },
];

export function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 border-t border-line py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading kicker="Solutions" title="Built for the two industries we know best." />
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {VERTICALS.map((v) => (
            <article
              key={v.id}
              id={v.id}
              className="relative scroll-mt-28 overflow-hidden rounded-[28px] border border-line bg-ink-900/50 p-7 sm:p-10"
            >
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: v.glow }} />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-fg">{v.name}</span>
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    {v.tags.map((t) => (
                      <span key={t} className="rounded-full border border-line px-2.5 py-1 text-[0.75rem] text-slate">
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
                <h3 className="mt-6 text-[1.25rem] font-semibold tracking-[-0.015em] text-fg">{v.title}</h3>
                <p className="mt-3 max-w-[32rem] text-[1rem] leading-relaxed text-slate">{v.body}</p>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {v.points.map((p) => (
                    <CheckItem key={p}>{p}</CheckItem>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
