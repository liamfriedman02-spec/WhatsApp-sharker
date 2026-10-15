'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

type State = 'good' | 'bad' | 'violet' | 'win';

/** One lead's trip through GetLinked, stop by stop. Sample data. */
const STOPS: { title: string; sub: string; state: State; chip: string; tone?: 'amber' | 'violet' | 'green'; note: string }[] = [
  { title: 'Click tracked', sub: 'Affiliate #214', state: 'good', chip: 'New lead', note: 'Affiliate #214 · Canada · Finance · sub ID fb_cmp_17' },
  { title: 'Validated', sub: 'Quality 82/100', state: 'good', chip: 'Validated', note: 'Not a duplicate · lead quality 82/100' },
  { title: 'Bucket', sub: 'CA · Finance · Tier 1', state: 'good', chip: 'In bucket', note: 'Checking 4 advertisers in priority order' },
  { title: 'Advertiser A', sub: 'Cap reached', state: 'bad', chip: 'Skipped A', tone: 'amber', note: 'Daily cap 50/50 reached' },
  { title: 'Advertiser B', sub: 'No budget', state: 'bad', chip: 'Skipped B', tone: 'amber', note: 'Budget used for today' },
  { title: 'Advertiser C', sub: 'Routed', state: 'good', chip: 'Routed to C', note: 'GEO, schedule, cap and budget passed' },
  { title: 'Lead Recycling', sub: 'No conversion in 4h', state: 'violet', chip: 'Recycled', tone: 'violet', note: 'No conversion in 4 hours, so it goes to the next advertiser' },
  { title: 'Advertiser D', sub: 'FTD', state: 'good', chip: 'Converted · FTD', tone: 'green', note: 'Postback received · payout $1,000.00' },
  { title: 'Profit', sub: '+$350.00', state: 'win', chip: 'Paid', tone: 'green', note: 'Commission $650.00 to Affiliate #214' },
];
const LAST = STOPS.length - 1;
const STEP_MS = 1350;
const HOLD_MS = 3600;

const Check = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 10.5l3.2 3.2L15 7" />
  </svg>
);
const Cross = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l8 8M14 6l-8 8" />
  </svg>
);
const Pending = ({ first }: { first: boolean }) =>
  first ? (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4l9 4-4 1.5L9.5 14z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" />
    </svg>
  );

/**
 * The lead's card travels along a track of stops: tracked, validated, matched to a bucket,
 * skipped by A and B, routed to C, recycled to D, converted, and paid out.
 */
export function LeadTrack() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const shown = reduce ? LAST : step;
  const stop = STOPS[shown];

  const track = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);

  // Move the card above the current stop and fill the line up to it.
  const place = useCallback(() => {
    const t = track.current;
    const c = card.current;
    const d = dots.current[shown];
    if (!t || !c || !d || !fill.current) return;
    const tr = t.getBoundingClientRect();
    const dr = d.getBoundingClientRect();
    if (window.matchMedia('(width < 54rem)').matches) {
      const first = dots.current[0]!.getBoundingClientRect();
      const top = first.top + first.height / 2 - tr.top;
      const span = tr.bottom - 23 - (tr.top + top);
      t.style.setProperty('--line-top', `${top}px`);
      t.style.setProperty('--fill', `${Math.max(0, ((dr.top + dr.height / 2 - tr.top - top) / span) * 100)}%`);
      return;
    }
    const x = dr.left + dr.width / 2 - tr.left;
    const w = c.offsetWidth;
    const left = Math.max(0, Math.min(tr.width - w, x - w / 2));
    fill.current.style.width = `${(x / tr.width) * 100}%`;
    c.style.transform = `translateX(${left}px)`;
    c.style.setProperty('--tip', `${x - left}px`);
  }, [shown]);

  useLayoutEffect(() => {
    place();
    const ro = new ResizeObserver(place);
    if (track.current) ro.observe(track.current);
    return () => ro.disconnect();
  }, [place]);

  // Step through the stops while the track is on screen.
  useEffect(() => {
    const el = track.current;
    if (reduce || paused || !el) return;
    let timer = 0;
    let i = -1;
    const next = () => {
      i = i >= LAST ? 0 : i + 1;
      setStep(i);
      timer = window.setTimeout(next, i === LAST ? HOLD_MS : STEP_MS);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry.isIntersecting) next();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [reduce, paused]);

  return (
    <div>
      <div ref={track} className="track mt-12" aria-label="A sample lead going through GetLinked" role="group">
        <div className="track-line" aria-hidden="true">
          <div ref={fill} className="track-fill" />
        </div>

        <div ref={card} className="track-card" aria-live="polite">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.8125rem] font-medium text-ink">GL-48213</span>
            <span data-tone={stop.tone} className="track-chip ml-auto whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold transition-colors duration-300">
              {stop.chip}
            </span>
          </div>
          <p className="mt-2 text-[0.8125rem] leading-snug text-muted">{stop.note}</p>
          {shown === LAST && <p className="mt-1 font-display text-[1.4rem] font-semibold tracking-[-0.02em] text-ink tabular-nums">+$350.00 profit</p>}
        </div>

        <ol className="track-stops">
          {STOPS.map((s, i) => (
            <li key={s.title} className="track-stop" data-s={i <= shown ? s.state : undefined}>
              <span ref={(el) => { dots.current[i] = el; }} className="track-dot">
                {i > shown ? <Pending first={i === 0} /> : s.state === 'bad' ? <Cross /> : <Check />}
              </span>
              <b>{s.title}</b>
              <small>{s.sub}</small>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex items-center gap-4 text-[0.8125rem] text-faint">
        <span>Sample lead and figures.</span>
        {!reduce && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-medium text-muted ring-1 ring-inset ring-line transition-colors hover:text-ink"
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true" fill="currentColor">
              {paused ? <path d="M3 1.8v8.4L10 6z" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />}
            </svg>
            {paused ? 'Play' : 'Pause'}
          </button>
        )}
      </div>
    </div>
  );
}
