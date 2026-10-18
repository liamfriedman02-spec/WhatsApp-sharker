import type { ReactNode } from 'react';
import { DEMO_URL } from '@/components/site/links';

const C = {
  brand: '#0b6448',
  accent: '#0e7d5a',
  pale: '#a6dcc2',
  tint: '#def1e6',
  line: '#d0e3d8',
  money: '#12935f',
  gold: '#d2ae62',
  violet: '#6a4ddb',
  amber: '#c77a07',
  slate: '#98a2b3',
};

/** A dot that travels along a path, on a loop. Hidden when the visitor prefers reduced motion. */
function Traveller({ path, dur, begin = '0s', r = 3.5, color }: { path: string; dur: string; begin?: string; r?: number; color: string }) {
  return (
    <g className="svg-motion">
      <circle r={r * 2.4} fill={color} opacity="0.18">
        <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
      </circle>
      <circle r={r} fill={color}>
        <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
      </circle>
    </g>
  );
}

/** A small person: head and shoulders inside a coloured circle. */
function Person({ x, y, r, bg }: { x: number; y: number; r: number; bg: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 3} fill="#fff" />
      <circle cx={x} cy={y} r={r} fill={bg} />
      <circle cx={x} cy={y - r * 0.2} r={r * 0.3} fill="#fff" />
      <path d={`M${x - r * 0.55} ${y + r * 0.62} a${r * 0.55} ${r * 0.5} 0 0 1 ${r * 1.1} 0 Z`} fill="#fff" />
    </g>
  );
}

function Tag({ x, y, w, text, color }: { x: number; y: number; w: number; text: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={17} rx={8.5} fill="#fff" stroke={C.line} />
      <circle cx={x + 9} cy={y + 8.5} r={2.6} fill={color} />
      <text x={x + 16} y={y + 12} fontSize="8.5" fontWeight="600" fill="#33405c" style={{ fontFamily: 'var(--font-sans)' }}>
        {text}
      </text>
    </g>
  );
}

/** CR Boost: unconverted leads loop back through recycling and come out as conversions. */
function BoostArt() {
  const chips = [
    { y: 40, dot: C.slate },
    { y: 78, dot: C.accent },
    { y: 116, dot: C.slate },
  ];
  return (
    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
      <defs>
        <marker id="pl-arrow-v" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M1 1l5 3-5 3" fill="none" stroke={C.violet} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {chips.map((c) => (
        <path key={c.y} d={`M96 ${c.y + 11} C126 ${c.y + 11}, 128 88, 150 88`} fill="none" stroke={C.pale} strokeWidth="2" />
      ))}
      <path d="M214 88 H236" stroke={C.money} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M165 55 C165 14, 70 12, 58 32" fill="none" stroke={C.violet} strokeWidth="1.8" strokeDasharray="4 4" markerEnd="url(#pl-arrow-v)" />
      {chips.map((c) => (
        <g key={`chip${c.y}`}>
          <rect x={22} y={c.y} width={74} height={22} rx={11} fill="#fff" stroke={C.line} />
          <circle cx={34} cy={c.y + 11} r={4} fill={c.dot} />
          <rect x={44} y={c.y + 8} width={40} height={6} rx={3} fill="#e3e8f2" />
        </g>
      ))}
      <circle cx={182} cy={88} r={34} fill="#fff" stroke={C.violet} strokeWidth="3" />
      <circle cx={182} cy={88} r={24} fill="#efeaff" />
      <g transform="translate(170 76)" fill="none" stroke={C.violet} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="6s" repeatCount="indefinite" />
          <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
          <path d="M4 3.5V8h4.5" />
          <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
          <path d="M20 20.5V16h-4.5" />
        </g>
      </g>
      {chips.map((c, i) => (
        <Traveller key={`t${c.y}`} path={`M96 ${c.y + 11} C126 ${c.y + 11}, 128 88, 150 88`} dur="2.4s" begin={`${i * 0.8}s`} r={3} color={c.dot === C.slate ? C.violet : C.accent} />
      ))}
      <Traveller path="M165 55 C165 14, 70 12, 58 32" dur="3.2s" begin="0.4s" r={3} color={C.violet} />
      <Traveller path="M214 88 H236" dur="1.6s" r={3} color={C.money} />
      <rect x={236} y={52} width={66} height={72} rx={14} fill="#fff" stroke={C.line} />
      <circle cx={252} cy={68} r={8} fill={C.money} />
      <path d="M248.5 68.2l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={248 + i * 12} y={112 - (10 + i * 7)} width={8} height={10 + i * 7} rx={2.5} fill={i === 3 ? C.money : '#a8dcbf'} />
      ))}
      <Tag x={108} y={136} w={74} text="Recycled" color={C.violet} />
      <Tag x={236} y={136} w={68} text="Converted" color={C.money} />
    </svg>
  );
}

/** Partner Platform: affiliates and advertisers around GetLinked, under one set of permissions. */
function PartnersArt() {
  const left = [
    { x: 64, y: 50, bg: C.accent },
    { x: 64, y: 118, bg: C.violet },
  ];
  const right = [
    { x: 256, y: 50, bg: C.gold },
    { x: 256, y: 118, bg: '#2f6fb0' },
  ];
  return (
    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="pl-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fae80" stopOpacity="0.55" />
          <stop offset="1" stopColor={C.brand} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[...left, ...right].map((p) => (
        <path key={`${p.x}-${p.y}`} d={`M${p.x} ${p.y} L160 84`} stroke={C.pale} strokeWidth="2" />
      ))}
      <path d="M160 84 L160 26" stroke={C.pale} strokeWidth="2" />
      {[...left, ...right].map((p, i) => (
        <Traveller key={`t${p.x}-${p.y}`} path={i % 2 ? `M160 84 L${p.x} ${p.y}` : `M${p.x} ${p.y} L160 84`} dur="2.2s" begin={`${i * 0.55}s`} r={2.8} color={i < 2 ? C.accent : C.gold} />
      ))}
      <rect x={124} y={50} width={72} height={68} rx={20} fill="none" stroke={C.accent} strokeWidth="1.5" className="svg-motion">
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.8s" repeatCount="indefinite" />
      </rect>
      <rect x={130} y={56} width={60} height={56} rx={16} fill={C.brand} />
      <rect x={130} y={56} width={60} height={56} rx={16} fill="url(#pl-core)" />
      <text x={160} y={94} textAnchor="middle" fontSize="30" fontWeight="700" fill="#fff" style={{ fontFamily: 'var(--font-display)' }}>
        g
      </text>
      <Person x={160} y={24} r={14} bg={C.pale} />
      {left.map((p) => (
        <Person key={`l${p.y}`} {...p} r={17} />
      ))}
      {right.map((p) => (
        <Person key={`r${p.y}`} {...p} r={17} />
      ))}
      <Tag x={18} y={140} w={64} text="Affiliate" color={C.accent} />
      <Tag x={230} y={140} w={74} text="Advertiser" color={C.money} />
      <g>
        <rect x={115} y={134} width={90} height={22} rx={11} fill="#fff" stroke={C.line} />
        <path d="M128 139.5l6 2.2v4c0 3.4-2.6 5.6-6 6.8-3.4-1.2-6-3.4-6-6.8v-4z" fill={C.tint} stroke={C.accent} strokeWidth="1.3" strokeLinejoin="round" />
        <text x={139} y={148.5} fontSize="9" fontWeight="600" fill="#33405c" style={{ fontFamily: 'var(--font-sans)' }}>
          Permissions
        </text>
      </g>
    </svg>
  );
}

/** Lead Distribution: one lead, three buyers, and the one that can take it. */
function RoutingArt() {
  return (
    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
      <path d="M56 85 H112" stroke={C.accent} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M150 85 C190 85, 196 36, 238 36" fill="none" stroke={C.amber} strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
      <path d="M150 85 H238" stroke={C.money} strokeWidth="3" strokeLinecap="round" />
      <path d="M150 85 C190 85, 196 134, 238 134" fill="none" stroke={C.slate} strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      <circle cx={40} cy={85} r={22} fill={C.accent} opacity="0.14">
        <animate attributeName="r" values="16;24;16" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <Traveller path="M40 85 H238" dur="2.4s" r={3.2} color={C.money} />
      <Traveller path="M150 85 C190 85, 196 36, 238 36" dur="3s" begin="0.6s" r={2.6} color={C.amber} />
      <circle cx={40} cy={85} r={9} fill={C.accent} />
      <circle cx={40} cy={85} r={4} fill="#fff" />
      <rect x={112} y={65} width={40} height={40} rx={12} fill="#fff" stroke={C.line} />
      <g transform="translate(120 73)" fill="none" stroke={C.accent} strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
        <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
        <path d="M3 12l9 4.5 9-4.5" />
        <path d="M3 16.5L12 21l9-4.5" opacity="0.5" />
      </g>
      <Person x={262} y={36} r={16} bg="#e7b25b" />
      <Person x={262} y={85} r={18} bg={C.money} />
      <Person x={262} y={134} r={16} bg="#c3cad8" />
      <circle cx={276} cy={24} r={7} fill="#fff4e0" stroke={C.amber} strokeWidth="1.4" />
      <path d="M273.5 21.5l5 5M278.5 21.5l-5 5" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={279} cy={71} r={8} fill={C.money} stroke="#fff" strokeWidth="2" />
      <path d="M275.5 71.2l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Tag x={168} y={14} w={70} text="Cap reached" color={C.amber} />
      <Tag x={174} y={94} w={56} text="Routed" color={C.money} />
      <Tag x={164} y={143} w={74} text="Outside hours" color={C.slate} />
    </svg>
  );
}

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const ICONS = {
  recycle: icon(
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </>,
  ),
  target: icon(
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>,
  ),
  insight: icon(
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>,
  ),
  users: icon(
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 13.8A5.5 5.5 0 0 1 20.5 19" />
    </>,
  ),
  pulse: icon(<path d="M3 12h4l2.5-6 5 12 2.5-6h4" />),
  wallet: icon(
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16 14.5h1.5" />
    </>,
  ),
  route: icon(
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="8" r="2.4" />
      <path d="M6 8.4v7.2M18 10.4c0 4-6 3-10.6 6" />
    </>,
  ),
  bolt: icon(<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />),
  sliders: icon(
    <>
      <path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>,
  ),
};

const PILLARS = [
  {
    name: 'CR Boost',
    dot: C.violet,
    title: 'Turn More Leads Into Revenue.',
    body: 'Get more value from the traffic you’ve already paid for.',
    art: <BoostArt />,
    features: [
      { icon: ICONS.recycle, title: 'Automated Lead Recycling', body: 'Give unconverted leads another opportunity to convert.' },
      { icon: ICONS.target, title: 'Conversion Optimization', body: 'Identify better-performing routes and buyers.' },
      { icon: ICONS.insight, title: 'Performance Insights', body: 'Use conversion data to make smarter decisions.' },
    ],
    cta: 'Unlock more value from every lead',
  },
  {
    name: 'Partner Platform',
    dot: C.accent,
    title: 'Your Entire Network. Under Control.',
    body: 'Run your affiliate business from one powerful dashboard.',
    art: <PartnersArt />,
    features: [
      { icon: ICONS.users, title: 'Partner Management', body: 'Manage affiliates, advertisers, offers and permissions.' },
      { icon: ICONS.pulse, title: 'Real-Time Analytics', body: 'Track clicks, leads, conversions and revenue.' },
      { icon: ICONS.wallet, title: 'Financial Control', body: 'Manage commissions, payouts and invoicing.' },
    ],
    cta: 'Run your network smarter',
  },
  {
    name: 'Lead Distribution',
    dot: C.money,
    title: 'Every Lead. The Right Buyer.',
    body: 'Take complete control of how traffic moves across your network.',
    art: <RoutingArt />,
    features: [
      { icon: ICONS.route, title: 'Intelligent Lead Routing', body: 'Distribute by GEO, caps, availability and custom rules.' },
      { icon: ICONS.bolt, title: 'High-Speed Lead Injection', body: 'Process and deliver high volumes of leads efficiently.' },
      { icon: ICONS.sliders, title: 'Automated Traffic Control', body: 'Manage buyer priorities, schedules and capacity automatically.' },
    ],
    cta: 'Distribute smarter. Scale faster',
  },
];

/** Three ways GetLinked grows a network, on the deep brand surface. */
export function Pillars() {
  return (
    <section id="grow" className="brand-surface relative scroll-mt-20 overflow-hidden py-24 text-white sm:py-32">
      <div aria-hidden="true" className="brand-glow pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="brand-grid pointer-events-none absolute inset-0" />

      <div className="container-page relative">
        <div className="max-w-[46rem]">
          <p className="text-[0.9375rem] font-semibold text-gold-hi">Solutions</p>
          <h2 className="headline-fill mt-3 font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] [text-wrap:balance]">
            One platform. Three ways to grow.
          </h2>
          <p className="mt-5 max-w-[38rem] text-[1.0625rem] leading-relaxed text-white/90 sm:text-[1.125rem]">
            Manage your partners, distribute traffic intelligently, and turn more leads into conversions.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:mt-16 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <article key={p.name} data-reveal className="flex flex-col rounded-[28px] bg-white p-3 text-ink shadow-[0_40px_80px_-40px_rgb(3_40_28/0.6)] transition-transform duration-500 ease-out-expo hover:-translate-y-1.5">
              <div className="h-[190px] rounded-[20px] bg-[radial-gradient(rgb(15_127_92/0.12)_1px,transparent_1px),linear-gradient(180deg,#e7f3ec,#f5f9f7)] bg-[size:16px_16px,auto] px-2 py-3">
                {p.art}
              </div>

              <div className="flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-5">
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-tint px-3 py-1 text-[0.8125rem] font-semibold text-brand">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: p.dot }} />
                  {p.name}
                </span>
                <h3 className="mt-4 font-display text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">{p.title}</h3>
                <p className="mt-3 text-[1rem] leading-relaxed text-muted">{p.body}</p>

                <ul className="mt-6 space-y-5 border-t border-line pt-6">
                  {p.features.map((f) => (
                    <li key={f.title} className="grid grid-cols-[36px_1fr] gap-x-3.5">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[11px] bg-tint text-accent">{f.icon}</span>
                      <span>
                        <span className="block text-[1rem] font-semibold tracking-[-0.01em]">{f.title}</span>
                        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-muted">{f.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={DEMO_URL}
                  className="group mt-auto inline-flex items-center gap-1.5 self-start pt-8 text-[0.9375rem] font-semibold text-brand transition-colors hover:text-accent"
                >
                  {p.cta}
                  <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
