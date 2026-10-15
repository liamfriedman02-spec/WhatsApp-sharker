'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { heroState } from '@/lib/heroState';

const LOOK = new THREE.Vector3(0, 0, 0);

/**
 * Frames the engine for the viewport and moves the camera with intro, pointer and scroll.
 * On wide screens the engine sits right of centre (copy on the left); on phones it sits
 * high (copy below). Scrolling past the hero pulls the camera in and recentres the core.
 */
export function CameraRig({ animate }: { animate: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const pos = useRef(new THREE.Vector3());
  const goal = useRef(new THREE.Vector3());
  const first = useRef(true);

  useEffect(() => {
    first.current = true;
    invalidate();
  }, [size.width, size.height, invalidate]);

  useFrame((_, delta) => {
    const { width: w, height: h } = size;
    const aspect = w / h;
    const wide = w >= 900 && aspect > 1.05;
    const progress = animate ? heroState.progress : 0;
    const intro = easeInOut(heroState.intro);

    // Distance that keeps the core and its advertisers in frame for this aspect ratio.
    const distance = wide
      ? 14 * THREE.MathUtils.clamp(1.6 / aspect, 1, 1.55)
      : THREE.MathUtils.clamp(4.6 / (0.5734 * aspect), 10, 22);

    goal.current.set(
      (animate ? heroState.pointer.x * 0.45 : 0) + progress * 0.4,
      0.6 + (animate ? -heroState.pointer.y * 0.28 : 0) + (1 - intro) * 1.4,
      distance * (1 - progress * 0.42) + (1 - intro) * 4.5,
    );

    if (first.current || !animate) {
      pos.current.copy(goal.current);
      first.current = false;
    } else {
      pos.current.lerp(goal.current, 1 - Math.exp(-delta * 3));
    }
    camera.position.copy(pos.current);
    camera.lookAt(LOOK);

    if (wide) camera.setViewOffset(w, h, -w * 0.18 * (1 - progress), 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.2 * (1 - progress * 0.7), w, h);
    camera.updateProjectionMatrix();
  });

  return null;
}

function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
