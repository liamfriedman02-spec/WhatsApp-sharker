import { Faq } from '@/components/home/Faq';
import { FinalCta } from '@/components/home/FinalCta';
import { Hero } from '@/components/home/Hero';
import { Pillars } from '@/components/home/Pillars';
import { Platform } from '@/components/home/Platform';
import { Solutions } from '@/components/home/Solutions';
import { WhyGetLinked } from '@/components/home/WhyGetLinked';
import { ConceptBanner } from '@/components/site/ConceptBanner';
import { Navbar } from '@/components/site/Navbar';
import { SiteFooter } from '@/components/site/SiteFooter';

export default function HomePage() {
  return (
    <>
      <ConceptBanner />
      <Navbar />
      <main>
        <Hero />
        <WhyGetLinked />
        <Platform />
        <Pillars />
        <Solutions />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
