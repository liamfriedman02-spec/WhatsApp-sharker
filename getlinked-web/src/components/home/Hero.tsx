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

const HIGHLIGHTS = ['Click tracking', 'Lead distribution', 'Lead Recycling', 'Postbacks', 'Invoicing'];

/** First screen: the promise on deep emerald, and the GetLinked dashboard itself resting on top of it. */
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
          .timeline({ defaults: { ease: 'power4.out' } })
          // y: 0 stops GSAP reading the CSS starting offset (translateY(105%)) as a fixed shift it keeps.
          .fromTo('[data-line]', { y: 0, yPercent: 105 }, { y: 0, yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.1)
          .fromTo('[data-intro]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.45)
          .fromTo('[data-frame]', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.6);

        // The dashboard starts tipped back and settles flat as the page scrolls.
        gsap.fromTo(
          '[data-tilt]',
          { rotateX: 14, scale: 0.94 },
          { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '[data-tilt]', start: 'top 95%', end: 'top 25%', scrub: 0.6 } },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className="relative overflow-x-clip pb-14 pt-[calc(var(--banner-h,0px)+6.5rem)] sm:pt-[calc(var(--banner-h,0px)+7.5rem)] lg:pt-[calc(var(--banner-h,0px)+8.5rem)]">
      <div aria-hidden="true" className="brand-surface brand-grid pointer-events-none absolute inset-x-0 top-0 bottom-[24%] overflow-hidden sm:bottom-[32%]">
        <div className="brand-glow absolute inset-0" />
      </div>

      <div className="container-page relative text-center text-white">
        <h1 className="mx-auto max-w-[24ch] font-display text-[clamp(2.25rem,5.4vw,4.5rem)] font-semibold leading-[1.03] tracking-[-0.038em] [text-wrap:balance]">
          {['Your Entire Affiliate Traffic.', 'One Powerful Platform.'].map((line) => (
            <span key={line} className="block overflow-hidden pb-[0.08em]">
              <span data-line className={`block ${line.startsWith('One') ? 'text-mint-fill' : 'headline-fill'}`}>
                {line}
              </span>
            </span>
          ))}
        </h1>
        <p data-intro className="mx-auto mt-6 max-w-[42rem] text-[1.0625rem] font-medium leading-snug tracking-[-0.01em] sm:mt-7 sm:text-[1.3125rem]">
          GetLinked is the most advanced affiliate management platform, trusted by over 300 networks and offering more than
          200 powerful features.
        </p>
        <p data-intro className="mx-auto mt-3 max-w-[40rem] text-[0.9375rem] leading-relaxed text-white/90 sm:mt-4 sm:text-[1.0625rem]">
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
        <div data-frame className="mx-auto max-w-[1160px] [perspective:1800px]">
          <div data-tilt className="hero-frame relative w-[175%] origin-top sm:w-full">
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
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              {h}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
