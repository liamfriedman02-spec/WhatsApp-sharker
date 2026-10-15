'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { LIVE_FEED } from './tourData';

const VISIBLE = 4;

/**
 * A floating "live routing" card shown over the dashboard in the hero.
 * A new sample lead slides in every couple of seconds while the hero is on screen.
 */
export function LiveFeed({ active }: { active: boolean }) {
  const [head, setHead] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setHead((h) => (h + 1) % LIVE_FEED.length), 2400);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!list.current || head === 0) return;
    const first = list.current.firstElementChild;
    gsap.fromTo(list.current, { y: -34 }, { y: 0, duration: 0.7, ease: 'expo.out' });
    if (first) gsap.fromTo(first, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
  }, [head]);

  const rows = Array.from({ length: VISIBLE }, (_, i) => LIVE_FEED[(head - i + LIVE_FEED.length * 4) % LIVE_FEED.length]);

  return (
    <div className="app-ui w-[330px] rounded-2xl bg-white/95 p-3.5 shadow-[0_40px_80px_-24px_rgba(4,10,24,0.75),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center gap-2 px-0.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ui-green)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ui-green)]" />
        </span>
        <span className="text-[11.5px] font-semibold">Live lead routing</span>
        <span className="ml-auto text-[9px] text-[var(--ui-faint)]">Sample data</span>
      </div>
      <div className="mt-2.5 h-[136px] overflow-hidden">
        <div ref={list}>
          {rows.map((r, i) => (
            <div
              key={`${r.geo}-${r.time}-${i}`}
              className="flex h-[34px] items-center gap-2 border-b border-[var(--ui-line)] text-[10px] last:border-0"
            >
              <span className="ui-mono rounded bg-[var(--ui-navy)] px-1 py-px text-[8.5px] font-semibold text-white">{r.geo}</span>
              <span className="w-[54px] text-[var(--ui-muted)]">{r.vertical}</span>
              <span className="text-[var(--ui-faint)]">→</span>
              <span className="font-medium">{r.to}</span>
              <span className="ml-auto rounded-full bg-[var(--ui-green-soft)] px-1.5 py-px text-[8.5px] font-semibold text-[#1f7a43]">
                Routed
              </span>
              <span className="ui-mono w-[46px] text-right text-[9px] text-[var(--ui-faint)]">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
