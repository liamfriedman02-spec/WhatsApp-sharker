'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonLink } from '@/components/site/ButtonLink';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { world } from '@/world/worldState';
import { AppFrame } from './app/AppFrame';
import { DashboardView } from './app/DashboardView';
import { LiveFeed } from './LiveFeed';
import { APP_H, APP_W, STEPS, type Rect } from './tourData';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const WorldCanvas = dynamic(() => import('@/world/WorldCanvas'), { ssr: false });

const HEADLINE = ['The Most Advanced', 'Finance & iGaming', 'Tracking Platform'];
const LABELS = ['hero', 's1', 's2', 's3', 's4', 's5', 'end'] as const;
const DEMO_URL = 'https://getlinked.io/';

/** The live-feed row the camera dives into, in dashboard canvas pixels. */
const DIVE_TARGET: Rect = { x: 640, y: 546, w: 170, h: 30 };

/** Where the dashboard sits on screen in the hero, for the current viewport. */
function layoutFor(w: number, h: number) {
  const wide = w >= 1024 && w / h > 1.05;
  if (wide) {
    const gutter = Math.max(20, (w - 1320) / 2 + 40);
    const textRight = gutter + 470;
    const left = Math.max(w * 0.42, textRight + 60);
    return { wide, textRight, hero: { x: left + 30, y: h * 0.13, w: (w - left) * 1.3, h: h * 0.84 } };
  }
  return { wide, textRight: 0, hero: { x: -w * 0.1, y: 74, w: w * 1.2, h: h * 0.34 } };
}

/** Translate + scale that puts `rect` (canvas px) in the middle of `area` (screen px). */
function frame(rect: Rect, area: Rect, zoom = 1) {
  const s = Math.min(area.w / rect.w, area.h / rect.h) * zoom;
  const cx = APP_W / 2;
  const cy = APP_H / 2;
  return {
    x: area.x + area.w / 2 - cx - s * (rect.x + rect.w / 2 - cx),
    y: area.y + area.h / 2 - cy - s * (rect.y + rect.h / 2 - cy),
    scale: s,
  };
}

/**
 * The homepage story. The visitor opens GetLinked on its dashboard, the camera dives into
 * a live lead, and the page turns into the system itself: one lead tracked, routed through
 * a bucket, recycled, converted and paid, then the whole network at once.
 */
export function SystemTour() {
  const root = useRef<HTMLElement>(null);
  const stTrigger = useRef<ScrollTrigger | null>(null);
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [heroActive, setHeroActive] = useState(true);
  const [worldActive, setWorldActive] = useState(false);
  const [worldMounted, setWorldMounted] = useState(false);

  // Load the 3D world once the hero has settled, so it's ready before the dive.
  useEffect(() => {
    const hasIdle = 'requestIdleCallback' in window;
    const id = hasIdle
      ? window.requestIdleCallback(() => setWorldMounted(true), { timeout: 2500 })
      : window.setTimeout(() => setWorldMounted(true), 1200);
    return () => (hasIdle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const section = root.current as HTMLElement;
      const stage = q('[data-stage]')[0] as HTMLElement;
      const cam = q('[data-cam]')[0] as HTMLElement;
      const tilt = q('[data-tilt]')[0] as HTMLElement;
      const worldLayer = q('[data-world]')[0] as HTMLElement;

      const mm = gsap.matchMedia();
      mm.add(
        { reduce: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const reduce = Boolean(ctx.conditions?.reduce);
          const ease = (e: string) => (reduce ? 'steps(1)' : e);
          const view = () => layoutFor(section.clientWidth, section.clientHeight);
          const heroShot = () => frame({ x: 0, y: 0, w: APP_W, h: APP_H }, view().hero);
          const diveShot = () => frame(DIVE_TARGET, { x: 0, y: 0, w: section.clientWidth, h: section.clientHeight }, 0.9);
          const heroTilt = () => (view().wide ? { rotationX: 10, rotationY: -18, rotationZ: 1.2 } : { rotationX: 14, rotationY: -8, rotationZ: 0.6 });

          // Keep the copy column clean: fade the visuals out underneath it.
          const applyMask = () => {
            const h = section.clientHeight;
            const v = view();
            section.style.setProperty('--fade-a', `${Math.round(v.wide ? v.textRight + 10 : h * 0.5 - 40)}px`);
            section.style.setProperty('--fade-b', `${Math.round(v.wide ? v.textRight + 120 : h * 0.5 + 60)}px`);
            section.dataset.orient = v.wide ? 'row' : 'column';
          };
          applyMask();
          ScrollTrigger.addEventListener('refreshInit', applyMask);

          // ---------- Initial state ----------
          gsap.set(cam, { transformOrigin: '50% 50%', ...heroShot(), ...heroTilt() });
          gsap.set(q('[data-step]'), { autoAlpha: 0, y: 18 });
          gsap.set(q('[data-rail]'), { autoAlpha: 0 });
          Object.assign(world, {
            cam: 0, lead: 0, scan: 0, checks: [0, 0, 0, 0], results: [0, 0, 0, 0], warp: 0, quiet: 0,
            recycle: 0, postback: 0, converted: 0, money: 0, finale: 0, status: 0, card: 0,
          });

          // One orchestrated entrance: the headline rises while the dashboard floats into place.
          if (!reduce) {
            gsap
              .timeline({ defaults: { ease: 'expo.out' } })
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
              trigger: section,
              start: 'top top',
              end: () => `+=${window.innerHeight * (view().wide ? 8.5 : 7.5)}`,
              pin: true,
              scrub: reduce ? true : 0.9,
              invalidateOnRefresh: true,
              snap: { snapTo: 'labelsDirectional', inertia: false, duration: { min: 0.25, max: 0.8 }, delay: 0.08, ease: 'power1.inOut' },
              onUpdate: (self) => {
                const t = self.progress * tl.duration();
                let current = 0;
                ['s1', 's2', 's3', 's4', 's5', 'end'].forEach((label, i) => {
                  if (t >= tl.labels[label] - 0.8) current = i + 1;
                });
                setStep((p) => (p === current ? p : current));
                const atHero = self.progress < 0.015;
                setHeroActive((p) => (p === atHero ? p : atHero));
                const inWorld = t > 0.45;
                setWorldActive((p) => (p === inWorld ? p : inWorld));
              },
            },
          });
          stTrigger.current = tl.scrollTrigger ?? null;
          if (process.env.NODE_ENV !== 'production') {
            const dev = window as unknown as { __tourScroll?: (l: string) => number; __gsap?: typeof gsap };
            dev.__tourScroll = (l) => tl.scrollTrigger?.labelToScroll(l) ?? 0;
            dev.__gsap = gsap;
          }

          const at = (label: string, offset = 0) => tl.labels[label] + offset;
          const w = (vars: gsap.TweenVars, t: number, d: number, e = 'power2.inOut') => tl.to(world, { ...vars, duration: d, ease: ease(e) }, t);
          const wa = (key: 'checks' | 'results', i: number, to: number, t: number, d: number) =>
            tl.to(world[key], { [i]: to, duration: d, ease: reduce ? 'steps(1)' : 'none' }, t);
          const copyIn = (i: number | 'final', t: number) => tl.to(q(`[data-step="${i}"]`), { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t);
          const copyOut = (i: number | 'final', t: number) => tl.to(q(`[data-step="${i}"]`), { autoAlpha: 0, y: -14, duration: 0.25, ease: 'power2.in' }, t);

          tl.addLabel('hero', 0);

          // Dive: through the live lead on the dashboard and into the system.
          tl.to(q('[data-hero-copy]'), { autoAlpha: 0, y: -24, duration: 0.45, ease: 'power2.in' }, 0.05)
            .to(q('[data-glare]'), { autoAlpha: 0, duration: 0.3 }, 0.05)
            .to(cam, { x: () => diveShot().x, y: () => diveShot().y, scale: () => diveShot().scale, rotationX: 0, rotationY: 0, rotationZ: 0, duration: 1.1, ease: ease('power3.in') }, 0)
            .to(q('[data-tour="dashboard"]'), { opacity: 0.35, duration: 0.5 }, 0.3)
            .to(stage, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 0.75)
            .to(q('[data-flash]'), { opacity: reduce ? 0 : 0.75, duration: 0.18, ease: 'power1.in' }, 0.78)
            .to(q('[data-flash]'), { opacity: 0, duration: 0.45, ease: 'power2.out' }, 0.96)
            .to(worldLayer, { autoAlpha: 1, duration: 0.35, ease: 'power1.out' }, 0.8);
          w({ cam: 0.15 }, 0.8, 0.4, 'power1.out');
          tl.to(q('[data-rail]'), { autoAlpha: 1, duration: 0.3 }, 1.0);

          // 1. Track: the lead passes the scanner and its attributes are captured.
          copyIn(0, 1.05);
          w({ cam: 1 }, 1.0, 1.4);
          w({ lead: 0.95 }, 1.0, 1.4, 'power1.inOut');
          w({ card: 1 }, 1.15, 0.3, 'power1.out');
          w({ scan: 1 }, 1.6, 0.8, 'none');
          tl.addLabel('s1', 2.6);

          // 2. Distribute: the bucket checks each advertiser, A and B are skipped, C gets the lead.
          copyOut(0, at('s1'));
          w({ cam: 2 }, at('s1'), 0.9);
          copyIn(1, at('s1', 0.4));
          w({ lead: 2 }, at('s1', 0.25), 0.7);
          wa('checks', 0, 3, at('s1', 1.0), 0.36);
          wa('results', 0, 1, at('s1', 1.36), 0.1);
          wa('checks', 1, 4, at('s1', 1.5), 0.4);
          wa('results', 1, 1, at('s1', 1.9), 0.1);
          wa('checks', 2, 4, at('s1', 2.05), 0.4);
          wa('results', 2, 1, at('s1', 2.45), 0.1);
          w({ lead: 3 }, at('s1', 2.55), 0.65);
          w({ status: 1 }, at('s1', 3.15), 0.02, 'none');
          tl.addLabel('s2', at('s1', 3.4));

          // 3. Recycle: four hours, no conversion, so the lead goes back through the bucket to D.
          copyOut(1, at('s2'));
          w({ cam: 3 }, at('s2'), 0.9);
          copyIn(2, at('s2', 0.4));
          w({ warp: 1 }, at('s2', 0.25), 0.3, 'power2.in');
          w({ warp: 0 }, at('s2', 0.55), 0.4, 'power2.out');
          w({ quiet: 1 }, at('s2', 0.6), 0.3);
          wa('checks', 3, 4, at('s2', 1.0), 0.36);
          wa('results', 3, 1, at('s2', 1.36), 0.1);
          w({ recycle: 1 }, at('s2', 1.35), 0.9, 'power1.inOut');
          w({ lead: 4 }, at('s2', 1.45), 0.95, 'power1.inOut');
          w({ status: 2 }, at('s2', 2.35), 0.02, 'none');
          tl.addLabel('s3', at('s2', 2.6));

          // 4. Convert: advertiser D posts back an FTD.
          copyOut(2, at('s3'));
          w({ cam: 4 }, at('s3'), 0.9);
          copyIn(3, at('s3', 0.45));
          w({ postback: 1 }, at('s3', 0.7), 0.8, 'power1.inOut');
          w({ converted: 1 }, at('s3', 1.45), 0.35, 'power2.out');
          w({ status: 3 }, at('s3', 1.5), 0.02, 'none');
          tl.addLabel('s4', at('s3', 2.1));

          // 5. Get paid: income in, commission out, profit at the core.
          copyOut(3, at('s4'));
          w({ cam: 5 }, at('s4'), 0.9);
          copyIn(4, at('s4', 0.4));
          w({ card: 0 }, at('s4'), 0.3);
          w({ money: 1 }, at('s4', 0.6), 1.0, 'power1.inOut');
          tl.addLabel('s5', at('s4', 1.9));

          // Finale: rise above the whole network, many leads at once.
          copyOut(4, at('s5'));
          tl.to(q('[data-rail]'), { autoAlpha: 0, duration: 0.3 }, at('s5'));
          w({ cam: 6 }, at('s5'), 1.3, 'power3.inOut');
          w({ finale: 1 }, at('s5', 0.35), 0.9, 'power1.inOut');
          copyIn('final', at('s5', 0.8));
          tl.addLabel('end', at('s5', 1.6));
          tl.set({}, {}, at('end'));

          // Keep the dashboard crisp: only hint the compositor while it's moving.
          const moving = () => cam.style.setProperty('will-change', 'transform');
          const still = () => cam.style.removeProperty('will-change');
          ScrollTrigger.addEventListener('scrollStart', moving);
          ScrollTrigger.addEventListener('scrollEnd', still);

          // Subtle parallax on the floating dashboard while the hero is on screen.
          let onMove: ((e: PointerEvent) => void) | null = null;
          if (window.matchMedia('(pointer: fine)').matches && !reduce) {
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
    window.scrollTo({
      top: st.labelToScroll(label),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, []);

  return (
    <section ref={root} id="top" aria-labelledby="hero-title" className="tour relative h-[100svh] overflow-hidden">
      <div aria-hidden="true" className="tour-backdrop pointer-events-none absolute inset-0" />

      {/* Inside GetLinked: the 3D system */}
      <div data-world aria-hidden="true" className="world-layer absolute inset-0">
        {worldMounted && <WorldCanvas active={worldActive} reducedMotion={reducedMotion} />}
      </div>

      {/* The dashboard, floating in 3D space (hero only) */}
      <div data-stage aria-hidden="true" className="tour-stage absolute inset-0">
        <div data-cam className="absolute left-0 top-0 [transform-style:preserve-3d]" style={{ width: APP_W, height: APP_H }}>
          <div data-tilt className="relative h-full w-full [transform-style:preserve-3d]">
            <div className="tour-shadow absolute inset-0 rounded-[18px]" />
            <AppFrame>
              <DashboardView />
            </AppFrame>
            <div data-glare className="tour-glare pointer-events-none absolute inset-0 rounded-[18px]" />
            <div data-livefeed className="absolute" style={{ left: 600, top: 500, transform: 'translateZ(90px)' }}>
              <LiveFeed active={heroActive} />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" data-flash className="tour-flash pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="tour-scrim pointer-events-none absolute inset-0" />

      {/* Copy */}
      <div className="pointer-events-none absolute inset-0">
        <div className="container-page relative h-full">
          <div data-hero-copy className="tour-copy tour-copy-hero">
            <h1 id="hero-title" className="font-display text-[clamp(2.15rem,1rem+3vw,4.2rem)] font-semibold leading-[1.0] tracking-[-0.038em]">
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
              Scroll to follow one lead into GetLinked
            </p>
          </div>

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
                  <li key={c} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[0.8rem] text-fg ring-1 ring-inset ring-white/[0.1]">
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
                      <span className={`hidden text-[0.75rem] transition-colors sm:block ${state === 'active' ? 'text-fg' : 'text-slate-dim group-hover:text-slate'}`}>
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <button type="button" onClick={() => goTo('end')} className="ml-4 self-start text-[0.75rem] text-slate-dim underline-offset-4 hover:text-slate hover:underline sm:ml-6">
              Skip to the end
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
}
