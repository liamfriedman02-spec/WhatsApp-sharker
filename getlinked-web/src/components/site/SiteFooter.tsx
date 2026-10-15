import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="container-page flex flex-col gap-6 py-10 text-[0.875rem] text-slate-dim md:flex-row md:items-center">
        <Logo className="h-6" />
        <p className="md:ml-6">Affiliate tracking, lead distribution and network management for Finance and iGaming.</p>
        <p className="md:ml-auto">Product screens show sample data. © {new Date().getFullYear()} GetLinked</p>
      </div>
    </footer>
  );
}
