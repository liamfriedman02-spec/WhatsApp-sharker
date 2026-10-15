import type { ReactNode } from 'react';

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

/* ---------------------------------------------------------------- Tracking */

const CLICKS = [
  { t: '14:09:02', id: '9f3a71c2', aff: '#214', sub: 'fb_cmp_17', geo: 'CA', dev: 'iOS', status: ['Lead', 'green'] },
  { t: '14:09:01', id: '4be20d17', aff: '#318', sub: 'gg_brand_04', geo: 'UK', dev: 'Android', status: ['Click', 'slate'] },
  { t: '14:08:58', id: 'c71a09e3', aff: '#102', sub: 'tt_ig_22', geo: 'IT', dev: 'Desktop', status: ['Lead', 'green'] },
  { t: '14:08:55', id: '0d5e8b44', aff: '#214', sub: 'fb_cmp_17', geo: 'CA', dev: 'Android', status: ['FTD', 'navy'] },
  { t: '14:08:51', id: 'a92f3c60', aff: '#407', sub: 'nat_fin_09', geo: 'NO', dev: 'iOS', status: ['Click', 'slate'] },
  { t: '14:08:47', id: '77c1e5d2', aff: '#318', sub: 'gg_brand_04', geo: 'ES', dev: 'Desktop', status: ['Duplicate', 'red'] },
] as const;

export function ClicksScreen() {
  return (
    <Screen
      crumb="Reports › Clicks"
      title="Clicks"
      aside={
        <>
          <Segmented items={['Today', '7 days', '30 days']} active="Today" />
          <Pill tone="green">● Live</Pill>
        </>
      }
    >
      <table className="w-full">
        <thead className="border-b border-[var(--ui-line)] bg-[#fafbfc]">
          <tr>
            <th className={th}>Time</th>
            <th className={th}>Click ID</th>
            <th className={th}>Affiliate</th>
            <th className={`${th} hidden sm:table-cell`}>Sub ID</th>
            <th className={th}>GEO</th>
            <th className={`${th} hidden md:table-cell`}>Device</th>
            <th className={`${th} text-right`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ui-line)]">
          {CLICKS.map((c) => (
            <tr key={c.id}>
              <td className={`${td} ui-mono text-[var(--ui-muted)]`}>{c.t}</td>
              <td className={`${td} ui-mono`}>{c.id}</td>
              <td className={`${td} font-medium`}>{c.aff}</td>
              <td className={`${td} ui-mono hidden text-[var(--ui-muted)] sm:table-cell`}>{c.sub}</td>
              <td className={td}>{c.geo}</td>
              <td className={`${td} hidden text-[var(--ui-muted)] md:table-cell`}>{c.dev}</td>
              <td className={`${td} text-right`}>
                <Pill tone={c.status[1]}>{c.status[0]}</Pill>
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
              <td className={`${td} font-medium`}>{b.name}</td>
              <td className={`${td} ui-num hidden sm:table-cell`}>{b.weight}</td>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-14 rounded-full bg-[#eef0f5] sm:w-20">
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

/* ---------------------------------------------------------------- Postbacks */

const POSTBACKS = [
  { t: '19:42:10', from: 'Advertiser D', body: 'status=ftd payout=1000.00', code: ['200 OK', 'green'], ms: '84 ms' },
  { t: '19:40:55', from: 'Advertiser C', body: 'status=no_answer', code: ['200 OK', 'green'], ms: '61 ms' },
  { t: '19:38:12', from: 'Advertiser F', body: 'status=ftd payout=850.00', code: ['200 OK', 'green'], ms: '97 ms' },
  { t: '19:31:40', from: 'Advertiser #2', body: 'status=deposit amount=250.00', code: ['Timeout', 'red'], ms: '30 s' },
] as const;

export function PostbackScreen() {
  return (
    <Screen crumb="Integrations › Postbacks" title="Incoming postbacks" aside={<Segmented items={['Incoming', 'Outgoing']} active="Incoming" />}>
      <ul className="divide-y divide-[var(--ui-line)]">
        {POSTBACKS.map((p) => (
          <li key={p.t} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <span className="ui-mono hidden text-[11px] text-[var(--ui-muted)] sm:inline">{p.t}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-medium">{p.from}</span>
              <span className="ui-mono block truncate text-[10.5px] text-[var(--ui-muted)]">{p.body}</span>
            </span>
            <span className="ui-mono hidden text-[10.5px] text-[var(--ui-faint)] sm:inline">{p.ms}</span>
            <Pill tone={p.code[1]}>{p.code[0]}</Pill>
          </li>
        ))}
      </ul>
      <div className="border-t border-[var(--ui-line)] bg-[#fafbfc] px-4 py-3.5 sm:px-5">
        <p className="text-[10.5px] font-medium text-[var(--ui-faint)]">Example postback URL</p>
        <p className="ui-mono mt-1.5 rounded-md bg-[var(--ui-navy)] px-3 py-2 text-[10.5px] leading-relaxed text-[#c9d6f2] [overflow-wrap:anywhere]">
          https://<span className="text-[#7ee2a8]">{'{tracking-domain}'}</span>/postback
          <wbr />
          ?click_id=<span className="text-[#7ee2a8]">{'{click_id}'}</span>
          <wbr />
          &amp;status=<span className="text-[#7ee2a8]">{'{status}'}</span>
          <wbr />
          &amp;payout=<span className="text-[#7ee2a8]">{'{payout}'}</span>
        </p>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Reports */

const DRILL = [
  { geo: 'Canada', clicks: '18,402', leads: '3,511', cr: '2.1%', ftd: '74', epc: '$1.32', profit: '$24,290' },
  { geo: 'United Kingdom', clicks: '12,960', leads: '2,204', cr: '1.8%', ftd: '40', epc: '$1.05', profit: '$13,610' },
  { geo: 'Ireland', clicks: '6,118', leads: '1,019', cr: '1.6%', ftd: '16', epc: '$0.88', profit: '$5,380' },
  { geo: 'Norway', clicks: '3,744', leads: '702', cr: '1.4%', ftd: '10', epc: '$0.91', profit: '$3,410' },
];

export function DrillDownScreen() {
  return (
    <Screen crumb="Reports › Drill-down › Affiliate #214 › Finance CA Tier 1" title="By country" aside={<Segmented items={['Offers', 'Affiliates', 'Countries']} active="Countries" />}>
      <table className="w-full">
        <thead className="border-b border-[var(--ui-line)] bg-[#fafbfc]">
          <tr>
            <th className={th}>Country</th>
            <th className={`${th} hidden text-right sm:table-cell`}>Clicks</th>
            <th className={`${th} text-right`}>Leads</th>
            <th className={`${th} hidden text-right md:table-cell`}>CR</th>
            <th className={`${th} text-right`}>FTDs</th>
            <th className={`${th} hidden text-right sm:table-cell`}>EPC</th>
            <th className={`${th} text-right`}>Profit</th>
          </tr>
        </thead>
        <tbody className="ui-num divide-y divide-[var(--ui-line)]">
          {DRILL.map((r) => (
            <tr key={r.geo}>
              <td className={`${td} font-medium`}>{r.geo}</td>
              <td className={`${td} hidden text-right sm:table-cell`}>{r.clicks}</td>
              <td className={`${td} text-right`}>{r.leads}</td>
              <td className={`${td} hidden text-right md:table-cell`}>{r.cr}</td>
              <td className={`${td} text-right`}>{r.ftd}</td>
              <td className={`${td} ui-mono hidden text-right sm:table-cell`}>{r.epc}</td>
              <td className={`${td} ui-mono text-right font-semibold text-[#1f7a43]`}>{r.profit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Affiliates */

const AFFILIATES = [
  { id: '#214', kind: 'Media buyer', short: 'MB', deal: 'CPA $650', tone: 'green', status: 'Active' },
  { id: '#318', kind: 'Lead generator', short: 'LG', deal: 'CPL $25', tone: 'violet', status: 'Active' },
  { id: '#102', kind: 'Casino affiliate', short: 'CA', deal: 'RevShare 35%', tone: 'amber', status: 'Active' },
  { id: '#407', kind: 'Sub-network', short: 'SN', deal: 'Hybrid $300 + 20%', tone: 'slate', status: 'Review' },
] as const;

export function AffiliatesScreen() {
  return (
    <Screen crumb="Accounts › Affiliates" title="Affiliates" aside={<Pill tone="slate">4 of 128</Pill>}>
      <ul className="divide-y divide-[var(--ui-line)]">
        {AFFILIATES.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ui-bg)] text-[10px] font-semibold text-[var(--ui-muted)]">
              {a.short}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-medium">Affiliate {a.id}</span>
              <span className="block text-[10.5px] text-[var(--ui-muted)]">{a.kind}</span>
            </span>
            <Pill tone={a.tone}>{a.deal}</Pill>
            <span className={`hidden w-12 text-right text-[10.5px] sm:inline ${a.status === 'Active' ? 'text-[#1f7a43]' : 'text-[var(--ui-muted)]'}`}>{a.status}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Finance */

export function InvoiceScreen() {
  return (
    <Screen crumb="Finance › Invoices" title="INV-2026-0142" aside={<Pill tone="green">Sent</Pill>}>
      <div className="grid grid-cols-2 gap-3 px-4 py-3.5 text-[11px] sm:px-5">
        <div>
          <p className="text-[var(--ui-faint)]">Bill to</p>
          <p className="font-medium">Advertiser D</p>
        </div>
        <div>
          <p className="text-[var(--ui-faint)]">Period</p>
          <p className="font-medium">1–15 Oct 2026</p>
        </div>
      </div>
      <div className="border-y border-[var(--ui-line)] px-4 sm:px-5">
        {[
          ['FTDs · Finance CA Tier 1', '14 × $1,000.00', '$14,000.00'],
          ['FTDs · Crypto UK Premium', '6 × $850.00', '$5,100.00'],
        ].map(([item, qty, total]) => (
          <div key={item} className="ui-num flex items-center gap-3 border-b border-[var(--ui-line)] py-2.5 text-[11.5px] last:border-0">
            <span className="flex-1">{item}</span>
            <span className="hidden text-[var(--ui-muted)] sm:inline">{qty}</span>
            <span className="ui-mono w-20 text-right">{total}</span>
          </div>
        ))}
      </div>
      <div className="ui-num flex items-center px-4 py-3 sm:px-5">
        <span className="text-[11px] text-[var(--ui-muted)]">Due 30 Oct 2026</span>
        <span className="ml-auto text-[11px] text-[var(--ui-muted)]">Total</span>
        <span className="ui-mono ml-3 text-[15px] font-semibold">$19,100.00</span>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Monitoring */

export function MonitoringScreen() {
  return (
    <Screen crumb="Overview" title="System status" aside={<Pill tone="red">● 1 needs attention</Pill>}>
      <div className="grid grid-cols-2 gap-2 px-4 py-3.5 sm:grid-cols-4 sm:px-5">
        {[
          ['Critical', '1', '#e5484d'],
          ['Major', '0', '#f07a3a'],
          ['Minor', '1', '#98a2b3'],
          ['Information', '3', '#5b3fd8'],
        ].map(([label, n, c]) => (
          <div key={label} className={`rounded-lg border px-2.5 py-2 ${label === 'Critical' ? 'border-[#f7caca] bg-[#fdf3f3]' : 'border-[var(--ui-line)]'}`}>
            <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--ui-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
              {label}
            </span>
            <span className="ui-num mt-0.5 block text-[15px] font-semibold">{n}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-[var(--ui-line)] px-4 py-3.5 text-[11.5px] sm:px-5">
        <p>
          <span className="font-semibold text-[var(--ui-red)]">Critical:</span> Postback endpoint for Advertiser #2 is not responding since 13:52.
        </p>
        <p className="text-[var(--ui-muted)]">
          <span className="font-semibold text-[var(--ui-text)]">Minor:</span> Advertiser A is at 92% of today’s cap.
        </p>
      </div>
      <div className="ui-num grid grid-cols-3 border-t border-[var(--ui-line)] text-center">
        {[
          ['Lead quality', '82/100'],
          ['Duplicates blocked', '214'],
          ['Late conversions', '65'],
        ].map(([label, v]) => (
          <div key={label} className="border-r border-[var(--ui-line)] px-2 py-3 last:border-0">
            <p className="text-[10px] text-[var(--ui-faint)]">{label}</p>
            <p className="mt-0.5 text-[13px] font-semibold">{v}</p>
          </div>
        ))}
      </div>
    </Screen>
  );
}
