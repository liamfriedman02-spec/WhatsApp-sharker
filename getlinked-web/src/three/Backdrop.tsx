'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { heroState } from '@/lib/heroState';
import { seeded } from './geometry';
import { createBackdropMaterial, createDustMaterial } from './materials';

/** The navy void behind the engine: a soft glow plane and slow, distant dust. */
export function Backdrop({ dustCount, animate }: { dustCount: number; animate: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const backdrop = useMemo(() => createBackdropMaterial(), []);
  const dust = useMemo(() => createDustMaterial(dpr), [dpr]);

  const dustGeometry = useMemo(() => {
    const rand = seeded(19);
    const positions = new Float32Array(dustCount * 3);
    const seeds = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (rand() - 0.5) * 52;
      positions[i * 3 + 1] = (rand() - 0.5) * 26;
      positions[i * 3 + 2] = -4 - rand() * 40;
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [dustCount]);

  useFrame((state) => {
    dust.uniforms.uTime.value = animate ? state.clock.elapsedTime : 12;
    dust.uniforms.uIntro.value = THREE.MathUtils.smoothstep(heroState.intro, 0, 0.7);
  });

  return (
    <group>
      <mesh position={[2, 0, -46]} material={backdrop} renderOrder={-1}>
        <planeGeometry args={[190, 105]} />
      </mesh>
      <points geometry={dustGeometry} material={dust} frustumCulled={false} />
    </group>
  );
}
