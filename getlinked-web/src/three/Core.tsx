'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { heroState } from '@/lib/heroState';
import { engineState } from './engineState';
import { LINK, StadiumCurve } from './geometry';
import { GlassMaterial } from './GlassMaterial';
import { createFilamentMaterial, createGlowTexture, createNucleusMaterial, BRAND } from './materials';

/**
 * The GetLinked Core: two interlocked glass links, the brand mark in three dimensions,
 * with light running through them and a nucleus where they cross.
 */
export function Core({ lite, animate }: { lite: boolean; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tilt = useRef({ x: 0, y: 0 });

  const { glassGeometry, filamentGeometry } = useMemo(() => {
    const curve = new StadiumCurve(LINK.radius, LINK.halfStraight);
    return {
      glassGeometry: new THREE.TubeGeometry(curve, lite ? 160 : 260, LINK.tube, lite ? 18 : 32, true),
      filamentGeometry: new THREE.TubeGeometry(curve, 320, 0.017, 8, true),
    };
  }, [lite]);

  const filaments = useMemo(() => [createFilamentMaterial(0), createFilamentMaterial(0.5)], []);
  const nucleus = useMemo(() => createNucleusMaterial(), []);
  const halo = useMemo(() => createGlowTexture(), []);
  const haloRef = useRef<THREE.Sprite>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const intro = heroState.intro;
    engineState.pulse = Math.max(0, engineState.pulse - delta * 2.4);

    const k = 1 - Math.exp(-delta * 2.5);
    tilt.current.x += (heroState.pointer.y - tilt.current.x) * k;
    tilt.current.y += (heroState.pointer.x - tilt.current.y) * k;

    const g = group.current;
    if (g) {
      const sway = animate ? Math.sin(t * 0.17) * 0.42 : 0;
      g.rotation.set(0.42 - tilt.current.x * 0.14, 0.32 + sway + tilt.current.y * 0.18, -0.1);
      g.position.y = animate ? Math.sin(t * 0.55) * 0.05 : 0;
      const s = 0.84 + 0.16 * easeOutCubic(intro);
      g.scale.setScalar(s);
    }

    for (const m of filaments) {
      m.uniforms.uTime.value = t;
      m.uniforms.uIntro.value = THREE.MathUtils.smoothstep(intro, 0.15, 0.9);
      m.uniforms.uPulse.value = engineState.pulse;
    }
    nucleus.uniforms.uIntro.value = THREE.MathUtils.smoothstep(intro, 0.05, 0.6);
    nucleus.uniforms.uPulse.value = engineState.pulse;
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.SpriteMaterial;
      m.opacity = (0.35 + engineState.pulse * 0.45) * THREE.MathUtils.smoothstep(intro, 0.05, 0.6);
      haloRef.current.scale.setScalar(1.5 + engineState.pulse * 0.5);
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={glassGeometry} position={[-LINK.offset, 0, 0]} renderOrder={2}>
        <GlassMaterial lite={lite} />
      </mesh>
      <mesh geometry={glassGeometry} position={[LINK.offset, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
        <GlassMaterial lite={lite} />
      </mesh>
      <mesh geometry={filamentGeometry} material={filaments[0]} position={[-LINK.offset, 0, 0]} />
      <mesh
        geometry={filamentGeometry}
        material={filaments[1]}
        position={[LINK.offset, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh material={nucleus}>
        <icosahedronGeometry args={[0.17, 4]} />
      </mesh>
      <sprite ref={haloRef} scale={1.5}>
        <spriteMaterial
          map={halo}
          color={BRAND.emerald}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <pointLight color={BRAND.emerald} intensity={4} distance={4.5} decay={2} />
    </group>
  );
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
