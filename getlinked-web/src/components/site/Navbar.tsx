'use client';

import { useEffect, useState } from 'react';
import { ButtonLink } from './ButtonLink';
import { DEMO_URL } from './links';
import { Logo } from './Logo';

const LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#grow' },
  { label: 'Finance', href: '#finance' },
  { label: 'iGaming', href: '#igaming' },
  { label: 'Resources', href: '#resources' },
];

/** White on the blue hero; a white bar with dark text once the page scrolls. */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`nav-in fixed inset-x-0 top-[var(--banner-h,0px)] z-50 border-b transition-[background-color,border-color,color,box-shadow] duration-500 ${
        solid ? 'border-line bg-white/90 text-deep shadow-[0_8px_30px_-20px_rgb(5_38_28/0.35)] backdrop-blur-xl' : 'border-transparent bg-transparent text-white'
      }`}
    >
      <div className="container-page flex h-16 items-center gap-6 lg:h-[72px]">
        <Logo />

        <nav aria-label="Main" className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`rounded-lg px-3.5 py-2 text-[0.9375rem] font-medium transition-colors duration-200 ${
                    solid ? 'text-muted hover:bg-tint hover:text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ButtonLink href={DEMO_URL} size="sm" variant={solid ? 'primary' : 'gold'} className="hidden sm:inline-flex">
            Book a Demo
          </ButtonLink>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-inset lg:hidden ${solid ? 'text-ink ring-line' : 'text-white ring-white/30'}`}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3.5 7h13M3.5 13h13" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-white lg:hidden">
          <nav aria-label="Mobile" className="container-page flex h-[calc(100svh-4rem-var(--banner-h,0px))] flex-col pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center border-b border-line py-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <ButtonLink href={DEMO_URL} size="lg" className="mt-auto w-full">
              Book a Demo
            </ButtonLink>
          </nav>
        </div>
      )}
    </header>
  );
}
