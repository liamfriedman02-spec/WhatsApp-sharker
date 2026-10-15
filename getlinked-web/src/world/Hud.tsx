'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

type Vec3 = [number, number, number];

const EDGE = 10;

/**
 * A screen-space label pinned to a point in the world. Its visibility is a function of
 * the world state, evaluated every frame, so GSAP never has to touch these DOM nodes.
 * While visible it's nudged sideways to stay inside the viewport.
 */
export function Hud({ position, visible, children }: { position: Vec3; visible: () => number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef({ v: -1, translate: '' });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    const el = ref.current;
    if (!el) return;
    const v = Math.round(Math.max(0, Math.min(1, visible())) * 100) / 100;
    if (v !== last.current.v) {
      last.current.v = v;
      el.style.opacity = String(v);
      el.style.visibility = v < 0.01 ? 'hidden' : 'visible';
    }
    if (v < 0.01) return;

    const x = ((tmp.set(position[0], position[1], position[2]).project(camera).x + 1) / 2) * size.width;
    const half = el.offsetWidth / 2;
    const dx = Math.max(EDGE - (x - half), 0) + Math.min(size.width - EDGE - (x + half), 0);
    const translate = `${Math.round(dx)}px ${((1 - v) * 10).toFixed(1)}px`;
    if (translate !== last.current.translate) {
      last.current.translate = translate;
      el.style.translate = translate;
    }
  });

  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className="hud" style={{ opacity: 0, visibility: 'hidden' }}>
        {children}
      </div>
    </Html>
  );
}
