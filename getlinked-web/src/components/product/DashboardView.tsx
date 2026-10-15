import { AreaTrend, Donut, HourlyBars, Spark } from './charts';
import { IconChart, IconCheck, IconCursor, IconDollar, IconGlobe, IconStar, IconTarget } from './icons';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Delta({ value, up = true }: { value: string; up?: boolean }) {
  return (
    <span
      className={`ui-num inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-semibold ${
        up ? 'bg-[var(--ui-green-soft)] text-[#1f7a43]' : 'bg-[#fdecec] text-[var(--ui-red)]'
      }`}
    >
      {up ? '↗' : '↘'} {value}
    </span>
  );
}

function KpiCard({
  icon,
  title,
  value,
  rows,
  delta,
  seed,
  dark = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  rows: [string, string][];
  delta: string;
  seed: number;
  dark?: boolean;
}) {
  return (
    <div
      className={`absolute top-0 flex h-[120px] w-[192px] flex-col rounded-xl p-3 ${
        dark ? 'bg-[var(--ui-navy)] text-white shadow-[0_8px_24px_-10px_rgba(12,23,54,0.6)]' : 'ui-card'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md ${
            dark ? 'bg-white/10 text-white' : 'bg-[var(--ui-green-soft)] text-[var(--ui-green)]'
          }`}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold">{title}</span>
        <span className={`ml-auto text-[9px] ${dark ? 'text-[#7ee2a8]' : 'text-[var(--ui-faint)]'}`}>Report →</span>
      </div>
      <div className="mt-1.5 flex items-end justify-between">
        <span className="ui-num text-[21px] font-semibold tracking-[-0.03em]">
          {value}
        </span>
        {!dark && <Spark seed={seed} />}
      </div>
      <div className={`mt-auto space-y-0.5 text-[9px] ${dark ? 'text-[#9aa7c7]' : 'text-[var(--ui-muted)]'}`}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span>{k}</span>
            <span className={`ui-num font-semibold ${dark ? 'text-white' : 'text-[var(--ui-text)]'}`}>{v}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Delta value={delta} />
          <span>vs previous period</span>
        </div>
      </div>
    </div>
  );
}

function CardTitle({ icon, title, aside }: { icon?: React.ReactNode; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[var(--ui-muted)]">{icon}</span>}
      <span className="text-[11.5px] font-semibold tracking-[-0.01em]">{title}</span>
      <span className="ml-auto text-[9px] text-[var(--ui-faint)]">{aside}</span>
    </div>
  );
}

const COUNTRY_LEADS = [
  { label: 'Italy', value: 28, color: '#111827' },
  { label: 'United Kingdom', value: 22, color: '#2fa35b' },
  { label: 'Canada', value: 17, color: '#9ad5ae' },
  { label: 'Norway', value: 9, color: '#5b3fd8' },
  { label: 'Spain', value: 7, color: '#b8b0f0' },
  { label: 'Others', value: 17, color: '#d6dae2' },
];
const COUNTRY_CONV = [
  { label: 'Canada', value: 30, color: '#111827' },
  { label: 'Italy', value: 24, color: '#2fa35b' },
  { label: 'United Kingdom', value: 16, color: '#9ad5ae' },
  { label: 'Norway', value: 9, color: '#5b3fd8' },
  { label: 'Spain', value: 6, color: '#b8b0f0' },
  { label: 'Others', value: 15, color: '#d6dae2' },
];

function CountryCard({ x, title, slices, total, caption, count }: {
  x: number;
  title: string;
  slices: typeof COUNTRY_LEADS;
  total: string;
  caption: string;
  count: string;
}) {
  return (
    <div className="ui-card absolute top-0 h-[208px] w-[257px] p-3" style={{ left: x }}>
      <CardTitle icon={<IconGlobe size={12} />} title={title} aside={count} />
      <div className="mt-1.5 flex justify-center">
        <Donut slices={slices} size={100} stroke={15} total={total} caption={caption} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] text-[var(--ui-muted)]">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="ui-num ml-auto font-medium text-[var(--ui-text)]">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADVERTISER_ROWS = [
  { name: 'Advertiser #1', value: 9062, pct: 26, color: '#111827' },
  { name: 'Advertiser #2', value: 6274, pct: 18, color: '#2fa35b' },
  { name: 'Advertiser #3', value: 4880, pct: 14, color: '#9ad5ae' },
  { name: 'Advertiser #4', value: 3137, pct: 9, color: '#5b3fd8' },
  { name: 'Others', value: 11502, pct: 33, color: '#d6dae2' },
];

const PERFORMERS = [
  { name: 'Finance CA Tier 1', clicks: '41,176', leads: '7,747', conv: '142', epc: '$1.16', profit: '$12,850.00' },
  { name: 'Crypto UK Premium', clicks: '28,074', leads: '5,064', conv: '96', epc: '$0.98', profit: '$8,600.00' },
  { name: 'iGaming IT Welcome', clicks: '19,142', leads: '3,399', conv: '61', epc: '$0.92', profit: '$5,400.00' },
];

/** The GetLinked dashboard, recreated with sample data. */
export function DashboardView() {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-6 top-[16px] text-[10px] text-[var(--ui-faint)]">
        Overview › <span className="text-[var(--ui-text)]">Dashboard</span>
      </div>
      <div className="absolute left-6 top-[32px] text-[20px] font-semibold tracking-[-0.025em]">Good afternoon 👋</div>
      <div className="absolute left-6 top-[62px] text-[10.5px] text-[var(--ui-muted)]">
        Here’s how your network performed yesterday.
      </div>
      <div className="absolute right-6 top-[38px] flex items-center gap-1 text-[10px] text-[var(--ui-muted)]">
        <span className="rounded-md border border-[var(--ui-line)] bg-white px-2 py-1 font-medium text-[var(--ui-text)]">
          + Add filter
        </span>
        <span className="ml-1 px-2 py-1">7 days</span>
        <span className="px-2 py-1">30 days</span>
        <span className="px-2 py-1">Today</span>
        <span className="rounded-md bg-[var(--ui-navy)] px-2 py-1 font-medium text-white">Yesterday</span>
      </div>

      {/* KPI row */}
      <div className="absolute left-6 top-[90px] h-[120px] w-[1008px]">
        <div className="absolute left-0 top-0">
          <KpiCard
            dark
            icon={<IconDollar size={11} />}
            title="Profit"
            value={usd(48210.4)}
            rows={[
              ['Income', '$212,480.00'],
              ['Cost', '$164,269.60'],
            ]}
            delta="9.4%"
            seed={1}
          />
        </div>
        <div className="absolute left-[204px] top-0">
          <KpiCard
            icon={<IconCursor size={11} />}
            title="Clicks"
            value="191,589"
            rows={[
              ['Unique clicks', '176,204'],
              ['Profit per click', '$0.25'],
            ]}
            delta="8.1%"
            seed={2}
          />
        </div>
        <div className="absolute left-[408px] top-0">
          <KpiCard
            icon={<IconTarget size={11} />}
            title="Leads"
            value="34,855"
            rows={[
              ['Click-to-lead', '18.19%'],
              ['Failed', '1,204'],
            ]}
            delta="3.6%"
            seed={3}
          />
        </div>
        <div className="absolute left-[612px] top-0">
          <KpiCard
            icon={<IconCheck size={11} />}
            title="Conversions"
            value="574"
            rows={[
              ['Conversion rate', '1.65%'],
              ['Pending / review', '12 / 33'],
            ]}
            delta="2.2%"
            seed={4}
          />
        </div>
        <div className="absolute left-[816px] top-0">
          <KpiCard
            icon={<IconStar size={11} />}
            title="Lead quality"
            value="81 / 100"
            rows={[
              ['Late conversions', '65'],
              ['Profit per conversion', '$84.00'],
            ]}
            delta="1.9%"
            seed={5}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="absolute left-6 top-[222px] h-[208px] w-[1008px]">
        <div className="ui-card absolute left-0 top-0 h-[208px] w-[470px] p-3">
          <div className="flex items-center gap-1.5">
            <IconChart size={12} className="text-[var(--ui-muted)]" />
            <span className="text-[11.5px] font-semibold tracking-[-0.01em]">Clicks, leads and conversions</span>
            <span className="ml-auto flex gap-1 text-[8.5px] text-[var(--ui-muted)]">
              {[
                ['Clicks', '#5b3fd8'],
                ['Leads', '#45b36b'],
                ['Conversions', '#f07a3a'],
              ].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1 rounded border border-[var(--ui-line)] px-1.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </span>
          </div>
          <div className="mt-2">
            <HourlyBars width={444} height={158} />
          </div>
        </div>
        <div className="absolute left-[482px] top-0">
          <CountryCard x={0} title="Leads by country" slices={COUNTRY_LEADS} total="34,855" caption="total leads" count="27 countries" />
        </div>
        <div className="absolute left-[751px] top-0">
          <CountryCard x={0} title="Conversions by country" slices={COUNTRY_CONV} total="574" caption="total conversions" count="19 countries" />
        </div>
      </div>

      {/* Advertisers and trends */}
      <div className="absolute left-6 top-[442px] h-[150px] w-[1008px]">
        <div className="ui-card absolute left-0 top-0 h-[150px] w-[320px] p-3">
          <CardTitle title="Top advertisers by leads" aside="···" />
          <div className="mt-2.5 space-y-[7px]">
            {ADVERTISER_ROWS.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-[9.5px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                <span className="w-[74px]">{r.name}</span>
                <span className="h-1.5 flex-1 rounded-full bg-[#eef0f5]">
                  <span className="block h-full rounded-full" style={{ width: `${r.pct * 2.6}%`, background: r.color }} />
                </span>
                <span className="ui-num w-9 text-right font-semibold">{r.value.toLocaleString('en-US')}</span>
                <span className="ui-num w-6 text-right text-[var(--ui-faint)]">{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ui-card absolute left-[332px] top-0 h-[150px] w-[335px] p-3">
          <CardTitle title="Profit trend" aside="Last 14 days" />
          <div className="mt-1 flex items-baseline gap-2">
            <span className="ui-num text-[18px] font-semibold tracking-[-0.02em] text-[#1f7a43]">{usd(48210.4)}</span>
            <span className="text-[9px] font-semibold text-[#1f7a43]">↗ 6.7%</span>
          </div>
          <div className="mt-1">
            <AreaTrend width={309} height={72} seed={9} color="#2fa35b" />
          </div>
        </div>
        <div className="ui-card absolute left-[679px] top-0 h-[150px] w-[329px] p-3">
          <CardTitle title="Conversion rate" aside="Last 14 days" />
          <div className="mt-1 flex items-baseline gap-2">
            <span className="ui-num text-[18px] font-semibold tracking-[-0.02em]">1.65%</span>
            <span className="text-[9px] font-semibold text-[#1f7a43]">↗ 0.2 pt</span>
          </div>
          <div className="mt-1">
            <AreaTrend width={303} height={72} seed={21} color="#45b36b" />
          </div>
        </div>
      </div>

      {/* Performers and status */}
      <div className="absolute left-6 top-[604px] h-[148px] w-[1008px]">
        <div className="ui-card absolute left-0 top-0 h-[148px] w-[690px] p-3">
          <div className="flex items-center">
            <span className="text-[11.5px] font-semibold tracking-[-0.01em]">Top performers</span>
            <span className="ml-auto flex rounded-md bg-[var(--ui-bg)] p-0.5 text-[9px] text-[var(--ui-muted)]">
              <span className="rounded bg-white px-2 py-0.5 font-medium text-[var(--ui-text)] shadow-sm">Offers</span>
              <span className="px-2 py-0.5">Affiliates</span>
              <span className="px-2 py-0.5">Countries</span>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-[18px_1fr_70px_60px_74px_56px_80px] border-b border-[var(--ui-line)] pb-1 text-[8.5px] text-[var(--ui-faint)]">
            <span>#</span>
            <span>Name</span>
            <span className="text-right">Clicks</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Conversions</span>
            <span className="text-right">EPC</span>
            <span className="text-right">Profit</span>
          </div>
          {PERFORMERS.map((p, i) => (
            <div
              key={p.name}
              className="ui-num grid grid-cols-[18px_1fr_70px_60px_74px_56px_80px] items-center border-b border-[var(--ui-line)] py-[5px] text-[9.5px] last:border-0"
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-[var(--ui-green-soft)] text-[8px] text-[#1f7a43]">
                {i + 1}
              </span>
              <span className="flex items-center gap-2 font-medium">
                {p.name}
                <span className="h-1 rounded-full bg-[var(--ui-green)]" style={{ width: 48 - i * 14 }} />
              </span>
              <span className="text-right">{p.clicks}</span>
              <span className="text-right">{p.leads}</span>
              <span className="text-right">{p.conv}</span>
              <span className="ui-mono text-right">{p.epc}</span>
              <span className="ui-mono text-right font-semibold text-[#1f7a43]">{p.profit}</span>
            </div>
          ))}
        </div>
        <div className="ui-card absolute left-[702px] top-0 h-[148px] w-[306px] p-3">
          <div className="flex items-center">
            <span className="text-[11.5px] font-semibold tracking-[-0.01em]">System status</span>
            <span className="ml-auto rounded-full bg-[var(--ui-green-soft)] px-2 py-0.5 text-[8.5px] font-medium text-[#1f7a43]">
              ● All systems normal
            </span>
          </div>
          <div className="mt-1.5 space-y-[3px] text-[9.5px]">
            {[
              ['Critical', '0', '#e5484d'],
              ['Major', '0', '#f07a3a'],
              ['Minor', '1', '#98a2b3'],
              ['Information', '3', '#5b3fd8'],
            ].map(([label, n, c]) => (
              <div key={label} className="flex items-center gap-2 rounded-md border border-[var(--ui-line)] px-2 py-[2px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                {label}
                <span className="ui-num ml-auto font-semibold">{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[8.5px] text-[var(--ui-muted)]">
            <span className="font-semibold text-[var(--ui-text)]">Minor:</span> Advertiser #2 is at 92% of today’s cap.
          </div>
        </div>
      </div>
    </div>
  );
}
