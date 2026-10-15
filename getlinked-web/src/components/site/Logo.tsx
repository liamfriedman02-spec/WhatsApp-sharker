import type { CSSProperties } from 'react';
import logo from './getlinked-logo.svg';

/** The official getlinked.io wordmark. It takes the current text colour, so it works on blue and on white. */
export function Logo({ className = 'h-7' }: { className?: string }) {
  return (
    <a href="#top" aria-label="GetLinked" className="flex shrink-0 items-center rounded-lg">
      <span aria-hidden="true" className={`logo-mark block ${className}`} style={{ '--logo': `url(${logo.src})` } as CSSProperties} />
    </a>
  );
}
