'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { railMaterial } from './materials';
import {
  COLORS,
  COMMISSION_PATH,
  FLY,
  GATE_Z,
  INCOME_PATH,
  LANES,
  LEAD_SEGMENTS,
  NODE_Z,
  POSTBACK_PATH,
  world,
} from './worldState';

const smooth = THREE.MathUtils.smoothstep;

function useTrack(curve: THREE.Curve<THREE.Vector3>, color: THREE.Color, radius = 0.028, opts: Parameters<typeof railMaterial>[1] = {}) {
  return useMemo(
    () => ({ geometry: new THREE.TubeGeometry(curve, 200, radius, 8, false), material: railMaterial(color, { draw: 0, ...opts }) }),
    // Curves and colours are module constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

/** Lead Recycling: the track that takes the lead back to the bucket and on to D. */
export function RecycleTrack({ animate }: { animate: boolean }) {
  const track = useTrack(LEAD_SEGMENTS[3], COLORS.violet, 0.03, { speed: 0.18, density: 4, base: 0.35 });
  useFrame((state) => {
    track.material.uniforms.uTime.value = animate ? state.clock.elapsedTime : 1;
    track.material.uniforms.uDraw.value = world.recycle;
    track.material.uniforms.uGain.value = 1 - world.finale * 0.6;
  });
  return <mesh geometry={track.geometry} material={track.material} />;
}

/** A pulse of light that travels along a curve as `progress` goes from 0 to 1. */
function Pulse({ curve, progress, color, size = 0.16 }: { curve: THREE.Curve<THREE.Vector3>; progress: () => number; color: THREE.Color; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const t = progress();
    if (!ref.current) return;
    ref.current.visible = t > 0.001 && t < 0.999;
    curve.getPointAt(Math.min(1, Math.max(0, t)), p);
    ref.current.position.copy(p);
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[size, 20, 12]} />
      <meshBasicMaterial color={color.clone().multiplyScalar(3)} toneMapped={false} />
    </mesh>
  );
}

/** The advertiser's postback travelling back to the GetLinked core. */
export function Postback({ animate }: { animate: boolean }) {
  const track = useTrack(POSTBACK_PATH, COLORS.emerald, 0.03, { speed: 0.3, density: 3, base: 0.3 });
  useFrame((state) => {
    track.material.uniforms.uTime.value = animate ? state.clock.elapsedTime : 1;
    track.material.uniforms.uDraw.value = world.postback;
    track.material.uniforms.uGain.value = (1 - smooth(world.cam, 5.2, 5.8)) * 1.2;
  });
  return (
    <group>
      <mesh geometry={track.geometry} material={track.material} />
      <Pulse curve={POSTBACK_PATH} progress={() => world.postback} color={COLORS.mint} size={0.18} />
    </group>
  );
}

/** Revenue: value flowing in from the advertiser and out to the affiliate as commission. */
export function Money({ animate }: { animate: boolean }) {
  const income = useTrack(INCOME_PATH, COLORS.emerald, 0.026, { speed: 0.4, density: 6, base: 0.3 });
  const commission = useTrack(COMMISSION_PATH, COLORS.sky, 0.026, { speed: 0.4, density: 6, base: 0.3 });
  const coins = useRef<THREE.InstancedMesh>(null);
  const N = 18;
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(), c: new THREE.Color() }), []);
  useFrame((state) => {
    const time = animate ? state.clock.elapsedTime : 2;
    const draw = smooth(world.money, 0, 0.6);
    const fade = 1 - world.finale;
    for (const m of [income.material, commission.material]) {
      m.uniforms.uTime.value = time;
      m.uniforms.uDraw.value = draw;
      m.uniforms.uGain.value = fade;
    }
    const mesh = coins.current;
    if (!mesh) return;
    const live = world.money > 0.05 && world.finale < 0.95;
    mesh.visible = live;
    if (!live) return;
    for (let i = 0; i < N; i++) {
      const half = i < N / 2;
      const curve = half ? INCOME_PATH : COMMISSION_PATH;
      const t = ((time * 0.35 + (i % (N / 2)) / (N / 2)) % 1) * draw;
      curve.getPointAt(t, tmp.p);
      tmp.q.setFromEuler(tmp.e.set(time * 2 + i, time * 3 + i, 0));
      tmp.s.setScalar(0.09);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
      mesh.setColorAt(i, tmp.c.copy(half ? COLORS.mint : COLORS.sky).multiplyScalar(2.4 * fade));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={income.geometry} material={income.material} />
      <mesh geometry={commission.geometry} material={commission.material} />
      <instancedMesh ref={coins} args={[undefined, undefined, N]} frustumCulled={false} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** The finale: many leads flowing through the same system at once. */
export function Swarm({ count, animate }: { count: number; animate: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const routes = useMemo(() => {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const intake = [...LEAD_SEGMENTS[0].getPoints(40), ...LEAD_SEGMENTS[1].getPoints(20).slice(1)];
    return [2, 3].map((lane) => {
      const x = LANES[lane];
      const tail = new THREE.CatmullRomCurve3([v(0, FLY, -22), v(x * 0.55, FLY, -25.5), v(x, 1.3, GATE_Z), v(x, 1.4, -32), v(x, 1.9, NODE_Z)]).getPoints(40);
      return new THREE.CatmullRomCurve3([...intake, ...tail.slice(1)]);
    });
  }, []);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ offset: (i * 0.618) % 1, route: i % 2, lift: ((i * 37) % 10) / 10 })), [count]);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const f = world.finale;
    m.visible = f > 0.01;
    if (!m.visible) return;
    const time = animate ? state.clock.elapsedTime : 5;
    seeds.forEach((s, i) => {
      const t = (time * 0.045 + s.offset) % 1;
      routes[s.route].getPointAt(t, tmp.p);
      tmp.p.y += (s.lift - 0.5) * 0.25;
      tmp.s.setScalar(0.1 * f);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      m.setMatrixAt(i, tmp.m);
      m.setColorAt(i, tmp.c.copy(t > 0.62 ? COLORS.mint : COLORS.sky).multiplyScalar(2.2));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
