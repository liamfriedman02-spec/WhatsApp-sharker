import type { ReactNode } from 'react';
import { HourlyBars } from '@/components/product/charts';

/**
 * Small GetLinked screens for the feature sections, styled like the real app.
 * Every figure here is sample data.
 */

function Screen({ title, crumb, aside, children, className = '' }: { title: string; crumb?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`app-ui screen overflow-hidden bg-white ${className}`}>
      <div className="flex items-center gap-3 border-b border-[var(--ui-line)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {crumb && <p className="truncate text-[10.5px] text-[var(--ui-faint)]">{crumb}</p>}
          <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">{title}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">{aside}</div>
      </div>
      {children}
    </div>
  );
}

type Tone = 'green' | 'amber' | 'red' | 'slate' | 'violet' | 'navy';
const TONES: Record<Tone, string> = {
  green: 'bg-[var(--ui-green-soft)] text-[#1f7a43]',
  amber: 'bg-[#fff4e0] text-[#a5620a]',
  red: 'bg-[#fdecec] text-[var(--ui-red)]',
  slate: 'bg-[#f0f2f6] text-[var(--ui-muted)]',
  violet: 'bg-[#efebff] text-[var(--ui-purple)]',
  navy: 'bg-[var(--ui-navy)] text-white',
};

function Pill({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

function Segmented({ items, active }: { items: string[]; active: string }) {
  return (
    <span className="hidden rounded-md bg-[var(--ui-bg)] p-0.5 text-[10.5px] text-[var(--ui-muted)] sm:flex">
      {items.map((i) => (
        <span key={i} className={`rounded px-2 py-0.5 ${i === active ? 'bg-white font-medium text-[var(--ui-text)] shadow-sm' : ''}`}>
          {i}
        </span>
      ))}
    </span>
  );
}

const th = 'px-2 py-2 text-left text-[10.5px] font-medium text-[var(--ui-faint)] first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5';
const td = 'px-2 py-2.5 text-[11.5px] first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5';

/* ---------------------------------------------------------------- Processing */

const STREAM = [
  { t: '14:09:03.412', id: 'GL-48213', geo: 'CA', to: 'Advertiser C', ms: '82 ms', status: ['Delivered', 'green'] },
  { t: '14:09:03.398', id: 'GL-48212', geo: 'UK', to: 'Advertiser F', ms: '76 ms', status: ['Delivered', 'green'] },
  { t: '14:09:03.371', id: 'GL-48211', geo: 'IT', to: 'Advertiser A', ms: '91 ms', status: ['Delivered', 'green'] },
  { t: '14:09:03.355', id: 'GL-48210', geo: 'ES', to: '—', ms: '12 ms', status: ['Duplicate', 'red'] },
  { t: '14:09:03.340', id: 'GL-48209', geo: 'NO', to: 'Advertiser D', ms: '88 ms', status: ['Recycled', 'violet'] },
  { t: '14:09:03.326', id: 'GL-48208', geo: 'IE', to: 'Advertiser K', ms: '79 ms', status: ['Delivered', 'green'] },
] as const;

export function ProcessingScreen() {
  return (
    <Screen crumb="Leads" title="Live lead stream" aside={<Pill tone="green">● Live</Pill>}>
      <div className="ui-num grid grid-cols-3 border-b border-[var(--ui-line)]">
        {[
          ['Leads per minute', '1,240'],
          ['Avg. processing', '84 ms'],
          ['In queue', '0'],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-[var(--ui-line)] px-4 py-3 last:border-0 sm:px-5">
            <p className="text-[10.5px] text-[var(--ui-faint)]">{label}</p>
            <p className="mt-0.5 text-[16px] font-semibold tracking-[-0.02em]">{value}</p>
          </div>
        ))}
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-[var(--ui-line)]">
          {STREAM.map((r) => (
            <tr key={r.id}>
              <td className={`${td} ui-mono hidden text-[var(--ui-muted)] sm:table-cell`}>{r.t}</td>
              <td className={`${td} ui-mono font-medium`}>{r.id}</td>
              <td className={td}>{r.geo}</td>
              <td className={`${td} hidden text-[var(--ui-muted)] md:table-cell`}>{r.to}</td>
              <td className={`${td} ui-mono text-right text-[var(--ui-muted)]`}>{r.ms}</td>
              <td className={`${td} text-right`}>
                <Pill tone={r.status[1]}>{r.status[0]}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Distribution */

const BUCKET = [
  { n: 1, name: 'Advertiser A', weight: '40%', used: 50, cap: 50, budget: '$4,200 left', status: ['Cap reached', 'amber'] },
  { n: 2, name: 'Advertiser B', weight: '30%', used: 31, cap: 60, budget: '$0 left', status: ['Budget used', 'amber'] },
  { n: 3, name: 'Advertiser C', weight: '20%', used: 18, cap: 40, budget: '$9,750 left', status: ['Receiving', 'green'] },
  { n: 4, name: 'Advertiser D', weight: '10%', used: 7, cap: 25, budget: '$6,100 left', status: ['Receiving', 'green'] },
  { n: 5, name: 'Advertiser E', weight: '—', used: 0, cap: 30, budget: '$3,000 left', status: ['Outside hours', 'slate'] },
] as const;

export function BucketScreen() {
  return (
    <Screen crumb="Operations › Buckets" title="CA · Finance · Tier 1" aside={<Pill tone="green">Active</Pill>}>
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--ui-line)] px-4 py-3 sm:px-5">
        {['GEO: Canada', 'Mon–Fri · 08:00–22:00', 'Priority, then weight', 'Max 2 cycles'].map((r) => (
          <span key={r} className="rounded-md border border-[var(--ui-line)] bg-[var(--ui-bg)] px-2 py-1 text-[10.5px] font-medium text-[var(--ui-muted)]">
            {r}
          </span>
        ))}
      </div>
      <table className="w-full">
        <thead className="border-b border-[var(--ui-line)] bg-[#fafbfc]">
          <tr>
            <th className={th}>#</th>
            <th className={th}>Advertiser</th>
            <th className={`${th} hidden sm:table-cell`}>Weight</th>
            <th className={th}>Today’s cap</th>
            <th className={`${th} hidden md:table-cell`}>Budget</th>
            <th className={`${th} text-right`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ui-line)]">
          {BUCKET.map((b) => (
            <tr key={b.name}>
              <td className={td}>
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--ui-bg)] text-[10px] font-semibold text-[var(--ui-muted)]">{b.n}</span>
              </td>
              <td className={`${td} whitespace-nowrap font-medium`}>{b.name}</td>
              <td className={`${td} ui-num hidden sm:table-cell`}>{b.weight}</td>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <span className="hidden h-1.5 w-20 rounded-full bg-[#eef0f5] sm:block">
                    <span
                      className={`block h-full rounded-full ${b.used >= b.cap ? 'bg-[#f0a530]' : 'bg-[var(--ui-green)]'}`}
                      style={{ width: `${(b.used / b.cap) * 100}%` }}
                    />
                  </span>
                  <span className="ui-num text-[10.5px] text-[var(--ui-muted)]">
                    {b.used}/{b.cap}
                  </span>
                </span>
              </td>
              <td className={`${td} ui-num hidden text-[var(--ui-muted)] md:table-cell`}>{b.budget}</td>
              <td className={`${td} text-right`}>
                <Pill tone={b.status[1]}>{b.status[0]}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Recycling */

function Toggle({ on = true }: { on?: boolean }) {
  return (
    <span className={`relative inline-block h-[18px] w-8 shrink-0 rounded-full ${on ? 'bg-[var(--ui-green)]' : 'bg-[#d6dae2]'}`}>
      <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow ${on ? 'left-[16px]' : 'left-[2px]'}`} />
    </span>
  );
}

function Field({ children }: { children: ReactNode }) {
  return <span className="mx-0.5 inline-flex items-center rounded-md border border-[#cfd6e3] bg-white px-1.5 py-px font-semibold text-[var(--ui-text)]">{children}</span>;
}

export function RecyclingScreen() {
  return (
    <Screen crumb="Operations › Lead Recycling" title="Unconverted Finance leads" aside={<Pill tone="violet">Recycling on</Pill>}>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <p className="rounded-lg bg-[var(--ui-bg)] px-3 py-2.5 text-[12px] leading-[1.9] text-[var(--ui-muted)]">
          If a lead has no conversion after <Field>4 hours</Field>, send it to the next eligible advertiser in{' '}
          <span className="whitespace-nowrap">
            <Field>CA · Finance · Tier 1</Field>.
          </span>
        </p>
        {[
          ['Skip advertisers that already received the lead', true],
          ['Only during each advertiser’s working hours', true],
          ['Stop after 2 cycles', true],
          ['Recycle leads marked as invalid', false],
        ].map(([label, on]) => (
          <div key={label as string} className="flex items-center justify-between gap-3 text-[12px]">
            <span>{label}</span>
            <Toggle on={on as boolean} />
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--ui-line)] px-4 py-3.5 sm:px-5">
        <p className="text-[10.5px] font-medium text-[var(--ui-faint)]">GL-48213</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <Pill tone="green">Advertiser C · 14:09</Pill>
          <span className="text-[var(--ui-faint)]">→</span>
          <Pill tone="slate">No conversion · 4h</Pill>
          <span className="text-[var(--ui-faint)]">→</span>
          <Pill tone="violet">Advertiser D · 18:09</Pill>
          <span className="text-[var(--ui-faint)]">→</span>
          <Pill tone="navy">FTD · 19:42</Pill>
        </div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Analytics */

const PARTNERS = [
  { id: 'Affiliate #214', leads: '3,511', cr: '2.1%', profit: '$24,290' },
  { id: 'Affiliate #318', leads: '2,204', cr: '1.8%', profit: '$13,610' },
  { id: 'Affiliate #102', leads: '1,019', cr: '1.6%', profit: '$5,380' },
];

export function AnalyticsScreen() {
  return (
    <Screen crumb="Overview" title="Performance" aside={<Segmented items={['Today', '7 days', '30 days']} active="Today" />}>
      <div className="ui-num grid grid-cols-2 gap-2 px-4 pt-3.5 sm:grid-cols-4 sm:px-5">
        {[
          ['Clicks', '191,589', '8.1%'],
          ['Leads', '34,855', '3.6%'],
          ['Conversions', '574', '2.2%'],
          ['Revenue', '$212,480', '9.4%'],
        ].map(([label, value, delta]) => (
          <div key={label} className="rounded-lg border border-[var(--ui-line)] px-2.5 py-2">
            <p className="text-[10.5px] text-[var(--ui-faint)]">{label}</p>
            <p className="text-[15px] font-semibold tracking-[-0.02em]">{value}</p>
            <p className="text-[9.5px] font-semibold text-[#1f7a43]">↗ {delta}</p>
          </div>
        ))}
      </div>
      <div className="px-3 pt-3 sm:px-4 [&>svg]:h-auto [&>svg]:w-full">
        <HourlyBars width={520} height={120} />
      </div>
      <table className="w-full">
        <thead className="border-y border-[var(--ui-line)] bg-[#fafbfc]">
          <tr>
            <th className={th}>Partner</th>
            <th className={`${th} text-right`}>Leads</th>
            <th className={`${th} hidden text-right sm:table-cell`}>CR</th>
            <th className={`${th} text-right`}>Profit</th>
          </tr>
        </thead>
        <tbody className="ui-num divide-y divide-[var(--ui-line)]">
          {PARTNERS.map((p) => (
            <tr key={p.id}>
              <td className={`${td} font-medium`}>{p.id}</td>
              <td className={`${td} text-right`}>{p.leads}</td>
              <td className={`${td} hidden text-right sm:table-cell`}>{p.cr}</td>
              <td className={`${td} ui-mono text-right font-semibold text-[#1f7a43]`}>{p.profit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}
