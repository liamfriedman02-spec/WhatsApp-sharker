/**
 * Shown only in shared design previews (NEXT_PUBLIC_CONCEPT_BANNER=1), so a preview
 * link can't be mistaken for the live GetLinked website.
 */
export function ConceptBanner() {
  if (process.env.NEXT_PUBLIC_CONCEPT_BANNER !== '1') return null;
  return (
    <>
      <style>{':root{--banner-h:1.75rem}'}</style>
      <div className="fixed inset-x-0 top-0 z-[60] flex h-7 items-center justify-center bg-emerald px-4 text-[0.78rem] font-medium text-ink-950">
        Design preview. Not the live GetLinked website.
      </div>
    </>
  );
}
