'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Hud } from './Hud';
import { ADVERTISERS, CHECK_NAMES, FLY, GATE_H, GATE_Z, HUB, LANES, NODE_Z, SCANNER, world } from './worldState';

const smooth = THREE.MathUtils.smoothstep;
const band = (x: number, a: number, b: number, c: number, d: number) => smooth(x, a, b) * (1 - smooth(x, c, d));

// On phones the lead's card already shows affiliate and country, and covers the top tag.
const TAGS = [
  { text: 'Affiliate #214', at: [-2.5, 2.9, 0.4], wideOnly: true },
  { text: 'Canada · CA', at: [2.6, 2.7, -0.2], wideOnly: true },
  { text: 'Mobile · iOS', at: [-2.7, 0.5, -0.3], wideOnly: false },
  { text: 'Sub ID fb_cmp_17', at: [2.7, 0.4, 0.2], wideOnly: false },
  { text: 'Click ID 9f3a71c2', at: [0, 3.55, -0.4], wideOnly: true },
] as const;

/** One gate's label: its advertiser, the four checks, and the outcome. */
function GateLabel({ index }: { index: number }) {
  const a = ADVERTISERS[index];
  const checks = useRef<(HTMLSpanElement | null)[]>([]);
  const result = useRef<HTMLSpanElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const last = useRef('');
  useFrame(() => {
    const n = world.checks[index];
    const r = world.results[index] > 0.5;
    const key = `${Math.floor(n)}-${r}-${world.quiet > 0.5}`;
    if (key === last.current) return;
    last.current = key;
    checks.current.forEach((el, k) => {
      if (!el) return;
      const done = n >= k + 1;
      const failed = !a.pass && k === a.check - 1;
      el.dataset.state = !done ? 'idle' : failed ? 'fail' : 'pass';
    });
    if (root.current) root.current.dataset.result = !r ? 'idle' : a.pass ? 'pass' : 'fail';
    if (result.current) {
      result.current.dataset.on = String(r);
      if (index === 2) result.current.textContent = world.quiet > 0.5 ? 'No conversion · 4h' : a.note;
      result.current.dataset.tone = index === 2 && world.quiet > 0.5 ? 'amber' : a.pass ? 'green' : 'amber';
    }
  });
  return (
    // A–C step aside once the lead has been routed; D stays up while recycling checks it.
    <Hud position={[LANES[index], GATE_H + 0.75, GATE_Z]} visible={() => (index === 3 ? band(world.cam, 1.5, 1.95, 3.35, 3.75) : band(world.cam, 1.5, 1.95, 2.3, 2.65))}>
      <div ref={root} className="hud-gate" data-result="idle">
        <div className="flex items-center gap-2">
          <span className="hud-letter">{a.key}</span>
          <span className="hud-gate-name text-[11px] font-semibold text-fg">Advertiser {a.key}</span>
        </div>
        <div className="hud-gate-checks mt-1.5 flex gap-1">
          {CHECK_NAMES.map((name, k) => (
            <span key={name} ref={(el) => { checks.current[k] = el; }} data-state="idle" className="hud-check">
              {name}
            </span>
          ))}
        </div>
        <span ref={result} data-on="false" data-tone="green" className="hud-result">
          {a.note}
        </span>
      </div>
    </Hud>
  );
}

/** Counters that roll up as revenue lands. Updated from the 3D tree (labels render in their own root). */
function useMoneyFigures() {
  const figures = useRef<{ el: HTMLSpanElement | null; to: number; prefix: string; last: string }[]>([
    { el: null, to: 1000, prefix: '+', last: '' },
    { el: null, to: 650, prefix: '−', last: '' },
    { el: null, to: 350, prefix: '+', last: '' },
    { el: null, to: 1000, prefix: '+', last: '' },
    { el: null, to: 650, prefix: '−', last: '' },
  ]);
  useFrame(() => {
    const k = smooth(world.money, 0.1, 0.9);
    for (const f of figures.current) {
      const v = f.to * k;
      const text = `${f.prefix}$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (text !== f.last && f.el) {
        f.el.textContent = text;
        f.last = text;
      }
    }
  });
  return (i: number) => (el: HTMLSpanElement | null) => {
    figures.current[i].el = el;
  };
}

export function Labels() {
  const figure = useMoneyFigures();
  return (
    <group>
      {TAGS.map((tag, i) => (
        <Hud
          key={tag.text}
          position={[SCANNER.x + tag.at[0], tag.at[1], SCANNER.z + tag.at[2]]}
          visible={() => THREE.MathUtils.clamp(world.scan * 5 - i, 0, 1) * (1 - smooth(world.cam, 1.35, 1.75))}
        >
          <span className={`hud-tag ${tag.wideOnly ? 'hud-wide-only' : ''}`}>{tag.text}</span>
        </Hud>
      ))}

      <Hud position={[HUB.x + 4.8, 0.6, HUB.z + 1.5]} visible={() => band(world.cam, 1.45, 1.95, 2.3, 2.65)}>
        <div className="hud-panel">
          <span className="hud-kicker">Bucket</span>
          <span className="block text-[12px] font-semibold text-fg">CA · Finance · Tier 1</span>
          <span className="block text-[10px] text-slate">Rotation by priority</span>
        </div>
      </Hud>

      {ADVERTISERS.map((_, i) => (
        <GateLabel key={i} index={i} />
      ))}

      <Hud position={[LANES[2] - 0.2, 3.4, NODE_Z]} visible={() => band(world.quiet, 0.05, 0.4, 2, 3) * band(world.cam, 2.4, 2.8, 3.6, 4)}>
        <div className="hud-panel hud-wide-only">
          <span className="hud-kicker">18:09 UTC · 4 hours later</span>
          <span className="block text-[11px] font-semibold text-[#f5b44a]">No conversion from C</span>
        </div>
      </Hud>

      <Hud position={[7, 0.2, -32.5]} visible={() => smooth(world.recycle, 0.02, 0.2) * (1 - smooth(world.cam, 3.55, 3.95))}>
        <div className="hud-panel hud-panel-wide">
          <span className="hud-kicker text-[#a99cff]">Lead Recycling</span>
          <span className="block text-[11px] text-fg">No conversion in 4h → next eligible advertiser</span>
          <span className="hud-wide-only block text-[10px] text-slate">Skips advertisers that had it · max 2 cycles</span>
        </div>
      </Hud>

      <Hud position={[3.4, 6.1, -27.5]} visible={() => smooth(world.postback, 0.08, 0.3) * (1 - smooth(world.cam, 4.6, 5))}>
        <div className="hud-panel hud-wide-only">
          <span className="hud-kicker text-emerald">Postback · 200 OK</span>
          <span className="block font-mono text-[10.5px] text-fg">status=ftd · payout=1000.00</span>
        </div>
      </Hud>

      <Hud position={[3.6, 3.6, -30]} visible={() => smooth(world.money, 0.05, 0.25) * (1 - world.finale)}>
        <div className="hud-panel hud-wide-only">
          <span className="hud-kicker">Income · Advertiser D</span>
          <span className="block text-[13px] font-semibold text-emerald">
            <span ref={figure(0)} className="font-mono">+$0.00</span>
          </span>
        </div>
      </Hud>
      <Hud position={[3, 3.2, -14.5]} visible={() => smooth(world.money, 0.2, 0.4) * (1 - world.finale)}>
        <div className="hud-panel hud-wide-only">
          <span className="hud-kicker">Commission · Affiliate #214</span>
          <span className="block text-[13px] font-semibold text-sky-300">
            <span ref={figure(1)} className="font-mono">−$0.00</span>
          </span>
        </div>
      </Hud>
      <Hud position={[0, 5.1, HUB.z]} visible={() => smooth(world.money, 0.45, 0.7) * (1 - world.finale)}>
        <div className="hud-panel hud-panel-profit">
          <span className="hud-kicker">Profit on this lead</span>
          <span className="block text-[20px] font-semibold tracking-[-0.02em] text-emerald">
            <span ref={figure(2)} className="font-mono">+$0.00</span>
          </span>
          {/* Phones get one panel with the whole sum instead of three. */}
          <span className="hud-narrow-only mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10.5px]">
            <span className="text-slate-dim">Income · D</span>
            <span ref={figure(3)} className="text-right font-mono text-emerald">+$0.00</span>
            <span className="text-slate-dim">Commission</span>
            <span ref={figure(4)} className="text-right font-mono text-sky-300">−$0.00</span>
          </span>
        </div>
      </Hud>

      <Hud position={[0, FLY + 1.6, 0]} visible={() => band(world.cam, -1, -0.5, 0.25, 0.7)}>
        <span className="hud-tag">Entering GetLinked</span>
      </Hud>
    </group>
  );
}
