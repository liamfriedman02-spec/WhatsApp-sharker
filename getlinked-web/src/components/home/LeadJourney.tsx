'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { useRef, useState, useSyncExternalStore } from 'react';
import logo from '@/components/site/getlinked-logo.svg';
import { useReducedMotion } from '@/lib/useReducedMotion';

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger, useGSAP);

type P = { x: number; y: number };
type Size = { w: number; h: number };
type Layout = 'h' | 'v';

const AFFILIATES = [
  { id: '#214', sub: 'CA · Finance' },
  { id: '#318', sub: 'UK · Crypto' },
  { id: '#102', sub: 'IT · iGaming' },
];
const ADVERTISERS = ['A', 'B', 'C', 'D'];

const ADVERTISER_SAYS = [
  ['idle', 'idle', 'Ready'],
  ['cap', 'amber', 'Cap reached'],
  ['budget', 'amber', 'No budget'],
  ['eligible', 'green', 'Eligible'],
  ['received', 'green', 'Lead received'],
  ['quiet', 'slate', 'No conversion'],
  ['ftd', 'solid', 'FTD'],
] as const;

const CORE_SAYS = [
  ['idle', 'Waiting for traffic'],
  ['validate', 'Validating lead'],
  ['bucket', 'Matching bucket'],
  ['route', 'Routing'],
  ['wait', '4 hours later'],
  ['recycle', 'Lead Recycling'],
  ['postback', 'Postback received'],
  ['settle', 'Profit settled'],
] as const;

/** The lead's event log. Sample data, written the way GetLinked records it. */
const LOG = [
  { time: '14:09:02', title: 'Click tracked', detail: 'Affiliate #214 · sub ID fb_cmp_17', tone: 'green' },
  { time: '14:09:02', title: 'Lead validated', detail: 'Quality 82/100 · not a duplicate', tone: 'green' },
  { time: '14:09:03', title: 'Bucket matched', detail: 'CA · Finance · Tier 1', tone: 'green' },
  { time: '14:09:03', title: 'Advertiser A skipped', detail: 'Daily cap 50/50', tone: 'amber' },
  { time: '14:09:03', title: 'Advertiser B skipped', detail: 'Budget used', tone: 'amber' },
  { time: '14:09:03', title: 'Routed to Advertiser C', detail: 'GEO, schedule, cap and budget passed', tone: 'green' },
  { time: '18:09:03', title: 'Lead Recycling', detail: 'No conversion in 4 hours', tone: 'violet' },
  { time: '18:09:04', title: 'Routed to Advertiser D', detail: 'Skipped A, B and C', tone: 'violet' },
  { time: '19:42:10', title: 'FTD', detail: 'Postback received · payout $1,000.00', tone: 'green' },
  { time: '19:42:10', title: 'Commission and profit', detail: '$650.00 to #214 · $350.00 profit', tone: 'green' },
] as const;

const GEOMETRY: Record<
  Layout,
  { w: number; h: number; aff: P[]; affSize: Size; core: P; coreSize: Size; adv: P[]; advSize: Size; tags: Record<'income' | 'commission' | 'profit', P> }
> = {
  h: {
    w: 1000,
    h: 680,
    aff: [
      { x: 105, y: 150 },
      { x: 105, y: 340 },
      { x: 105, y: 530 },
    ],
    affSize: { w: 170, h: 66 },
    core: { x: 500, y: 340 },
    coreSize: { w: 156, h: 150 },
    adv: [
      { x: 885, y: 115 },
      { x: 885, y: 265 },
      { x: 885, y: 415 },
      { x: 885, y: 565 },
    ],
    advSize: { w: 190, h: 74 },
    tags: { income: { x: 700, y: 520 }, commission: { x: 300, y: 216 }, profit: { x: 500, y: 468 } },
  },
  v: {
    w: 360,
    h: 600,
    aff: [
      { x: 62, y: 52 },
      { x: 180, y: 52 },
      { x: 298, y: 52 },
    ],
    affSize: { w: 106, h: 54 },
    core: { x: 180, y: 290 },
    coreSize: { w: 136, h: 122 },
    adv: [
      { x: 46, y: 538 },
      { x: 136, y: 538 },
      { x: 226, y: 538 },
      { x: 316, y: 538 },
    ],
    advSize: { w: 84, h: 70 },
    tags: { income: { x: 278, y: 432 }, commission: { x: 92, y: 166 }, profit: { x: 180, y: 192 } },
  },
};

// Other leads drifting through the system while we follow ours: [affiliate, advertiser].
const AMBIENT: [number, number][] = [
  [1, 0],
  [2, 3],
  [0, 1],
  [1, 2],
  [2, 1],
  [0, 3],
  [1, 3],
  [2, 0],
];

const COLOR = { blue: '#8fc0ff', emerald: '#19be8f', amber: '#f5b44a', violet: '#8b7bff', mint: '#b9ffe6' };

function paths(layout: Layout) {
  const g = GEOMETRY[layout];
  const h = layout === 'h';
  const f = (p: P) => `${p.x} ${p.y}`;
  const affOut = (i: number) => (h ? { x: g.aff[i].x + g.affSize.w / 2, y: g.aff[i].y } : { x: g.aff[i].x, y: g.aff[i].y + g.affSize.h / 2 });
  const advIn = (j: number) => (h ? { x: g.adv[j].x - g.advSize.w / 2, y: g.adv[j].y } : { x: g.adv[j].x, y: g.adv[j].y - g.advSize.h / 2 });
  const coreIn = h ? { x: g.core.x - g.coreSize.w / 2, y: g.core.y } : { x: g.core.x, y: g.core.y - g.coreSize.h / 2 };
  const coreOut = h ? { x: g.core.x + g.coreSize.w / 2, y: g.core.y } : { x: g.core.x, y: g.core.y + g.coreSize.h / 2 };
  // Smooth S-curves that leave and arrive along the layout's main axis.
  const cubic = (a: P, b: P) => {
    if (h) {
      const d = (b.x - a.x) * 0.55;
      return `C${a.x + d} ${a.y} ${b.x - d} ${b.y} ${f(b)}`;
    }
    const d = (b.y - a.y) * 0.55;
    return `C${a.x} ${a.y + d} ${b.x} ${b.y - d} ${f(b)}`;
  };
  const into = (i: number) => `M${f(affOut(i))} ${cubic(affOut(i), coreIn)} L${f(g.core)}`;
  const tail = (j: number) => `L${f(coreOut)} ${cubic(coreOut, advIn(j))}`;
  return {
    into: g.aff.map((_, i) => into(i)),
    out: g.adv.map((_, j) => `M${f(g.core)} ${tail(j)}`),
    ambient: AMBIENT.map(([i, j]) => `${into(i)} ${tail(j)}`),
  };
}

const narrowQuery = '(max-width: 639px)';
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(narrowQuery);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * One lead's trip through GetLinked, played on a loop: tracked, validated, matched to a
 * bucket, skipped by two advertisers, routed, recycled, converted and paid out.
 */
export function LeadJourney() {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const layout: Layout = useSyncExternalStore(subscribe, () => (window.matchMedia(narrowQuery).matches ? 'v' : 'h'), () => 'h');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const sync = useRef<() => void>(() => {});
  const g = GEOMETRY[layout];
  const d = paths(layout);
  const k = layout === 'h' ? 1 : 0.85;

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const one = (sel: string) => q(sel)[0] as HTMLElement;
      const path = (id: string) => q(`[data-path="${id}"]`)[0] as unknown as SVGPathElement;
      const along = (id: string, start = 0, end = 1) => ({
        motionPath: { path: path(id), align: path(id), alignOrigin: [0.5, 0.5] as [number, number], start, end },
      });
      const dot = one('[data-j="dot"]');
      const dotCore = one('[data-j="dot-core"]');
      const pulse = one('[data-j="pulse"]');
      const tags = q('[data-tag]');
      const lanes = q('[data-hi]');

      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6, defaults: { ease: 'power1.inOut' } });
      const state = (sel: string, value: string, t: number) => tl.set(q(sel), { attr: { 'data-state': value } }, t);
      const log = (i: number, t: number) => tl.set(q(`[data-log="${i}"]`), { attr: { 'data-on': 'true' } }, t);
      const lane = (id: string, color: string, opacity: number, t: number, duration = 0.35) =>
        tl.to(one(`[data-hi="${id}"]`), { color, opacity, duration }, t);

      // Tracked: the click arrives from Affiliate #214.
      state('[data-j="aff0"]', 'active', 0.2);
      tl.set(dot, { autoAlpha: 1 }, 0.3);
      log(0, 0.3);
      lane('in0', COLOR.blue, 1, 0.3, 0.4);
      tl.to(dot, { ...along('in0'), duration: 1.4 }, 0.3);
      lane('in0', COLOR.blue, 0.3, 1.9, 0.5);

      // Validated and matched to a bucket.
      state('[data-j="core"]', 'validate', 1.7);
      log(1, 1.75);
      state('[data-j="core"]', 'bucket', 2.4);
      log(2, 2.45);

      // Advertisers in priority order: A is capped, B is out of budget, C can take it.
      lane('out0', COLOR.amber, 1, 3.0, 0.25);
      state('[data-j="adv0"]', 'cap', 3.05);
      log(3, 3.05);
      lane('out0', COLOR.amber, 0.15, 3.45, 0.4);
      lane('out1', COLOR.amber, 1, 3.6, 0.25);
      state('[data-j="adv1"]', 'budget', 3.65);
      log(4, 3.65);
      lane('out1', COLOR.amber, 0.15, 4.05, 0.4);
      lane('out2', COLOR.emerald, 1, 4.2, 0.3);
      state('[data-j="adv2"]', 'eligible', 4.25);
      state('[data-j="core"]', 'route', 4.25);
      tl.to(dot, { ...along('out2'), duration: 1.0 }, 4.5);
      state('[data-j="adv2"]', 'received', 5.5);
      state('[data-j="status"]', 'routed', 5.5);
      log(5, 5.5);

      // Four hours, no conversion: Lead Recycling sends it on to D.
      state('[data-j="core"]', 'wait', 6.3);
      state('[data-j="adv2"]', 'quiet', 6.3);
      log(6, 6.35);
      lane('out2', COLOR.violet, 1, 6.9, 0.3);
      state('[data-j="core"]', 'recycle', 6.9);
      tl.to(dot, { ...along('out2', 1, 0), duration: 0.9 }, 7.0);
      lane('out2', COLOR.violet, 0.2, 7.95, 0.4);
      lane('out3', COLOR.violet, 1, 7.95, 0.3);
      tl.to(dot, { ...along('out3'), duration: 1.0 }, 8.0);
      state('[data-j="adv3"]', 'received', 9.0);
      state('[data-j="status"]', 'recycled', 9.0);
      log(7, 9.0);

      // Converted: D reports an FTD by postback.
      state('[data-j="adv3"]', 'ftd', 9.9);
      state('[data-j="core"]', 'postback', 9.95);
      state('[data-j="status"]', 'converted', 9.95);
      log(8, 9.95);
      tl.to(dotCore, { attr: { fill: COLOR.mint }, duration: 0.3 }, 9.9);
      lane('out3', COLOR.emerald, 1, 9.9, 0.3);
      tl.set(pulse, { autoAlpha: 1, color: COLOR.emerald }, 9.9);
      tl.to(pulse, { ...along('out3', 1, 0), duration: 0.9, ease: 'power2.in' }, 9.9);
      tl.set(pulse, { autoAlpha: 0 }, 10.8);
      tl.to(one('[data-tag="income"]'), { autoAlpha: 1, duration: 0.35 }, 10.8);

      // Paid: commission goes back to the affiliate, the rest is profit.
      lane('in0', COLOR.blue, 1, 11.2, 0.3);
      tl.set(pulse, { autoAlpha: 1, color: COLOR.blue }, 11.2);
      tl.to(pulse, { ...along('in0', 1, 0), duration: 1.0 }, 11.2);
      tl.set(pulse, { autoAlpha: 0 }, 12.2);
      tl.to(one('[data-tag="commission"]'), { autoAlpha: 1, duration: 0.35 }, 11.7);
      state('[data-j="core"]', 'settle', 12.3);
      log(9, 12.3);
      tl.to(one('[data-tag="profit"]'), { autoAlpha: 1, duration: 0.35 }, 12.35);
      tl.addLabel('final', 12.9);

      // Clear the stage before the next lead.
      tl.to([dot, ...tags], { autoAlpha: 0, duration: 0.5 }, 15.4);
      tl.to(lanes, { opacity: 0, duration: 0.5 }, 15.4);
      tl.set({}, {}, 16);

      if (reduce) {
        tl.seek('final').pause();
        return;
      }

      const drift = q('[data-j="amb"]').map((el, n) => {
        const dur = 3.4 + (n % 3) * 0.7;
        return gsap
          .timeline({ paused: true, repeat: -1, delay: n * 0.55 })
          .to(el, { ...along(`amb${n}`), duration: dur, ease: 'none' }, 0)
          .fromTo(el, { opacity: 0 }, { opacity: 0.55, duration: 0.4 }, 0)
          .to(el, { opacity: 0, duration: 0.4 }, dur - 0.4);
      });

      // Play only while on screen, and never while the visitor has paused it.
      let visible = false;
      sync.current = () => {
        const run = visible && !pausedRef.current;
        for (const t of [tl, ...drift]) {
          if (run) t.play();
          else t.pause();
        }
      };
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top 85%',
        end: 'bottom 15%',
        onToggle: (self) => {
          visible = self.isActive;
          sync.current();
        },
      });
    },
    { scope: root, dependencies: [layout, reduce], revertOnUpdate: true },
  );

  const toggle = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    sync.current();
  };

  return (
    <div ref={root} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-6">
      {/* The system */}
      <div className="journey-panel relative flex items-center overflow-hidden rounded-[28px] border border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(157_175_195/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(157_175_195/0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]"
        />
        <div
          className="journey-stage relative w-full"
          data-layout={layout}
          style={{ aspectRatio: `${g.w} / ${g.h}` }}
          role="img"
          aria-label="Animation: a lead from Affiliate #214 is tracked, validated, skipped by advertisers A and B, routed to C, recycled to D after four hours without a conversion, and converts as an FTD."
        >
          <svg viewBox={`0 0 ${g.w} ${g.h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <radialGradient id="j-glow">
                <stop offset="0%" stopColor="#8fc0ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3977e8" stopOpacity="0" />
              </radialGradient>
            </defs>
            {d.into.map((p, i) => (
              <path key={`in${i}`} d={p} className="j-lane" />
            ))}
            {d.out.map((p, j) => (
              <path key={`out${j}`} d={p} className="j-lane" />
            ))}
            <path data-path="in0" data-hi="in0" d={d.into[0]} className="j-hi" stroke="currentColor" />
            {d.out.map((p, j) => (
              <path key={`hi${j}`} data-path={`out${j}`} data-hi={`out${j}`} d={p} className="j-hi" stroke="currentColor" />
            ))}
            {d.ambient.map((p, n) => (
              <path key={`amb${n}`} data-path={`amb${n}`} d={p} fill="none" stroke="none" />
            ))}
            {d.ambient.map((_, n) => (
              <circle key={`dot${n}`} data-j="amb" r={2.6 * k} fill="#8fc0ff" opacity="0" />
            ))}
            <g data-j="pulse" style={{ visibility: 'hidden' }}>
              <circle r={14 * k} fill="currentColor" opacity="0.22" />
              <circle r={5 * k} fill="currentColor" />
            </g>
            <g data-j="dot" style={{ visibility: 'hidden' }}>
              <circle r={22 * k} fill="url(#j-glow)" />
              <circle data-j="dot-core" r={6.5 * k} fill="#eaf4ff" />
            </g>
          </svg>

          {AFFILIATES.map((a, i) => (
            <div
              key={a.id}
              data-j={`aff${i}`}
              data-state="idle"
              className="j-node items-start"
              style={{
                left: pct(g.aff[i].x, g.w),
                top: pct(g.aff[i].y, g.h),
                width: `calc(var(--u) * ${g.affSize.w})`,
                minHeight: `calc(var(--u) * ${g.affSize.h})`,
                padding: `0 calc(var(--u) * ${layout === 'h' ? 16 : 10})`,
              }}
            >
              <span className="j-title">{layout === 'h' ? `Affiliate ${a.id}` : a.id}</span>
              <span className="j-sub">{a.sub}</span>
            </div>
          ))}

          <div
            data-j="core"
            data-state="idle"
            className="j-core"
            style={{
              left: pct(g.core.x, g.w),
              top: pct(g.core.y, g.h),
              width: `calc(var(--u) * ${g.coreSize.w})`,
              height: `calc(var(--u) * ${g.coreSize.h})`,
            }}
          >
            <span className="j-core-ring" />
            <span className="j-core-ring" />
            <Image src={logo} alt="" unoptimized className="h-auto" style={{ width: `calc(var(--u) * ${layout === 'h' ? 104 : 96})` }} />
            <span className="j-core-status j-say">
              {CORE_SAYS.map(([when, text]) => (
                <span key={when} data-when={when}>
                  {text}
                </span>
              ))}
            </span>
          </div>

          {ADVERTISERS.map((key, j) => (
            <div
              key={key}
              data-j={`adv${j}`}
              data-state="idle"
              className="j-node items-start"
              style={{
                left: pct(g.adv[j].x, g.w),
                top: pct(g.adv[j].y, g.h),
                width: `calc(var(--u) * ${g.advSize.w})`,
                minHeight: `calc(var(--u) * ${g.advSize.h})`,
                padding: `0 calc(var(--u) * ${layout === 'h' ? 16 : 8})`,
              }}
            >
              <span className="j-title">{layout === 'h' ? `Advertiser ${key}` : key}</span>
              <span className="j-say">
                {ADVERTISER_SAYS.map(([when, tone, text]) => (
                  <span key={when} data-when={when} className={`j-chip j-chip-${tone}`}>
                    {text}
                  </span>
                ))}
              </span>
            </div>
          ))}

          <span data-tag="income" className="j-tag text-emerald" style={{ left: pct(g.tags.income.x, g.w), top: pct(g.tags.income.y, g.h) }}>
            +$1,000.00
          </span>
          <span data-tag="commission" className="j-tag text-[#8fc0ff]" style={{ left: pct(g.tags.commission.x, g.w), top: pct(g.tags.commission.y, g.h) }}>
            −$650.00
          </span>
          <span data-tag="profit" className="j-tag text-emerald-hi" style={{ left: pct(g.tags.profit.x, g.w), top: pct(g.tags.profit.y, g.h) }}>
            {layout === 'h' ? 'Profit +$350.00' : '+$350.00'}
          </span>
        </div>
      </div>

      {/* The lead's own record */}
      <div className="flex flex-col rounded-[28px] border border-line bg-ink-900/50 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.875rem] font-semibold text-fg">GL-48213</span>
          <span data-j="status" data-state="new" className="j-status inline-grid text-[0.75rem] font-semibold">
            <span data-when="new" className="rounded-full bg-blue/20 px-2.5 py-0.5 text-[#b9d4ff]">
              New lead
            </span>
            <span data-when="routed" className="rounded-full bg-emerald/15 px-2.5 py-0.5 text-[#7ff0cb]">
              Routed
            </span>
            <span data-when="recycled" className="rounded-full bg-[#8b7bff]/20 px-2.5 py-0.5 text-[#c5bdff]">
              Recycled
            </span>
            <span data-when="converted" className="rounded-full bg-emerald px-2.5 py-0.5 text-ink-950">
              Converted
            </span>
          </span>
          {!reduce && (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={paused}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] text-slate ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.05] hover:text-fg"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true" fill="currentColor">
                {paused ? <path d="M3 1.8v8.4L10 6z" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />}
              </svg>
              {paused ? 'Play' : 'Pause'}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[0.8125rem] text-slate-dim">Affiliate #214 · Canada · Finance · Tier 1</p>

        <ol className="mt-4 flex-1 divide-y divide-line border-t border-line" aria-label="Lead event log">
          {LOG.map((row, i) => (
            <li key={row.title} data-log={i} data-on="false" data-tone={row.tone} className="j-log-row grid grid-cols-[auto_1fr] gap-x-3 py-[0.45rem]">
              <span className="j-log-dot mt-[0.4rem] h-1.5 w-1.5 rounded-full bg-slate-dim/50" />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-[0.875rem] font-medium text-fg">{row.title}</span>
                  <span className="ml-auto font-mono text-[0.6875rem] text-slate-dim">{row.time}</span>
                </span>
                <span className="block text-[0.8125rem] leading-snug text-slate">{row.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[0.75rem] text-slate-dim">Sample lead. Times show when each event was recorded.</p>
      </div>
    </div>
  );
}
