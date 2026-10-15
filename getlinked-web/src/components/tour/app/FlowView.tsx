import { ADVERTISERS, CHECKS, FLOW, LEAD, LOG, PATHS } from '../tourData';
import { IconBolt, IconCheck, IconClock, IconRecycle, IconTarget, IconWallet, IconX } from './icons';

const LOG_TONE = {
  info: 'text-[#8fb3ff]',
  skip: 'text-[#f5b463]',
  ok: 'text-[#5fd394]',
  money: 'text-[#7ee2c0]',
};

function Pill({ children, tone }: { children: React.ReactNode; tone: 'green' | 'gray' | 'blue' | 'purple' | 'amber' | 'solid' }) {
  const tones = {
    green: 'bg-[var(--ui-green-soft)] text-[#1f7a43]',
    gray: 'bg-[#eef0f4] text-[var(--ui-muted)]',
    blue: 'bg-[#eaf0ff] text-[#3159c9]',
    purple: 'bg-[#efebff] text-[#5b3fd8]',
    amber: 'bg-[#fff4e5] text-[#b5650d]',
    solid: 'bg-[var(--ui-green)] text-white',
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[9.5px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Stacked alternatives that the tour cross-fades between. The first is visible at rest. */
function Stack({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`relative inline-grid [&>*]:col-start-1 [&>*]:row-start-1 ${className}`}>{children}</span>;
}

function LeadCard() {
  const { x, y, w, h } = FLOW.lead;
  return (
    <div data-tour="lead-card" className="ui-card absolute p-4" style={{ left: x, top: y, width: w, height: h }}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#3159c9]">
          <IconTarget size={14} />
        </span>
        <div>
          <div className="text-[9.5px] text-[var(--ui-faint)]">Lead</div>
          <div className="ui-mono text-[12.5px] font-semibold tracking-[-0.01em]">{LEAD.id}</div>
        </div>
        <Stack className="ml-auto justify-items-end">
          <span data-tour="status-new">
            <Pill tone="blue">● New</Pill>
          </span>
          <span data-tour="status-routed" className="invisible opacity-0">
            <Pill tone="green">Routed to C</Pill>
          </span>
          <span data-tour="status-recycled" className="invisible opacity-0">
            <Pill tone="purple">Recycled to D</Pill>
          </span>
          <span data-tour="status-converted" className="invisible opacity-0">
            <Pill tone="solid">
              <IconCheck size={10} /> Converted
            </Pill>
          </span>
        </Stack>
      </div>
      <div className="mt-3 border-t border-[var(--ui-line)] pt-2">
        {LEAD.fields.map((f) => (
          <div
            key={f.label}
            data-tour="lead-field"
            className="flex items-center justify-between border-b border-dashed border-[var(--ui-line)] py-[6.5px] text-[10.5px] last:border-0"
          >
            <span className="text-[var(--ui-muted)]">{f.label}</span>
            <span className={`flex items-center gap-1.5 font-medium ${f.mono ? 'ui-mono text-[10px]' : ''}`}>
              {f.chip && (
                <span className="ui-mono rounded bg-[var(--ui-navy)] px-1 py-px text-[8.5px] font-semibold text-white">
                  {f.chip}
                </span>
              )}
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckCell({ label, state, row, index, note }: { label: string; state: string; row: string; index: number; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-[var(--ui-bg)] px-1.5 py-1">
      <span className="text-[8.5px] text-[var(--ui-faint)]">{label}</span>
      <span className="flex items-center gap-1">
        <Stack>
          <span data-check-pending={`${row}${index}`} className="mt-[3px] h-2 w-2 rounded-full border border-[#c9cfda]" />
          {state !== 'idle' && (
            <span
              data-check={`${row}${index}`}
              className={`invisible flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-0 ${
                state === 'pass' ? 'bg-[var(--ui-green)] text-white' : 'bg-[var(--ui-red)] text-white'
              }`}
            >
              {state === 'pass' ? <IconCheck size={9} /> : <IconX size={9} />}
            </span>
          )}
        </Stack>
        {note && <span className="ui-num text-[9px] font-semibold text-[var(--ui-text)]">{note}</span>}
      </span>
    </div>
  );
}

function BucketPanel() {
  const { x, y, w, h } = FLOW.bucket;
  return (
    <div data-tour="bucket" className="ui-card absolute overflow-hidden" style={{ left: x, top: y, width: w, height: h }}>
      <div className="flex h-[70px] items-center gap-2 border-b border-[var(--ui-line)] px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-navy)] text-white">
          <IconBolt size={13} />
        </span>
        <div>
          <div className="text-[9.5px] text-[var(--ui-faint)]">Bucket</div>
          <div className="text-[12.5px] font-semibold tracking-[-0.01em]">DE · Forex · Tier 1</div>
        </div>
        <span className="ml-auto text-right text-[9px] leading-tight text-[var(--ui-muted)]">
          Rotation
          <br />
          <span className="font-semibold text-[var(--ui-text)]">By priority</span>
        </span>
      </div>
      {ADVERTISERS.map((a, i) => (
        <div
          key={a.key}
          data-tour={`row-${a.key}`}
          className="absolute left-0 right-0 border-b border-[var(--ui-line)] px-3 py-2.5 last:border-0"
          style={{ top: FLOW.bucketHeader + i * 96, height: 96 }}
        >
          <div
            data-tour={`sweep-${a.key}`}
            className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#e8f6ee] via-[#e8f6ee] to-transparent"
          />
          <div data-tour={`rowbody-${a.key}`} className="relative">
            <div className="flex items-center gap-2">
              <span className="ui-mono rounded bg-[var(--ui-bg)] px-1.5 py-px text-[9px] font-semibold text-[var(--ui-muted)]">
                P{a.priority}
              </span>
              <span className="text-[11px] font-semibold">Advertiser {a.key}</span>
              <Stack className="ml-auto justify-items-end">
                <span data-tour={`result-idle-${a.key}`} className="text-[9px] text-[var(--ui-faint)]">
                  {a.key === 'D' ? 'Standby' : 'Waiting'}
                </span>
                <span data-tour={`result-${a.key}`} className="invisible opacity-0">
                  {a.key === 'A' && <Pill tone="gray">Skipped · cap reached</Pill>}
                  {a.key === 'B' && <Pill tone="gray">Skipped · no budget</Pill>}
                  {a.key === 'C' && <Pill tone="green">Eligible · routed</Pill>}
                  {a.key === 'D' && <Pill tone="purple">Eligible · recycled</Pill>}
                </span>
              </Stack>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {CHECKS.map((label, k) => (
                <CheckCell
                  key={label}
                  label={label}
                  state={a.checks[k]}
                  row={a.key}
                  index={k}
                  note={k === 2 ? `${a.cap[0]}/${a.cap[1]}` : k === 3 ? a.budget.replace(' left', '') : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const NODE_META: Record<string, string> = {
  A: 'Broker · DE, AT, CH',
  B: 'Broker · DE, NL',
  C: 'Broker · DE',
  D: 'Broker · DE, AT',
};

function AdvertiserNode({ index }: { index: number }) {
  const a = ADVERTISERS[index];
  const { x, w, h, ys } = FLOW.nodes;
  const capPct = (a.cap[0] / a.cap[1]) * 100;
  return (
    <div
      data-tour={`node-${a.key}`}
      className="ui-card absolute flex flex-col justify-center px-3.5"
      style={{ left: x, top: ys[index], width: w, height: h }}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-bg)] text-[12px] font-bold text-[var(--ui-navy)] ring-1 ring-inset ring-[var(--ui-line)]">
          {a.key}
        </span>
        <div>
          <div className="text-[11.5px] font-semibold">Advertiser {a.key}</div>
          <div className="text-[9.5px] text-[var(--ui-muted)]">{NODE_META[a.key]}</div>
        </div>
        <Stack className="ml-auto justify-items-end">
          {a.key === 'A' && (
            <>
              <span data-tour="nstatus-A-idle"><Pill tone="green">Accepting</Pill></span>
              <span data-tour="nstatus-A-cap" className="invisible opacity-0"><Pill tone="gray">Cap reached</Pill></span>
            </>
          )}
          {a.key === 'B' && (
            <>
              <span data-tour="nstatus-B-idle"><Pill tone="green">Accepting</Pill></span>
              <span data-tour="nstatus-B-budget" className="invisible opacity-0"><Pill tone="gray">Budget unavailable</Pill></span>
            </>
          )}
          {a.key === 'C' && (
            <>
              <span data-tour="nstatus-C-idle"><Pill tone="green">Accepting</Pill></span>
              <span data-tour="nstatus-C-received" className="invisible opacity-0"><Pill tone="solid">Lead received</Pill></span>
              <span data-tour="nstatus-C-noconv" className="invisible opacity-0"><Pill tone="amber">No conversion · 4h</Pill></span>
            </>
          )}
          {a.key === 'D' && (
            <>
              <span data-tour="nstatus-D-idle"><Pill tone="green">Accepting</Pill></span>
              <span data-tour="nstatus-D-received" className="invisible opacity-0"><Pill tone="purple">Recycled lead received</Pill></span>
              <span data-tour="nstatus-D-converted" className="invisible opacity-0"><Pill tone="solid"><IconCheck size={10} /> FTD · converted</Pill></span>
            </>
          )}
        </Stack>
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-[9px] text-[var(--ui-muted)]">
        <span className="w-[74px]">Cap today</span>
        <span className="h-1.5 flex-1 rounded-full bg-[#eef0f5]">
          <span
            className="block h-full rounded-full"
            style={{ width: `${capPct}%`, background: capPct >= 100 ? '#98a2b3' : 'var(--ui-green)' }}
          />
        </span>
        <span className="ui-num w-10 text-right font-semibold text-[var(--ui-text)]">
          {a.cap[0]}/{a.cap[1]}
        </span>
      </div>
    </div>
  );
}

function EventLog() {
  const { x, y, w, h } = FLOW.log;
  return (
    <div
      data-tour="log"
      className="absolute overflow-hidden rounded-xl bg-[#0b1326] text-white shadow-[0_10px_30px_-12px_rgba(11,19,38,0.55)] ring-1 ring-black/10"
      style={{ left: x, top: y, width: w, height: h }}
    >
      <div className="flex h-9 items-center gap-2 border-b border-white/[0.07] px-3.5 text-[10.5px] font-semibold">
        Event log
        <span className="ml-auto flex items-center gap-1.5 text-[9px] font-medium text-[#5fd394]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5fd394]" />
          Streaming
        </span>
      </div>
      <div className="relative h-[calc(100%-36px)] overflow-hidden px-3.5 pt-2">
        <div data-tour="log-list">
          {LOG.map((l, i) => (
            <div key={i} data-log={i} className="ui-mono invisible pb-[7px] opacity-0">
              <div className="flex gap-2 text-[9px]">
                <span className="text-[#5d6b8a]">{l.time}</span>
                <span className={`font-semibold ${LOG_TONE[l.tone]}`}>{l.event}</span>
              </div>
              <div className="pl-[70px] text-[9px] text-[#a9b6d3]">{l.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveKpis() {
  const { x, y, w, h } = FLOW.kpi;
  const rows = [
    { key: 'leads', label: 'Leads today', value: '34,855', delta: '+1' },
    { key: 'conversions', label: 'Conversions', value: '574', delta: '+1' },
    { key: 'profit', label: 'Profit', value: '$48,210.40', delta: '+$350.00' },
  ];
  return (
    <div data-tour="kpi-mini" className="ui-card absolute p-4" style={{ left: x, top: y, width: w, height: h }}>
      <div className="flex items-center">
        <span className="text-[11.5px] font-semibold">Network today</span>
        <span className="ml-auto flex items-center gap-1.5 text-[9px] font-medium text-[#1f7a43]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ui-green)]" />
          Real time
        </span>
      </div>
      <div className="mt-2.5 space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between rounded-lg bg-[var(--ui-bg)] px-3 py-2">
            <span className="text-[10px] text-[var(--ui-muted)]">{r.label}</span>
            <span className="flex items-center gap-2">
              <span data-mini-delta={r.key} className="invisible opacity-0">
                <Pill tone="green">{r.delta}</Pill>
              </span>
              <span data-mini={r.key} className="ui-num text-[14px] font-semibold tracking-[-0.02em]">
                {r.value}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCards() {
  const { x, y, w, h } = FLOW.slot;
  const style = { left: x, top: y, width: w, height: h };
  return (
    <>
      <div data-tour="card-recycle" className="ui-card invisible absolute p-4 opacity-0" style={style}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#efebff] text-[#5b3fd8]">
            <IconRecycle size={14} />
          </span>
          <span className="text-[12px] font-semibold">Lead Recycling</span>
          <span className="ml-auto">
            <Pill tone="purple">Rule active</Pill>
          </span>
        </div>
        <div className="mt-3 space-y-1.5 text-[10px]">
          {[
            ['Trigger', 'No conversion within 4 hours'],
            ['Send to', 'Next eligible advertiser in bucket'],
            ['Skip', 'Advertisers that already had it'],
            ['Limit', '2 cycles per lead'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 rounded-md bg-[var(--ui-bg)] px-2.5 py-1.5">
              <span className="w-12 text-[var(--ui-muted)]">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div data-tour="card-postback" className="ui-card invisible absolute p-4 opacity-0" style={style}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-green-soft)] text-[var(--ui-green)]">
            <IconBolt size={13} />
          </span>
          <span className="text-[12px] font-semibold">Postback received</span>
          <span className="ml-auto">
            <Pill tone="green">200 OK</Pill>
          </span>
        </div>
        <div className="ui-mono mt-3 rounded-lg bg-[#0b1326] px-3 py-2 text-[9.5px] leading-relaxed text-[#a9b6d3]">
          <span className="text-[#5fd394]">GET</span> /postback?click_id=
          <span className="text-white">9f3a71c2e04b</span>
          <br />
          &amp;status=<span className="text-white">ftd</span>&amp;payout=<span className="text-white">1000.00</span>
        </div>
        <div className="mt-2.5 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-[var(--ui-muted)]">From</span>
            <span className="font-medium">Advertiser D</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ui-muted)]">Status</span>
            <span className="font-medium">Delivered → Converted (FTD)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ui-muted)]">Received</span>
            <span className="ui-mono font-medium">18:47:05 UTC</span>
          </div>
        </div>
      </div>

      <div data-tour="card-finance" className="ui-card invisible absolute p-4 opacity-0" style={style}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-green-soft)] text-[var(--ui-green)]">
            <IconWallet size={14} />
          </span>
          <span className="text-[12px] font-semibold">Lead economics</span>
          <span className="ui-mono ml-auto text-[10px] text-[var(--ui-muted)]">{LEAD.id}</span>
        </div>
        <div className="mt-3 space-y-1.5 text-[10.5px]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ui-muted)]">Income · Advertiser D (CPA)</span>
            <span className="ui-mono font-semibold text-[#1f7a43]">+$1,000.00</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--ui-muted)]">Commission · Affiliate #214</span>
            <span className="ui-mono font-semibold text-[var(--ui-red)]">−$650.00</span>
          </div>
        </div>
        <div className="mt-2.5 flex items-end justify-between border-t border-[var(--ui-line)] pt-2.5">
          <span className="text-[10.5px] font-semibold">Profit on this lead</span>
          <span data-tour="finance-profit" className="ui-num text-[22px] font-semibold tracking-[-0.03em] text-[#1f7a43]">
            +$350.00
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[9.5px] text-[var(--ui-muted)]">
          <IconCheck size={11} className="text-[var(--ui-green)]" />
          Invoice INV-2026-1042 updated · affiliate balance credited
        </div>
      </div>
    </>
  );
}

/** The lead's journey through GetLinked, laid out as one live operations view. */
export function FlowView() {
  return (
    <div data-tour="flow" className="invisible absolute inset-0 opacity-0">
      <div className="absolute left-6 top-[16px] text-[10px] text-[var(--ui-faint)]">
        Leads › <span className="text-[var(--ui-text)]">{LEAD.id}</span>
      </div>
      <div className="absolute left-6 top-[32px] flex items-center gap-3">
        <span className="text-[20px] font-semibold tracking-[-0.025em]">Lead journey</span>
      </div>
      <div className="absolute right-6 top-[36px] flex items-center gap-2 text-[10.5px] text-[var(--ui-muted)]">
        <IconClock size={13} />
        <Stack className="justify-items-end">
          <span data-tour="clock-1" className="ui-mono font-medium text-[var(--ui-text)]">14:09:22 UTC</span>
          <span data-tour="clock-2" className="ui-mono invisible font-medium text-[var(--ui-text)] opacity-0">
            18:09:22 UTC · 4 hours later
          </span>
          <span data-tour="clock-3" className="ui-mono invisible font-medium text-[var(--ui-text)] opacity-0">
            18:47:05 UTC
          </span>
        </Stack>
      </div>

      <LeadCard />
      <EventLog />
      <BucketPanel />
      {ADVERTISERS.map((_, i) => (
        <AdvertiserNode key={i} index={i} />
      ))}
      <LiveKpis />
      <SlotCards />

      {/* Connections and the travelling lead */}
      <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1056" height="764" aria-hidden="true">
        {Object.entries(PATHS).map(([key, d]) => (
          <g key={key}>
            <path d={d} fill="none" stroke="#c9d1df" strokeWidth="1.5" strokeDasharray="3 4" data-path-base={key} className="opacity-0" />
            <path
              id={`gl-path-${key}`}
              d={d}
              fill="none"
              stroke={key === 'postback' ? '#2fa35b' : key === 'recycle' ? '#5b3fd8' : '#3159c9'}
              strokeWidth="2.2"
              strokeLinecap="round"
              data-path={key}
            />
          </g>
        ))}
      </svg>
      <div
        data-tour="packet"
        className="pointer-events-none absolute left-0 top-0 h-3.5 w-3.5 rounded-full bg-[#3159c9] opacity-0 shadow-[0_0_0_4px_rgba(49,89,201,0.18),0_0_16px_4px_rgba(49,89,201,0.45)]"
      />
      <div
        data-tour="packet-pb"
        className="pointer-events-none absolute left-0 top-0 h-3.5 w-3.5 rounded-full bg-[var(--ui-green)] opacity-0 shadow-[0_0_0_4px_rgba(47,163,91,0.18),0_0_16px_4px_rgba(47,163,91,0.45)]"
      />
      <div
        data-tour="toast-routed"
        className="invisible absolute flex items-center gap-1.5 rounded-full bg-[var(--ui-navy)] px-3 py-1.5 text-[10px] font-semibold tracking-[0.02em] text-white opacity-0 shadow-[0_10px_24px_-8px_rgba(12,23,54,0.6)]"
        style={{ left: FLOW.nodes.x + 52, top: FLOW.nodes.ys[2] - 13 }}
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--ui-green)]">
          <IconCheck size={9} />
        </span>
        LEAD ROUTED
      </div>
    </div>
  );
}
