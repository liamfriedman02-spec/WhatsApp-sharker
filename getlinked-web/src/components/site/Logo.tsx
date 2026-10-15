/** Two interlocked links: the same mark the 3D core is built from. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <g transform="rotate(-35 16 16)" strokeLinecap="round">
        <rect x="3" y="11" width="15" height="10" rx="5" stroke="#3977e8" strokeWidth="3" />
        <rect x="14" y="11" width="15" height="10" rx="5" stroke="#08111f" strokeWidth="6" />
        <rect x="14" y="11" width="15" height="10" rx="5" stroke="#19be8f" strokeWidth="3" />
        {/* Redraw the blue link where it passes over the green one, so they read as interlocked. */}
        <path d="M17.53 18.11 A5 5 0 0 1 13.87 20.92" stroke="#08111f" strokeWidth="6" />
        <path d="M17.53 18.11 A5 5 0 0 1 13.87 20.92" stroke="#3977e8" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <a href="#top" aria-label="GetLinked home" className="flex shrink-0 items-center gap-2.5 rounded-lg">
      <LogoMark className="h-7 w-7" />
      <span className="font-display text-[1.1875rem] font-semibold tracking-[-0.02em] text-fg">GetLinked</span>
    </a>
  );
}
