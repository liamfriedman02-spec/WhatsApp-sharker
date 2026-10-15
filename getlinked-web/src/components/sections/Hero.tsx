'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { ButtonLink } from '@/components/site/ButtonLink';
import { heroState } from '@/lib/heroState';
import { HeroVisual } from './HeroVisual';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HEADLINE = ['The Most Advanced', 'Finance & iGaming', 'Tracking Platform'];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        heroState.intro = 1;
        heroState.progress = 0;
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // One orchestrated moment: the engine powers on while the headline rises into place.
        const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
        intro
          .fromTo(heroState, { intro: 0 }, { intro: 1, duration: 2.8, ease: 'power2.inOut' }, 0)
          .fromTo('[data-line]', { yPercent: 108 }, { yPercent: 0, duration: 1.3, stagger: 0.1 }, 0.35)
          .fromTo('[data-fade]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, 0.9);

        // Scrolling past the hero drives the camera towards the core (read by the 3D scene).
        ScrollTrigger.create({
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          onUpdate: (self) => {
            heroState.progress = self.progress;
          },
        });

        gsap.to('[data-copy]', {
          yPercent: -14,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: '65% top', scrub: true },
        });

        return () => {
          heroState.progress = 0;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <HeroVisual />
      <div aria-hidden="true" className="hero-scrim pointer-events-none absolute inset-0" />

      <div className="container-page relative flex min-h-[100svh] flex-col justify-end pb-[max(2.75rem,env(safe-area-inset-bottom))] pt-28 md:justify-center md:pb-28">
        <div data-copy className="max-w-[41rem]">
          <h1
            id="hero-title"
            className="font-display text-[clamp(2.55rem,1.1rem+4.5vw,5.35rem)] font-semibold leading-[0.98] tracking-[-0.037em]"
          >
            {HEADLINE.map((line) => (
              <span key={line} className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
                <span data-line className="headline-fill block">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            data-fade
            className="mt-7 text-[clamp(1.125rem,1rem+0.45vw,1.375rem)] font-medium leading-snug tracking-[-0.012em] text-fg"
          >
            Track every click. Route every lead. Control every outcome.
          </p>
          <p data-fade className="mt-3 max-w-[33rem] text-[1.0625rem] leading-relaxed text-slate">
            The complete performance infrastructure for affiliate tracking, intelligent lead distribution, and
            network management.
          </p>

          <div data-fade className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="#demo" size="lg">
              Book a Demo
            </ButtonLink>
            <ButtonLink href="#platform" variant="glass" size="lg">
              Explore the Platform
            </ButtonLink>
          </div>
        </div>

        <a
          data-fade
          href="#platform"
          className="scroll-cue absolute bottom-9 left-5 hidden lg:left-10 items-center gap-3 rounded-md text-[0.8125rem] text-slate-dim transition-colors hover:text-slate md:inline-flex"
        >
          <span className="scroll-cue-track" aria-hidden="true" />
          Scroll to follow a lead
        </a>
      </div>
    </section>
  );
}
