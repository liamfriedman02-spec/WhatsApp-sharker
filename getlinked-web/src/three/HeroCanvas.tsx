'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import { Backdrop } from './Backdrop';
import { CameraRig } from './CameraRig';
import { Core } from './Core';
import { Effects } from './Effects';
import { Lighting } from './Lighting';
import { Network } from './Network';

type Props = {
  reducedMotion: boolean;
  onReady: () => void;
};

/**
 * The hero's WebGL scene. Loaded on the client only, after the page is interactive.
 * Phones and coarse pointers get a lighter build: no transmission, no post-processing.
 */
export default function HeroCanvas({ reducedMotion, onReady }: Props) {
  const [lite] = useState(() => window.matchMedia('(max-width: 767px), (pointer: coarse)').matches);
  const [effects, setEffects] = useState(!lite);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75));
  const animate = !reducedMotion;

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: lite, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 32, near: 0.1, far: 140, position: [0, 0.6, 14] }}
      frameloop={animate ? 'always' : 'demand'}
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#08111f']} />
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => {
          setDpr(1);
          setEffects(false);
        }}
      />
      <Suspense fallback={null}>
        <Lighting />
        <Backdrop dustCount={lite ? 520 : 1400} animate={animate} />
        <Core lite={lite} animate={animate} />
        <Network lite={lite} animate={animate} />
        <CameraRig animate={animate} />
        <ReadySignal onReady={onReady} />
      </Suspense>
      {effects && <Effects />}
    </Canvas>
  );
}

/** Tells the page the first frames have rendered, so the canvas can fade in without a pop. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current >= 3) {
      done.current = true;
      onReady();
    }
  });
  return null;
}
