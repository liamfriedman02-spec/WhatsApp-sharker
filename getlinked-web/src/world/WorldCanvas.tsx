'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useState } from 'react';
import { CameraRig } from './CameraRig';
import { Money, Postback, RecycleTrack, Swarm } from './Flows';
import { Labels } from './Labels';
import { Lead } from './Lead';
import { Dust, Floor, Gates, Hub, Lighting, Nodes, Portal, Rails, Scanner } from './Stage';

/**
 * Inside GetLinked: the futuristic system the visitor dives into from the dashboard.
 * Loaded on the client only. Phones and touch devices get a lighter build.
 */
export default function WorldCanvas({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const [lite] = useState(() => window.matchMedia('(max-width: 767px), (pointer: coarse)').matches);
  const [effects, setEffects] = useState(!lite);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75));
  const animate = !reducedMotion;

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: lite, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.1, far: 160, position: [0, 1.75, 6.5] }}
      frameloop={active ? 'always' : 'demand'}
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#050b16']} />
      <fog attach="fog" args={['#050b16', 26, 70]} />
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => {
          setDpr(1);
          setEffects(false);
        }}
      />
      {/* Only the environment map can suspend; keep everything else (and its HTML labels) outside. */}
      <Suspense fallback={null}>
        <Lighting />
      </Suspense>
      <Floor />
        <Dust count={lite ? 500 : 1300} animate={animate} />
        <Rails animate={animate} />
        <Portal />
        <Scanner lite={lite} animate={animate} />
        <Hub animate={animate} />
        <Gates animate={animate} />
        <Nodes lite={lite} animate={animate} />
        <RecycleTrack animate={animate} />
        <Postback animate={animate} />
        <Money animate={animate} />
        <Swarm count={lite ? 36 : 70} animate={animate} />
        <Labels />
        <Lead />
        <CameraRig animate={animate} />
      {effects && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.8} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.25} darkness={0.6} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
