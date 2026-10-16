'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { AppFrame } from '@/components/product/AppFrame';
import { DashboardView } from '@/components/product/DashboardView';
import { APP_H, APP_W } from '@/components/product/appData';
import { ButtonLink } from '@/components/site/ButtonLink';
import { DEMO_URL } from '@/components/site/links';

gsap.registerPlugin(useGSAP);

const HIGHLIGHTS = ['Click tracking', 'Lead distribution', 'Lead Recycling', 'Postbacks', 'Invoicing'];

/** First screen: the promise on the brand blue, and the GetLinked dashboard itself resting on top of it. */
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
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('[data-intro]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07 }, 0.1)
          .fromTo('[data-frame]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.3);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className="relative overflow-x-clip pb-14 pt-[calc(var(--banner-h,0px)+6.5rem)] sm:pt-[calc(var(--banner-h,0px)+7.5rem)] lg:pt-[calc(var(--banner-h,0px)+8.5rem)]">
      <div aria-hidden="true" className="brand-blue brand-grid pointer-events-none absolute inset-x-0 top-0 bottom-[24%] sm:bottom-[32%]" />

      <div className="container-page relative text-center text-white">
        <h1
          data-intro
          className="headline-fill mx-auto max-w-[24ch] font-display text-[clamp(2.25rem,5.4vw,4.5rem)] font-semibold leading-[1.03] tracking-[-0.038em] [text-wrap:balance]"
        >
          <span className="block">Your Entire Affiliate Traffic.</span>
          <span className="block">One Powerful Platform.</span>
        </h1>
        <p data-intro className="mx-auto mt-6 max-w-[42rem] text-[1.0625rem] font-medium leading-snug tracking-[-0.01em] sm:mt-7 sm:text-[1.3125rem]">
          GetLinked is the most advanced affiliate management platform, trusted by over 300 networks and offering more than
          200 powerful features.
        </p>
        <p data-intro className="mx-auto mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed text-sky sm:mt-4 sm:text-[1.0625rem]">
          Built for Finance and iGaming, GetLinked combines intelligent lead distribution, automated reshuffling, partner
          management, and real-time tracking in one powerful platform designed to maximize performance and accelerate growth.
        </p>
        <div data-intro className="mt-7 flex flex-wrap justify-center gap-3 sm:mt-8">
          <ButtonLink href={DEMO_URL} variant="white" size="hero">
            Book a Demo
          </ButtonLink>
          <ButtonLink href="#platform" variant="outlineLight" size="hero">
            Explore the Platform
          </ButtonLink>
        </div>
      </div>

      <div className="container-page relative mt-12 sm:mt-16">
        <div data-frame className="mx-auto max-w-[1160px]">
          <div className="hero-frame relative w-[175%] sm:w-full">
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
            </div>
          </div>
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-2.5 text-[0.9375rem] font-medium text-muted">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bright" />
              {h}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
