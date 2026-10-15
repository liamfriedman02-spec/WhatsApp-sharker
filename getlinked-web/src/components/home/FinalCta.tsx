import { ButtonLink } from '@/components/site/ButtonLink';
import { DEMO_URL } from '@/components/site/links';

export function FinalCta() {
  return (
    <section id="demo" className="scroll-mt-20 pb-24 sm:pb-32">
      <div className="container-page">
        <div className="cta-panel relative overflow-hidden rounded-[32px] border border-line px-6 py-20 text-center sm:px-12 sm:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(157_175_195/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(157_175_195/0.06)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_70%_at_50%_40%,#000,transparent)]"
          />
          <div className="relative">
            <h2 className="headline-fill mx-auto max-w-[18ch] font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.03] tracking-[-0.038em] [text-wrap:balance]">
              Take control of your entire network.
            </h2>
            <p className="mx-auto mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-slate sm:text-[1.125rem]">
              See tracking, lead distribution, Lead Recycling and reporting set up around the way your network works today.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href={DEMO_URL} size="hero">
                Book a Demo
              </ButtonLink>
              <ButtonLink href="#journey" variant="glass" size="hero">
                Watch a lead go through
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
