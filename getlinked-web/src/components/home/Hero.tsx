'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { AppFrame } from '@/components/product/AppFrame';
import { DashboardView } from '@/components/product/DashboardView';
import { APP_H, APP_W } from '@/components/product/appData';
import { ButtonLink } from '@/components/site/ButtonLink';
import { DEMO_URL } from '@/components/site/links';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** First screen: the promise, the two calls to action, and the GetLinked dashboard itself. */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);

  // The dashboard is laid out at its real size and scaled to the width it's given.
  useEffect(() => {
    const el = box.current;
    const app = canvas.current;
    if (!el || !app) return;
    const ro = new ResizeObserver(([entry]) => {
      app.style.transform = `scale(${entry.contentRect.width / APP_W})`;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('[data-intro]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07 }, 0.1)
          .fromTo('[data-frame]', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.3);

        // The screen starts tipped back and settles flat as it scrolls into view.
        gsap.fromTo(
          '[data-tilt]',
          { rotateX: 16, scale: 0.95 },
          {
            rotateX: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-tilt]', start: 'top 92%', end: 'top 18%', scrub: 0.6 },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className="relative overflow-hidden pt-[calc(var(--banner-h,0px)+7.5rem)] lg:pt-[calc(var(--banner-h,0px)+8.5rem)]">
      <div aria-hidden="true" className="hero-backdrop pointer-events-none absolute inset-0" />

      <div className="container-page relative text-center">
        <h1
          data-intro
          className="headline-fill mx-auto max-w-[26ch] font-display text-[clamp(2.5rem,5.2vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.038em] [text-wrap:balance]"
        >
          The Most Advanced Finance &amp; iGaming Tracking Platform
        </h1>
        <p data-intro className="mx-auto mt-6 max-w-[40rem] text-[1.125rem] font-medium tracking-[-0.01em] text-fg sm:text-[1.25rem]">
          Track every click. Route every lead. Control every outcome.
        </p>
        <p data-intro className="mx-auto mt-3 max-w-[34rem] text-[1rem] leading-relaxed text-slate sm:text-[1.0625rem]">
          The complete performance infrastructure for affiliate tracking, intelligent lead distribution, and network
          management.
        </p>
        <div data-intro className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={DEMO_URL} size="hero">
            Book a Demo
          </ButtonLink>
          <ButtonLink href="#platform" variant="glass" size="hero">
            Explore the Platform
          </ButtonLink>
        </div>
      </div>

      <div className="container-page relative mt-12 sm:mt-16">
        <div className="hero-stage">
          <div data-frame>
            <div data-tilt className="hero-frame relative w-[175%] sm:w-full">
              <div
                ref={box}
                role="img"
                aria-label="The GetLinked dashboard showing profit, clicks, leads, conversions and lead quality, with sample data"
                className="relative overflow-hidden rounded-[18px]"
                style={{ aspectRatio: `${APP_W} / ${APP_H}` }}
              >
                <div ref={canvas} aria-hidden="true" className="absolute left-0 top-0 origin-top-left" style={{ width: APP_W, height: APP_H }}>
                  <AppFrame>
                    <DashboardView />
                  </AppFrame>
                </div>
                <div aria-hidden="true" className="hero-glare pointer-events-none absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent to-ink-950" />
    </section>
  );
}
