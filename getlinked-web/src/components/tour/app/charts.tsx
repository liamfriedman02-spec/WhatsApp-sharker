/** Small, deterministic SVG charts for the product UI. */

export function seeded(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clicks, leads and conversions per hour, as grouped bars. */
export function HourlyBars({ width, height }: { width: number; height: number }) {
  const rand = seeded(42);
  const hours = 24;
  const pad = { l: 26, r: 6, t: 6, b: 18 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const slot = w / hours;
  const max = 30;
  const curve = (i: number) => 0.35 + 0.65 * Math.sin(((i - 4) / 24) * Math.PI) ** 2;
  const bars = Array.from({ length: hours }, (_, i) => {
    const clicks = Math.max(2, curve(i) * (8 + rand() * 20));
    return { clicks, leads: clicks * (0.16 + rand() * 0.08), conv: clicks * (0.03 + rand() * 0.03) };
  });
  const y = (v: number) => pad.t + h - (v / max) * h;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {[0, 10, 20, 30].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="#eef0f5" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="8" fill="#98a2b3">
            {v ? `${v}k` : '0'}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = pad.l + i * slot + slot * 0.18;
        const bw = slot * 0.2;
        return (
          <g key={i}>
            <rect x={x} y={y(b.clicks)} width={bw} height={y(0) - y(b.clicks)} rx={1} fill="#5b3fd8" />
            <rect x={x + bw + 1} y={y(b.leads)} width={bw} height={y(0) - y(b.leads)} rx={1} fill="#45b36b" />
            <rect x={x + 2 * bw + 2} y={y(b.conv)} width={bw} height={y(0) - y(b.conv)} rx={1} fill="#f07a3a" />
          </g>
        );
      })}
      {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00'].map((label, i) => (
        <text
          key={label}
          x={pad.l + (i / 6) * w}
          y={height - 4}
          textAnchor={i === 0 ? 'start' : i === 6 ? 'end' : 'middle'}
          fontSize="8"
          fill="#98a2b3"
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

export type Slice = { label: string; value: number; color: string };

export function Donut({
  slices,
  size,
  stroke,
  total,
  caption,
}: {
  slices: Slice[];
  size: number;
  stroke: number;
  total: string;
  caption: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = slices.reduce((a, s) => a + s.value, 0);
  const lengths = slices.map((s) => (s.value / sum) * c);
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((a, l) => a + l, 0));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        {slices.map((s, i) => (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(0, lengths[i] - 2)} ${c}`}
            strokeDashoffset={-offsets[i]}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="ui-num text-[17px] font-semibold tracking-[-0.02em]">{total}</span>
        <span className="text-[8.5px] text-[var(--ui-faint)]">{caption}</span>
      </div>
    </div>
  );
}

/** Tiny bar sparkline used on KPI cards; the last bar is highlighted. */
export function Spark({ seed, accent = '#45b36b' }: { seed: number; accent?: string }) {
  const rand = seeded(seed);
  const values = Array.from({ length: 8 }, () => 0.35 + rand() * 0.65);
  values[7] = 1;
  return (
    <svg width="40" height="18" viewBox="0 0 40 18" aria-hidden="true">
      {values.map((v, i) => (
        <rect key={i} x={i * 5} y={18 - v * 18} width="3" height={v * 18} rx="1" fill={i === 7 ? accent : '#d9dde6'} />
      ))}
    </svg>
  );
}

/** A soft area chart for trends. */
export function AreaTrend({
  width,
  height,
  seed,
  color,
  rising = true,
}: {
  width: number;
  height: number;
  seed: number;
  color: string;
  rising?: boolean;
}) {
  const rand = seeded(seed);
  const n = 14;
  const pts = Array.from({ length: n }, (_, i) => {
    const base = rising ? 0.3 + (i / n) * 0.45 : 0.75 - (i / n) * 0.4;
    return base + (rand() - 0.5) * 0.22;
  });
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => height - 4 - v * (height - 10);
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const id = `area-${seed}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(pts[n - 1])} r="2.6" fill={color} />
    </svg>
  );
}
