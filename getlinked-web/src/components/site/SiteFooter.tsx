import { DEMO_URL } from './links';
import { Logo } from './Logo';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      ['Tracking', '#tracking'],
      ['Lead distribution', '#distribution'],
      ['Lead Recycling', '#recycling'],
      ['Postbacks', '#postbacks'],
      ['Reports', '#reports'],
    ],
  },
  {
    title: 'Solutions',
    links: [
      ['Finance', '#finance'],
      ['iGaming', '#igaming'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['Questions', '#resources'],
      ['Book a Demo', DEMO_URL],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Logo className="h-7" />
          <p className="mt-5 max-w-[22rem] text-[0.9375rem] leading-relaxed text-slate">
            Affiliate tracking, lead distribution and network management for Finance and iGaming.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[0.875rem] font-medium text-fg">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-[0.9375rem] text-slate transition-colors hover:text-fg">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-[0.8125rem] text-slate-dim sm:flex-row">
        <p>© {new Date().getFullYear()} GetLinked</p>
        <p className="sm:ml-auto">Product screens show sample data.</p>
      </div>
    </footer>
  );
}
