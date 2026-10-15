'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useRef, useState } from 'react';
import { ButtonLink } from '@/components/site/ButtonLink';
import { AppFrame, navLayout } from './app/AppFrame';
import { DashboardView } from './app/DashboardView';
import { FlowView } from './app/FlowView';
import { LiveFeed } from './LiveFeed';
import { APP_H, APP_W, FOCUS, FOCUS_MOBILE, KPI, STEPS, type Rect } from './tourData';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, useGSAP);

const HEADLINE = ['The Most Advanced', 'Finance & iGaming', 'Tracking Platform'];
const LABELS = ['hero', 's1', 's2', 's3', 's4', 's5', 'end'] as const;
const DEMO_URL = 'https://getlinked.io/';

type FocusKey = keyof typeof FOCUS;

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Where the product sits on screen for each kind of shot, for the current viewport. */
function layoutFor(w: number, h: number) {
  const wide = w >= 1024 && w / h > 1.05;
  if (wide) {
    const gutter = Math.max(20, (w - 1320) / 2 + 40);
    // Right edge of the copy column; the product always starts clear of it.
    const textRight = gutter + 470;
    const left = Math.max(w * 0.42, textRight + 60);
    const right = Math.max(32, gutter * 0.5);
    return {
      wide,
      textRight,
      hero: { x: left + 30, y: h * 0.13, w: (w - left) * 1.3, h: h * 0.84 },
      focus: { x: left, y: h * 0.14, w: w - left - right, h: h * 0.76 },
      finale: { x: left + 10, y: h * 0.15, w: (w - left) * 1.05, h: h * 0.74 },
    };
  }
  return {
    wide,
    textRight: 0,
    hero: { x: -w * 0.1, y: 74, w: w * 1.2, h: h * 0.34 },
    focus: { x: 14, y: 74, w: w - 28, h: h * 0.5 - 74 },
    finale: { x: -w * 0.06, y: 76, w: w * 1.12, h: h * 0.4 },
  };
}

/** Translate + scale that puts `rect` (canvas px) in the middle of `area` (screen px). */
function frame(rect: Rect, area: Rect) {
  const s = Math.min(area.w / rect.w, area.h / rect.h);
  const cx = APP_W / 2;
  const cy = APP_H / 2;
  return {
    x: area.x + area.w / 2 - cx - s * (rect.x + rect.w / 2 - cx),
    y: area.y + area.h / 2 - cy - s * (rect.y + rect.h / 2 - cy),
    scale: s,
  };
}

/**
 * The homepage story: the visitor opens GetLinked, the camera dives into the product,
 * and one lead travels from the first click to the advertiser and back as revenue.
 * Everything is scrubbed by scroll and snaps to each finished beat.
 */
export function SystemTour() {
  const root = useRef<HTMLElement>(null);
  const stTrigger = useRef<ScrollTrigger | null>(null);
  const [step, setStep] = useState(0);
  const [heroActive, setHeroActive] = useState(true);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const stage = q('[data-stage]')[0] as HTMLElement;
      const cam = q('[data-cam]')[0] as HTMLElement;
      const tilt = q('[data-tilt]')[0] as HTMLElement;
      const nav = navLayout().items;
      const one = (sel: string) => q(sel)[0] as HTMLElement;

      const mm = gsap.matchMedia();
      mm.add(
        { reduce: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const reduce = Boolean(ctx.conditions?.reduce);
          const ease = (e: string) => (reduce ? 'steps(1)' : e);

          const view = () => layoutFor(stage.clientWidth, stage.clientHeight);
          const focusRect = (key: FocusKey) => (view().wide ? FOCUS : FOCUS_MOBILE)[key];
          const shot = (key: FocusKey, kind: 'focus' | 'hero' | 'finale' = 'focus') => {
            const f = () => frame(focusRect(key), view()[kind]);
            return { x: () => f().x, y: () => f().y, scale: () => f().scale };
          };
          const heroTilt = () => (view().wide ? { rotationX: 10, rotationY: -18, rotationZ: 1.2 } : { rotationX: 14, rotationY: -8, rotationZ: 0.6 });

          // Fade the product out under the copy, so text always sits on clean background.
          const applyMask = () => {
            const h = stage.clientHeight;
            const v = view();
            const a = v.wide ? v.textRight + 10 : h * 0.5 - 40;
            const b = v.wide ? v.textRight + 120 : h * 0.5 + 60;
            stage.style.setProperty('--fade-a', `${Math.round(a)}px`);
            stage.style.setProperty('--fade-b', `${Math.round(b)}px`);
            stage.dataset.orient = v.wide ? 'row' : 'column';
          };
          applyMask();
          ScrollTrigger.addEventListener('refreshInit', applyMask);

          // ---------- Initial state ----------
          gsap.set(cam, { transformOrigin: '50% 50%', ...resolve(shot('full', 'hero')), ...heroTilt() });
          gsap.set(q('[data-path]'), { drawSVG: '0%' });
          gsap.set(q('[data-step]'), { autoAlpha: 0, y: 18 });
          gsap.set(q('[data-tour="lead-field"]'), { autoAlpha: 0, x: -8 });
          gsap.set(q('[data-rail]'), { autoAlpha: 0 });

          // One orchestrated entrance: the headline rises while the product floats into place.
          if (!reduce) {
            const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
            intro
              .fromTo(q('[data-line]'), { yPercent: 108 }, { yPercent: 0, duration: 1.25, stagger: 0.09 }, 0.15)
              .fromTo(q('[data-fade]'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.6)
              .fromTo(stage, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.6 }, 0.25)
              .fromTo(q('[data-livefeed]'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 1.1);
          } else {
            gsap.set([stage, ...q('[data-fade]'), ...q('[data-livefeed]')], { autoAlpha: 1 });
            gsap.set(q('[data-line]'), { yPercent: 0 });
          }

          // ---------- The scrubbed story ----------
          const tl = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: () => `+=${window.innerHeight * (view().wide ? 7.5 : 6.5)}`,
              pin: true,
              scrub: reduce ? true : 0.9,
              invalidateOnRefresh: true,
              snap: {
                snapTo: 'labelsDirectional',
                inertia: false,
                duration: { min: 0.25, max: 0.7 },
                delay: 0.08,
                ease: 'power1.inOut',
              },
              onUpdate: (self) => {
                // Use scroll progress, not the smoothed animation time, so the rail is never a step behind.
                const t = self.progress * tl.duration();
                let current = 0;
                ['s1', 's2', 's3', 's4', 's5', 'end'].forEach((label, i) => {
                  if (t >= tl.labels[label] - 0.75) current = i + 1;
                });
                setStep((prev) => (prev === current ? prev : current));
                const atHero = self.progress < 0.015;
                setHeroActive((prev) => (prev === atHero ? prev : atHero));
              },
            },
          });
          stTrigger.current = tl.scrollTrigger ?? null;
          if (process.env.NODE_ENV !== 'production') {
            // Lets browser tests jump straight to a beat.
            (window as unknown as { __tourScroll?: (l: string) => number }).__tourScroll = (l) =>
              tl.scrollTrigger?.labelToScroll(l) ?? 0;
          }

          const at = (label: string, offset = 0) => tl.labels[label] + offset;
          const show = (sel: string, t: number, d = 0.3) => tl.to(q(sel), { autoAlpha: 1, duration: d, ease: 'power2.out' }, t);
          const hide = (sel: string, t: number, d = 0.25) => tl.to(q(sel), { autoAlpha: 0, duration: d, ease: 'power2.in' }, t);
          const swap = (from: string, to: string, t: number) => {
            hide(from, t, 0.18);
            show(to, t + 0.12, 0.22);
          };
          const navTo = (fromId: string, toId: string, t: number) => {
            tl.to(one('[data-tour="nav-pill"]'), { top: nav[toId], duration: 0.45, ease: ease('power3.inOut') }, t)
              .to(one(`[data-nav="${fromId}"]`), { color: '#aeb8d0', duration: 0.3 }, t)
              .to(one(`[data-nav="${toId}"]`), { color: '#ffffff', duration: 0.3 }, t + 0.15);
          };
          const counter = (sel: string, from: number, to: number, fmt: (n: number) => string, t: number, d = 0.4) => {
            const els = q(sel);
            const o = { v: from };
            tl.to(o, { v: to, duration: d, ease: 'none', onUpdate: () => els.forEach((el) => (el.textContent = fmt(o.v))) }, t);
          };
          const copyIn = (i: number | 'final', t: number) =>
            tl.to(q(`[data-step="${i}"]`), { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t);
          const copyOut = (i: number | 'final', t: number) =>
            tl.to(q(`[data-step="${i}"]`), { autoAlpha: 0, y: -14, duration: 0.25, ease: 'power2.in' }, t);
          const logLines = (from: number, to: number, t: number, gap = 0.1) => {
            for (let i = from; i <= to; i++) show(`[data-log="${i}"]`, t + (i - from) * gap, 0.15);
          };
          const travel = (packet: string, path: string, t: number, d: number) => {
            const id = `#gl-path-${path}`;
            tl.to(q(packet), { autoAlpha: reduce ? 0 : 1, duration: 0.05 }, t)
              .to(q(packet), { motionPath: { path: id, align: id, alignOrigin: [0.5, 0.5] }, duration: d, ease: ease('power1.inOut') }, t)
              .to(q(`[data-path="${path}"]`), { drawSVG: '100%', duration: d, ease: ease('power1.inOut') }, t)
              .to(q(`[data-path-base="${path}"]`), { opacity: 1, duration: 0.2 }, t - 0.1);
          };
          const check = (row: string, idx: number, t: number) => {
            hide(`[data-check-pending="${row}${idx}"]`, t, 0.08);
            tl.fromTo(q(`[data-check="${row}${idx}"]`), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.14, ease: reduce ? 'none' : 'back.out(3)' }, t);
          };

          tl.addLabel('hero', 0);

          // Enter the system: flatten, dive in, swap the dashboard for the lead's journey.
          tl.to(q('[data-hero-copy]'), { autoAlpha: 0, y: -24, duration: 0.45, ease: 'power2.in' }, 0.05)
            .to(q('[data-livefeed]'), { autoAlpha: 0, y: 24, duration: 0.35, ease: 'power2.in' }, 0.05)
            .to(q('[data-glare]'), { autoAlpha: 0, duration: 0.4 }, 0.1)
            .to(cam, { ...shot('track'), rotationX: 0, rotationY: 0, rotationZ: 0, duration: 1.2, ease: ease('power3.inOut') }, 0);
          hide('[data-tour="dashboard"]', 0.4, 0.35);
          show('[data-tour="flow"]', 0.6, 0.4);
          navTo('dashboard', 'leads', 0.45);
          tl.to(q('[data-rail]'), { autoAlpha: 1, duration: 0.3 }, 0.8);
          copyIn(0, 0.85);

          // 1. Track: the lead is created with everything it came with.
          tl.to(q('[data-tour="lead-field"]'), { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.07, ease: 'power2.out' }, 1.25);
          logLines(0, 1, 1.4, 0.25);
          show('[data-mini-delta="leads"]', 1.9, 0.2);
          counter('[data-mini="leads"]', KPI.leads.before, KPI.leads.after, int, 1.9, 0.2);
          tl.addLabel('s1', 2.4);

          // 2. Distribute: the bucket checks each advertiser in priority order.
          copyOut(0, at('s1'));
          tl.to(cam, { ...shot('distribute'), duration: 0.7, ease: ease('power3.inOut') }, at('s1'));
          navTo('leads', 'buckets', at('s1', 0.05));
          copyIn(1, at('s1', 0.4));
          logLines(2, 2, at('s1', 0.6));
          [0, 1, 2].forEach((k) => check('A', k, at('s1', 0.65 + k * 0.1)));
          swap('[data-tour="result-idle-A"]', '[data-tour="result-A"]', at('s1', 0.95));
          tl.to(q('[data-tour="rowbody-A"]'), { opacity: 0.5, duration: 0.2 }, at('s1', 1.0));
          swap('[data-tour="nstatus-A-idle"]', '[data-tour="nstatus-A-cap"]', at('s1', 1.0));
          logLines(3, 3, at('s1', 1.0));
          [0, 1, 2, 3].forEach((k) => check('B', k, at('s1', 1.1 + k * 0.1)));
          swap('[data-tour="result-idle-B"]', '[data-tour="result-B"]', at('s1', 1.5));
          tl.to(q('[data-tour="rowbody-B"]'), { opacity: 0.5, duration: 0.2 }, at('s1', 1.55));
          swap('[data-tour="nstatus-B-idle"]', '[data-tour="nstatus-B-budget"]', at('s1', 1.55));
          logLines(4, 4, at('s1', 1.55));
          [0, 1, 2, 3].forEach((k) => check('C', k, at('s1', 1.65 + k * 0.1)));
          tl.to(q('[data-tour="sweep-C"]'), { scaleX: 1, duration: 0.35, ease: ease('power2.out') }, at('s1', 2.0));
          swap('[data-tour="result-idle-C"]', '[data-tour="result-C"]', at('s1', 2.05));
          logLines(5, 5, at('s1', 2.1));
          travel('[data-tour="packet"]', 'toBucket', at('s1', 2.1), 0.3);
          travel('[data-tour="packet"]', 'toAdvertiser', at('s1', 2.42), 0.16);
          swap('[data-tour="nstatus-C-idle"]', '[data-tour="nstatus-C-received"]', at('s1', 2.58));
          swap('[data-tour="status-new"]', '[data-tour="status-routed"]', at('s1', 2.58));
          tl.fromTo(q('[data-tour="toast-routed"]'), { autoAlpha: 0, y: 8, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.25, ease: reduce ? 'none' : 'back.out(2)' }, at('s1', 2.6));
          logLines(6, 6, at('s1', 2.68));
          hide('[data-tour="packet"]', at('s1', 2.62), 0.1);
          tl.addLabel('s2', at('s1', 2.9));

          // 3. Recycle: four hours later, no conversion, so the lead moves to the next buyer.
          copyOut(1, at('s2'));
          hide('[data-tour="toast-routed"]', at('s2'), 0.2);
          tl.to(cam, { ...shot('recycle'), duration: 0.7, ease: ease('power3.inOut') }, at('s2'));
          navTo('buckets', 'recycling', at('s2', 0.05));
          copyIn(2, at('s2', 0.4));
          swap('[data-tour="clock-1"]', '[data-tour="clock-2"]', at('s2', 0.3));
          swap('[data-tour="nstatus-C-received"]', '[data-tour="nstatus-C-noconv"]', at('s2', 0.45));
          tl.fromTo(q('[data-tour="card-recycle"]'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, at('s2', 0.6));
          logLines(7, 7, at('s2', 0.7));
          tl.to(q('[data-tour="log-list"]'), { y: -36, duration: 0.3 }, at('s2', 0.7));
          [0, 1, 2, 3].forEach((k) => check('D', k, at('s2', 0.8 + k * 0.09)));
          tl.to(q('[data-tour="sweep-D"]'), { scaleX: 1, duration: 0.3, ease: ease('power2.out') }, at('s2', 1.15));
          swap('[data-tour="result-idle-D"]', '[data-tour="result-D"]', at('s2', 1.15));
          tl.to(q('[data-tour="packet"]'), { backgroundColor: '#5b3fd8', boxShadow: '0 0 0 4px rgba(91,63,216,0.18), 0 0 16px 4px rgba(91,63,216,0.45)', duration: 0.05 }, at('s2', 1.2));
          travel('[data-tour="packet"]', 'recycle', at('s2', 1.25), 0.45);
          swap('[data-tour="nstatus-D-idle"]', '[data-tour="nstatus-D-received"]', at('s2', 1.72));
          swap('[data-tour="status-routed"]', '[data-tour="status-recycled"]', at('s2', 1.72));
          hide('[data-tour="packet"]', at('s2', 1.75), 0.1);
          logLines(8, 9, at('s2', 1.75), 0.12);
          tl.to(q('[data-tour="log-list"]'), { y: -100, duration: 0.3 }, at('s2', 1.8));
          tl.addLabel('s3', at('s2', 2.1));

          // 4. Convert: the advertiser posts back an FTD and the lead converts.
          copyOut(2, at('s3'));
          tl.to(cam, { ...shot('convert'), duration: 0.8, ease: ease('power3.inOut') }, at('s3'));
          navTo('recycling', 'leads', at('s3', 0.05));
          copyIn(3, at('s3', 0.45));
          swap('[data-tour="clock-2"]', '[data-tour="clock-3"]', at('s3', 0.4));
          hide('[data-tour="card-recycle"]', at('s3', 0.5), 0.2);
          tl.fromTo(q('[data-tour="card-postback"]'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at('s3', 0.65));
          swap('[data-tour="nstatus-D-received"]', '[data-tour="nstatus-D-converted"]', at('s3', 0.7));
          logLines(10, 10, at('s3', 0.75));
          travel('[data-tour="packet-pb"]', 'postback', at('s3', 0.8), 0.7);
          swap('[data-tour="status-recycled"]', '[data-tour="status-converted"]', at('s3', 1.5));
          hide('[data-tour="packet-pb"]', at('s3', 1.52), 0.1);
          logLines(11, 11, at('s3', 1.52));
          tl.to(q('[data-tour="log-list"]'), { y: -164, duration: 0.3 }, at('s3', 1.52));
          show('[data-mini-delta="conversions"]', at('s3', 1.55), 0.2);
          counter('[data-mini="conversions"]', KPI.conversions.before, KPI.conversions.after, int, at('s3', 1.55), 0.2);
          tl.addLabel('s4', at('s3', 1.9));

          // 5. Get paid: income, commission and profit land on their own.
          copyOut(3, at('s4'));
          tl.to(cam, { ...shot('money'), duration: 0.7, ease: ease('power3.inOut') }, at('s4'));
          navTo('leads', 'invoices', at('s4', 0.05));
          copyIn(4, at('s4', 0.4));
          hide('[data-tour="card-postback"]', at('s4', 0.3), 0.2);
          tl.fromTo(q('[data-tour="card-finance"]'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at('s4', 0.45));
          counter('[data-tour="finance-profit"]', 0, 350, (n) => `+${usd(n)}`, at('s4', 0.6), 0.5);
          logLines(12, 14, at('s4', 0.6), 0.14);
          tl.to(q('[data-tour="log-list"]'), { y: -258, duration: 0.4 }, at('s4', 0.6));
          show('[data-mini-delta="profit"]', at('s4', 0.75), 0.2);
          counter('[data-mini="profit"]', KPI.profit.before, KPI.profit.after, usd, at('s4', 0.75), 0.5);
          tl.addLabel('s5', at('s4', 1.4));

          // Finale: pull back out to the whole network, numbers updated.
          copyOut(4, at('s5'));
          tl.to(q('[data-rail]'), { autoAlpha: 0, duration: 0.3 }, at('s5'));
          tl.to(cam, { ...shot('full', 'finale'), rotationX: reduce ? 0 : 7, rotationY: reduce ? 0 : -12, rotationZ: reduce ? 0 : 0.8, duration: 1.1, ease: ease('power3.inOut') }, at('s5'));
          hide('[data-tour="flow"]', at('s5', 0.3), 0.35);
          show('[data-tour="dashboard"]', at('s5', 0.45), 0.4);
          navTo('invoices', 'dashboard', at('s5', 0.2));
          counter('[data-kpi="leads"]', KPI.leads.before, KPI.leads.after, int, at('s5', 0.6), 0.3);
          counter('[data-kpi="conversions"]', KPI.conversions.before, KPI.conversions.after, int, at('s5', 0.6), 0.3);
          counter('[data-kpi="profit"]', KPI.profit.before, KPI.profit.after, usd, at('s5', 0.6), 0.4);
          tl.to(q('[data-glare]'), { autoAlpha: 1, duration: 0.4 }, at('s5', 0.6));
          copyIn('final', at('s5', 0.7));
          tl.addLabel('end', at('s5', 1.3));
          tl.set({}, {}, at('end'));

          // Keep text crisp: only hint the compositor while the camera is moving.
          const moving = () => cam.style.setProperty('will-change', 'transform');
          const still = () => cam.style.removeProperty('will-change');
          ScrollTrigger.addEventListener('scrollStart', moving);
          ScrollTrigger.addEventListener('scrollEnd', still);

          // Subtle parallax on the floating product while the hero is on screen.
          const fine = window.matchMedia('(pointer: fine)').matches;
          let onMove: ((e: PointerEvent) => void) | null = null;
          if (fine && !reduce) {
            const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1.2, ease: 'power3.out' });
            const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1.2, ease: 'power3.out' });
            onMove = (e) => {
              const k = (tl.scrollTrigger?.progress ?? 0) < 0.02 ? 1 : 0;
              rx(((e.clientY / window.innerHeight) * 2 - 1) * -2.2 * k);
              ry(((e.clientX / window.innerWidth) * 2 - 1) * 3 * k);
            };
            window.addEventListener('pointermove', onMove, { passive: true });
          }

          return () => {
            ScrollTrigger.removeEventListener('scrollStart', moving);
            ScrollTrigger.removeEventListener('scrollEnd', still);
            ScrollTrigger.removeEventListener('refreshInit', applyMask);
            if (onMove) window.removeEventListener('pointermove', onMove);
          };
        },
      );
    },
    { scope: root },
  );

  const goTo = useCallback((label: (typeof LABELS)[number]) => {
    const st = stTrigger.current;
    if (!st) return;
    const top = st.labelToScroll(label);
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);

  return (
    <section ref={root} id="top" aria-labelledby="hero-title" className="tour relative h-[100svh] overflow-hidden">
      <div aria-hidden="true" className="tour-backdrop pointer-events-none absolute inset-0" />

      {/* The product, in 3D space */}
      <div data-stage aria-hidden="true" className="tour-stage absolute inset-0">
        <div data-cam className="absolute left-0 top-0 [transform-style:preserve-3d]" style={{ width: APP_W, height: APP_H }}>
          <div data-tilt className="relative h-full w-full [transform-style:preserve-3d]">
            <div className="tour-shadow absolute inset-0 rounded-[18px]" />
            <AppFrame>
              <DashboardView />
              <FlowView />
            </AppFrame>
            <div data-glare className="tour-glare pointer-events-none absolute inset-0 rounded-[18px]" />
            <div data-livefeed className="absolute" style={{ left: 600, top: 500, transform: 'translateZ(90px)' }}>
              <LiveFeed active={heroActive} />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="tour-scrim pointer-events-none absolute inset-0" />

      {/* Copy */}
      <div className="pointer-events-none absolute inset-0">
        <div className="container-page relative h-full">
          <div data-hero-copy className="tour-copy tour-copy-hero">
            <h1
              id="hero-title"
              className="font-display text-[clamp(2.15rem,1rem+3vw,4.2rem)] font-semibold leading-[1.0] tracking-[-0.038em]"
            >
              {HEADLINE.map((line) => (
                <span key={line} className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
                  <span data-line className="headline-fill block lg:whitespace-nowrap">
                    {line}
                  </span>
                </span>
              ))}
            </h1>
            <p data-fade className="mt-6 text-[clamp(1.0625rem,0.95rem+0.4vw,1.3rem)] font-medium tracking-[-0.012em] text-fg">
              Track every click. Route every lead. Control every outcome.
            </p>
            <p data-fade className="hero-desc mt-3 max-w-[31rem] text-[clamp(0.98rem,0.92rem+0.2vw,1.0625rem)] leading-relaxed text-slate">
              The complete performance infrastructure for affiliate tracking, intelligent lead distribution, and network
              management.
            </p>
            <div data-fade className="pointer-events-auto mt-7 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
              <ButtonLink href={DEMO_URL} size="hero">
                Book a Demo
              </ButtonLink>
              <button type="button" onClick={() => goTo('s1')} className="tour-ghost-btn">
                Explore the Platform
              </button>
            </div>
            <p data-fade className="mt-10 hidden items-center gap-3 text-[0.8125rem] text-slate-dim lg:flex">
              <span className="scroll-cue-track" aria-hidden="true" />
              Scroll to follow one lead through GetLinked
            </p>
          </div>

          <div className="contents">
            {STEPS.map((s, i) => (
              <div key={s.id} data-step={i} className="tour-copy tour-copy-step">
                <p className="font-mono text-[0.78rem] tracking-[0.02em] text-emerald">
                  Step {i + 1} of {STEPS.length} · {s.label}
                </p>
                <h2 className="mt-3 font-display text-[clamp(1.6rem,1rem+2vw,2.75rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-balance">
                  {s.title}
                </h2>
                <p className="mt-4 max-w-[27rem] text-[clamp(0.95rem,0.9rem+0.2vw,1.0625rem)] leading-relaxed text-slate">{s.body}</p>
                <ul className="mt-5 hidden flex-wrap gap-2 sm:flex">
                  {s.chips.map((c) => (
                    <li
                      key={c}
                      className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[0.8rem] text-fg ring-1 ring-inset ring-white/[0.1]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div data-step="final" className="tour-copy tour-copy-step">
              <h2 className="font-display text-[clamp(2rem,1.1rem+3vw,3.75rem)] font-semibold leading-[1.0] tracking-[-0.035em] text-balance">
                Take control of your entire network.
              </h2>
              <p className="mt-4 max-w-[27rem] text-[clamp(0.98rem,0.92rem+0.2vw,1.0625rem)] leading-relaxed text-slate">
                Discover how GetLinked brings tracking, distribution, and performance management together.
              </p>
              <div className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href={DEMO_URL} size="hero">
                  Book Your Personal Demo
                </ButtonLink>
                <button type="button" onClick={() => goTo('s1')} className="tour-ghost-btn">
                  See How GetLinked Works
                </button>
              </div>
            </div>
          </div>

          {/* Progress */}
          <nav data-rail aria-label="Tour steps" className="tour-rail pointer-events-auto">
            <ol className="flex gap-1.5 sm:gap-2">
              {STEPS.map((s, i) => {
                const state = step > i + 1 ? 'done' : step === i + 1 ? 'active' : 'todo';
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(LABELS[i + 1])}
                      aria-current={state === 'active' ? 'step' : undefined}
                      className="group flex flex-col gap-2 text-left"
                    >
                      <span
                        className={`h-[3px] w-10 rounded-full transition-colors duration-500 sm:w-16 ${
                          state === 'active' ? 'bg-emerald' : state === 'done' ? 'bg-emerald/45' : 'bg-white/15 group-hover:bg-white/30'
                        }`}
                      />
                      <span
                        className={`hidden text-[0.75rem] transition-colors sm:block ${
                          state === 'active' ? 'text-fg' : 'text-slate-dim group-hover:text-slate'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={() => goTo('end')}
              className="ml-4 self-start text-[0.75rem] text-slate-dim underline-offset-4 hover:text-slate hover:underline sm:ml-6"
            >
              Skip to the end
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
}

/** Evaluates function-based tween values once, for gsap.set. */
function resolve<T extends Record<string, () => number>>(vals: T) {
  return Object.fromEntries(Object.entries(vals).map(([k, f]) => [k, f()])) as { [K in keyof T]: number };
}
