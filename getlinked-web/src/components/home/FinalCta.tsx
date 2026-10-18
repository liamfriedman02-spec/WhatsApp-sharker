import { TELEGRAM_URL } from '@/components/site/links';
import { DemoForm } from './DemoForm';

const IN_THE_DEMO = [
  'GetLinked set up around your traffic, offers and buyers',
  'How your affiliates, advertisers and rules move over from your current platform',
  'Answers to your questions from our team',
];

/** The closing section: what the demo covers, a Telegram shortcut, and the demo form. */
export function FinalCta() {
  return (
    <section id="demo" className="scroll-mt-20 py-24 sm:py-32">
      <div className="container-page">
        <div className="brand-surface brand-grid relative overflow-hidden rounded-[32px] px-5 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <div aria-hidden="true" className="brand-glow pointer-events-none absolute inset-0" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-0">
            <div data-reveal className="lg:col-start-1 lg:row-start-1 lg:pt-4">
              <h2 className="headline-fill max-w-[14ch] font-display text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.03] tracking-[-0.038em] [text-wrap:balance]">
                Take control of your entire network.
              </h2>
              <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-relaxed text-white/90 sm:text-[1.125rem]">
                Book a demo and see GetLinked running the way your network works today.
              </p>
            </div>

            <div data-reveal className="rounded-[24px] bg-paper p-5 text-ink shadow-[0_40px_80px_-40px_rgb(3_40_28/0.6)] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <DemoForm />
            </div>

            <div data-reveal className="lg:col-start-1 lg:row-start-2">
              <p className="text-[0.9375rem] font-semibold text-pale lg:mt-9">In your demo</p>
              <ul className="mt-4 space-y-3.5">
                {IN_THE_DEMO.map((item) => (
                  <li key={item} className="flex gap-3 text-[1rem] leading-snug text-white">
                    <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/15 pt-8">
                <span className="text-[1rem] text-white/90">Prefer to talk now?</span>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2.5 rounded-[11px] bg-white/10 pl-2 pr-4 text-[0.9375rem] font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/15"
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#2aabee" />
                    <path d="M5.4 11.7l11.3-4.4c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1.1.5l-2.9-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.8z" fill="#fff" />
                  </svg>
                  Message us on Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
