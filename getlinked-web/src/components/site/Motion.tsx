'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Page-wide motion, driven by data attributes so sections stay server components:
 * - data-reveal: fades and rises into view as it scrolls in.
 * - data-count="300": the number counts up from zero the first time it's seen.
 * - data-chat: its data-msg children appear one after another, like messages arriving.
 * Everything is visible without JavaScript, and nothing moves for reduced motion.
 */
export function Motion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const reveal = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      gsap.set(reveal, { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch(reveal, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });

      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const to = Number(el.dataset.count);
        const suffix = el.dataset.suffix ?? '';
        const state = { v: 0 };
        el.textContent = `0${suffix}`;
        gsap.to(state, {
          v: to,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(state.v)}${suffix}`;
          },
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-chat]').forEach((chat) => {
        const msgs = chat.querySelectorAll('[data-msg]');
        gsap.set(msgs, { autoAlpha: 0, y: 12, scale: 0.97, transformOrigin: '0% 100%' });
        gsap.to(msgs, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: 'back.out(1.6)',
          stagger: 0.55,
          scrollTrigger: { trigger: chat, start: 'top 70%', once: true },
        });
      });
    });
  });
  return null;
}
