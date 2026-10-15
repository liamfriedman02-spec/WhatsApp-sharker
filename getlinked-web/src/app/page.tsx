import { Hero } from '@/components/sections/Hero';
import { ConceptBanner } from '@/components/site/ConceptBanner';
import { Navbar } from '@/components/site/Navbar';

export default function HomePage() {
  return (
    <>
      <ConceptBanner />
      <Navbar />
      <main>
        <Hero />
        {/* Scene 2 lands here next. The space lets the hero's scroll-driven camera move be reviewed. */}
        <section
          id="platform"
          aria-label="Next section in progress"
          className="relative flex min-h-[100svh] items-center justify-center bg-ink-950"
        >
          <p className="font-mono text-[0.8125rem] text-slate-dim">Scene 2, Follow the Lead, is next.</p>
        </section>
      </main>
    </>
  );
}
