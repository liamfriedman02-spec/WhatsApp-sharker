import { ConceptBanner } from '@/components/site/ConceptBanner';
import { Navbar } from '@/components/site/Navbar';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SystemTour } from '@/components/tour/SystemTour';

export default function HomePage() {
  return (
    <>
      <ConceptBanner />
      <Navbar />
      <main>
        <SystemTour />
      </main>
      <SiteFooter />
    </>
  );
}
