'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_KEYS, CAMERA_LOOK, CAMERA_POS, world } from './worldState';

/**
 * Moves the camera along its path as `world.cam` changes. On wide screens the scene is
 * shifted right so the copy keeps the left column; on phones it's shifted up.
 */
export function CameraRig({ animate }: { animate: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const pointer = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), cur: new THREE.Vector3(), curLook: new THREE.Vector3(), first: true }), []);

  useFrame((state, delta) => {
    const { width: w, height: h } = size;
    const wide = w >= 1024 && w / h > 1.05;
    const u = THREE.MathUtils.clamp(world.cam / (CAMERA_KEYS.length - 1), 0, 1);
    CAMERA_POS.getPoint(u, tmp.pos);
    CAMERA_LOOK.getPoint(u, tmp.look);

    // Phones and squarer windows: back the camera off along its view direction.
    const back = wide ? THREE.MathUtils.clamp(1.6 / (w / h), 1, 1.35) : THREE.MathUtils.clamp(1.1 / (w / h), 1.2, 1.65);
    tmp.pos.sub(tmp.look).multiplyScalar(back).add(tmp.look);

    if (animate) {
      const k = 1 - Math.exp(-delta * 2.5);
      pointer.current.x += (state.pointer.x - pointer.current.x) * k;
      pointer.current.y += (state.pointer.y - pointer.current.y) * k;
      tmp.pos.x += pointer.current.x * 0.35;
      tmp.pos.y += pointer.current.y * 0.2;
    }

    if (tmp.first || !animate) {
      tmp.cur.copy(tmp.pos);
      tmp.curLook.copy(tmp.look);
      tmp.first = false;
    } else {
      const k = 1 - Math.exp(-delta * 6);
      tmp.cur.lerp(tmp.pos, k);
      tmp.curLook.lerp(tmp.look, k);
    }
    camera.position.copy(tmp.cur);
    camera.lookAt(tmp.curLook);

    const fov = wide ? 42 : 52;
    if (camera.fov !== fov) camera.fov = fov;
    if (wide) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.13, w, h);
    camera.updateProjectionMatrix();
  });

  return null;
}
