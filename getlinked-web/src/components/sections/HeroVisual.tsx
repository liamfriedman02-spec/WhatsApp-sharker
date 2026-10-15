'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { heroState } from '@/lib/heroState';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { canUseWebGL } from '@/lib/webgl';

const HeroCanvas = dynamic(() => import('@/three/HeroCanvas'), { ssr: false });

const noop = () => () => {};

/** The 3D engine behind the hero copy, with a static glow for browsers without WebGL. */
export function HeroVisual() {
  const reducedMotion = useReducedMotion();
  const supported = useSyncExternalStore(noop, canUseWebGL, () => false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      heroState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      <div className="hero-fallback absolute inset-0" />
      {supported && (
        <div
          className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out ${ready ? 'opacity-100' : 'opacity-0'}`}
        >
          <HeroCanvas reducedMotion={reducedMotion} onReady={onReady} />
        </div>
      )}
    </div>
  );
}
