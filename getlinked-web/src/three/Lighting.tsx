'use client';

import { Environment, Lightformer } from '@react-three/drei';

/**
 * A studio built from light panels, rendered once into an environment map.
 * It's what the glass reflects: a cool key from above, a blue rim on the left,
 * an emerald rim on the right and a ring for the catch-lights. No HDR download.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#050b15']} />
        <Lightformer form="rect" intensity={2.4} color="#dfeaff" position={[0, 6, -3]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#3977e8" position={[-7, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 9, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#19be8f" position={[7, -1.5, 0]} rotation-y={-Math.PI / 2} scale={[3.5, 7, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#ffffff" position={[1.5, 1.5, 7]} scale={3.2} />
        <Lightformer form="rect" intensity={0.8} color="#9dafc3" position={[0, -6, 2]} rotation-x={-Math.PI / 2} scale={[10, 2, 1]} />
      </Environment>
    </>
  );
}
