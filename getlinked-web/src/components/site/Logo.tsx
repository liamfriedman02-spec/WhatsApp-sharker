import Image from 'next/image';
import logo from './getlinked-logo.svg';

/** The official getlinked.io wordmark (white, for dark backgrounds). */
export function Logo({ className = 'h-7' }: { className?: string }) {
  return (
    <a href="#top" className="flex shrink-0 items-center rounded-lg">
      <Image src={logo} alt="GetLinked" unoptimized priority className={`${className} w-auto`} />
    </a>
  );
}
