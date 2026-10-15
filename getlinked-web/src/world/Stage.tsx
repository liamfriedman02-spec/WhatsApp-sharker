'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { barrierMaterial, dustMaterial, glowTexture, gridMaterial, hubMaterial, railMaterial, RoundedRectCurve } from './materials';
import {
  ADVERTISERS,
  COLORS,
  GATE_H,
  GATE_W,
  GATE_Z,
  HUB,
  LANE_PATHS,
  LANES,
  LEAD_SEGMENTS,
  NODE_Z,
  PORTAL,
  SCANNER,
  world,
} from './worldState';

const smooth = THREE.MathUtils.smoothstep;

function Glass({ lite, tint = '#dfeaff' }: { lite: boolean; tint?: string }) {
  if (lite) {
    return <meshPhysicalMaterial color={tint} roughness={0.15} metalness={0.2} clearcoat={1} transparent opacity={0.28} envMapIntensity={1.4} />;
  }
  return (
    <meshPhysicalMaterial
      color={tint}
      transmission={1}
      thickness={0.6}
      roughness={0.08}
      ior={1.45}
      clearcoat={1}
      clearcoatRoughness={0.06}
      attenuationColor="#9cc2ff"
      attenuationDistance={3}
      envMapIntensity={1.4}
    />
  );
}

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#03070f']} />
        <Lightformer form="rect" intensity={2.2} color="#dfeaff" position={[0, 8, -20]} rotation-x={Math.PI / 2} scale={[30, 6, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#3977e8" position={[-12, 3, -20]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#19be8f" position={[12, 2, -26]} rotation-y={-Math.PI / 2} scale={[16, 5, 1]} />
        <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[4, 5, 6]} scale={4} />
      </Environment>
    </>
  );
}

export function Floor() {
  const material = useMemo(() => gridMaterial(), []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -20]} material={material} renderOrder={-1}>
      <planeGeometry args={[140, 140]} />
    </mesh>
  );
}

export function Dust({ count, animate }: { count: number; animate: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useMemo(() => dustMaterial(dpr), [dpr]);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 70;
      positions[i * 3 + 1] = rand() * 22 - 2;
      positions[i * 3 + 2] = -80 + rand() * 90;
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);
  useFrame((state) => {
    material.uniforms.uTime.value = animate ? state.clock.elapsedTime : 4;
    material.uniforms.uWarp.value = world.warp;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/** The rails: the lead's main guideway and the floor lanes from the bucket to each advertiser. */
export function Rails({ animate }: { animate: boolean }) {
  const main = useMemo(() => {
    const pts = [...LEAD_SEGMENTS[0].getPoints(60), ...LEAD_SEGMENTS[1].getPoints(30)];
    const curve = new THREE.CatmullRomCurve3(pts);
    return { geometry: new THREE.TubeGeometry(curve, 240, 0.016, 6, false), material: railMaterial(COLORS.blue, { speed: 0.08, density: 5, base: 0.22 }) };
  }, []);
  const lanes = useMemo(
    () =>
      LANE_PATHS.map((c, i) => ({
        geometry: new THREE.TubeGeometry(c, 120, 0.03, 6, false),
        material: railMaterial(i < 2 ? COLORS.slate : COLORS.blue, { speed: 0.1, density: 2, base: 0.16 }),
      })),
    [],
  );
  const color = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const t = animate ? state.clock.elapsedTime : 3;
    main.material.uniforms.uTime.value = t;
    lanes.forEach((l, i) => {
      l.material.uniforms.uTime.value = t;
      const a = ADVERTISERS[i];
      const result = world.results[i];
      const live = i === 3 ? result : i === 2 ? result * (1 - world.quiet * 0.7) : 0;
      color.copy(i < 2 ? COLORS.slate : COLORS.blue).lerp(a.pass ? COLORS.emerald : COLORS.amber, a.pass ? live : result * 0.6);
      l.material.uniforms.uColor.value.copy(color);
      l.material.uniforms.uGain.value = a.pass ? 0.7 + live * 1.2 : 0.7 - result * 0.4;
    });
  });
  return (
    <group>
      <mesh geometry={main.geometry} material={main.material} />
      {lanes.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={l.material} />
      ))}
    </group>
  );
}

/** The screen the visitor dived through: a frame of light where the dashboard was. */
export function Portal() {
  const geometry = useMemo(() => new THREE.TubeGeometry(new RoundedRectCurve(3.6, 2.2, 0.22), 200, 0.035, 8, true), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: COLORS.sky.clone().multiplyScalar(2.2), toneMapped: false }), []);
  useFrame(() => {
    material.color.copy(COLORS.sky).multiplyScalar(0.6 + 1.6 * (1 - smooth(world.cam, 0.5, 1.2)));
  });
  return <mesh geometry={geometry} material={material} position={PORTAL} />;
}

/** Three scanning rings the lead passes through as it's tracked. */
export function Scanner({ lite, animate }: { lite: boolean; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Mesh[]>([]);
  const flash = useMemo(() => new THREE.MeshBasicMaterial({ color: COLORS.emerald.clone(), toneMapped: false, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const ringMats = useMemo(() => [COLORS.blue, COLORS.emerald, COLORS.sky].map((c) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.8), toneMapped: false })), []);
  useFrame((state) => {
    const t = animate ? state.clock.elapsedTime : 1;
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.25;
      r.rotation.y = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1);
    });
    // Brighten while the lead is inside the scanner.
    const inside = 1 - Math.min(1, Math.abs(world.lead - 0.6) * 6);
    flash.opacity = 0.08 + Math.max(0, inside) * 0.5;
    ringMats.forEach((m, i) => m.color.copy([COLORS.blue, COLORS.emerald, COLORS.sky][i]).multiplyScalar(1.2 + Math.max(0, inside) * 2));
  });
  return (
    <group ref={group} position={SCANNER}>
      {[1.25, 1.62, 2].map((r, i) => (
        <mesh key={r} ref={(m) => { if (m) rings.current[i] = m; }} material={ringMats[i]}>
          <torusGeometry args={[r, i === 1 ? 0.03 : 0.018, 8, 160]} />
        </mesh>
      ))}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[2.35, 0.09, 24, 160]} />
        <Glass lite={lite} />
      </mesh>
      <mesh material={flash}>
        <circleGeometry args={[1.2, 64]} />
      </mesh>
    </group>
  );
}

/** The bucket: a floor of pulsing rings and the GetLinked core above it. */
export function Hub({ animate }: { animate: boolean }) {
  const floor = useMemo(() => hubMaterial(), []);
  const core = useRef<THREE.Group>(null);
  const linkA = useRef<THREE.Mesh>(null);
  const linkB = useRef<THREE.Mesh>(null);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: COLORS.sky.clone(), toneMapped: false }), []);
  const halo = useMemo(() => glowTexture(), []);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  useFrame((state) => {
    const t = animate ? state.clock.elapsedTime : 2;
    floor.uniforms.uTime.value = t;
    const flash = Math.max(world.converted * (1 - smooth(world.cam, 5.6, 6.2)) * 0.6, Math.min(1, world.money * 1.5) * 0.4);
    floor.uniforms.uFlash.value = flash;
    if (core.current) core.current.rotation.y = t * 0.35;
    if (linkA.current) linkA.current.rotation.z = t * 0.6;
    if (linkB.current) linkB.current.rotation.x = Math.PI / 2 + t * 0.5;
    coreMat.color.copy(COLORS.sky).lerp(COLORS.mint, world.converted).multiplyScalar(1.6 + world.converted * 1.6);
    if (haloMat.current) haloMat.current.opacity = 0.35 + world.converted * 0.4 + world.money * 0.2;
  });
  return (
    <group position={HUB}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} material={floor}>
        <planeGeometry args={[8.4, 8.4]} />
      </mesh>
      <group ref={core} position={[0, 3.1, 0]}>
        <mesh ref={linkA} material={coreMat}>
          <torusGeometry args={[0.5, 0.045, 12, 96]} />
        </mesh>
        <mesh ref={linkB} material={coreMat} position={[0.42, 0, 0]}>
          <torusGeometry args={[0.5, 0.045, 12, 96]} />
        </mesh>
        <sprite scale={2.6}>
          <spriteMaterial ref={haloMat} map={halo} color={COLORS.blue} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>
      <mesh position={[0, 1.55, 0]} material={coreMat}>
        <cylinderGeometry args={[0.012, 0.012, 3.1, 8]} />
      </mesh>
    </group>
  );
}

/** One gate per advertiser. Closed gates fill with an amber barrier; open ones glow emerald. */
export function Gates({ animate }: { animate: boolean }) {
  const frame = useMemo(() => new THREE.TubeGeometry(new RoundedRectCurve(GATE_W, GATE_H, 0.28), 160, 0.045, 8, true), []);
  const frames = useMemo(() => LANES.map(() => new THREE.MeshBasicMaterial({ color: COLORS.blue.clone(), toneMapped: false })), []);
  const barriers = useMemo(() => LANES.map(() => barrierMaterial()), []);
  const scanBars = useRef<THREE.Mesh[]>([]);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const t = animate ? state.clock.elapsedTime : 2;
    LANES.forEach((_, i) => {
      const a = ADVERTISERS[i];
      const checks = world.checks[i];
      const result = world.results[i];
      const evaluating = checks > 0.01 && result < 0.99 ? 1 : 0;
      const quiet = i === 2 ? world.quiet : 0;
      color.copy(COLORS.blue).lerp(a.pass ? COLORS.emerald : COLORS.amber, result);
      if (quiet) color.lerp(COLORS.slate, quiet * 0.6);
      frames[i].color.copy(color).multiplyScalar(1.3 + result * 1.2 + evaluating * 0.6);
      barriers[i].uniforms.uTime.value = t;
      barriers[i].uniforms.uColor.value.copy(color);
      barriers[i].uniforms.uStrength.value = a.pass ? 0.12 + evaluating * 0.4 - result * 0.08 : 0.12 + evaluating * 0.4 + result * 1.1;
      const bar = scanBars.current[i];
      if (bar) {
        bar.visible = evaluating > 0;
        bar.position.y = GATE_H / 2 - 0.2 - ((checks % 1 || (checks >= 4 ? 1 : 0)) * (GATE_H - 0.4));
      }
    });
  });
  return (
    <group>
      {LANES.map((x, i) => (
        <group key={x} position={[x, GATE_H / 2 + 0.05, GATE_Z]}>
          <mesh geometry={frame} material={frames[i]} />
          <mesh material={barriers[i]}>
            <planeGeometry args={[GATE_W - 0.1, GATE_H - 0.1]} />
          </mesh>
          <mesh ref={(m) => { if (m) scanBars.current[i] = m; }} visible={false}>
            <boxGeometry args={[GATE_W - 0.2, 0.025, 0.025]} />
            <meshBasicMaterial color={COLORS.mint.clone().multiplyScalar(2.5)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Advertiser stations: glass prisms with a light that shows whether they're taking leads. */
export function Nodes({ lite, animate }: { lite: boolean; animate: boolean }) {
  const cores = useMemo(() => LANES.map(() => new THREE.MeshBasicMaterial({ color: COLORS.slate.clone(), toneMapped: false })), []);
  const tops = useMemo(() => LANES.map(() => new THREE.MeshBasicMaterial({ color: COLORS.slate.clone(), toneMapped: false })), []);
  const spin = useRef<THREE.Mesh[]>([]);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const t = animate ? state.clock.elapsedTime : 2;
    LANES.forEach((_, i) => {
      let energy = 0.5;
      color.copy(COLORS.blue);
      if (i < 2) {
        color.lerp(COLORS.amber, world.results[i]);
        energy = 0.5 + world.results[i] * 0.4;
      } else if (i === 2) {
        const got = smooth(world.lead, 2.85, 3);
        color.lerp(COLORS.emerald, got).lerp(COLORS.slate, world.quiet * 0.8);
        energy = 0.6 + got * 1.6 * (1 - world.quiet * 0.8);
      } else {
        const got = smooth(world.lead, 3.9, 4);
        color.lerp(COLORS.emerald, Math.max(got, world.converted));
        energy = 0.6 + got * 1.2 + world.converted * 1.4;
      }
      cores[i].color.copy(color).multiplyScalar(energy);
      tops[i].color.copy(color).multiplyScalar(energy * 1.4);
      const s = spin.current[i];
      if (s) s.rotation.y = t * 0.5 + i;
    });
  });
  return (
    <group>
      {LANES.map((x, i) => (
        <group key={x} position={[x, 0, NODE_Z]}>
          <mesh position-y={0.9}>
            <cylinderGeometry args={[0.95, 1.05, 1.8, 6]} />
            <Glass lite={lite} tint="#e6f0ff" />
          </mesh>
          <mesh ref={(m) => { if (m) spin.current[i] = m; }} position-y={0.95} material={cores[i]}>
            <octahedronGeometry args={[0.32, 0]} />
          </mesh>
          <mesh position-y={1.83} rotation-x={-Math.PI / 2} material={tops[i]}>
            <ringGeometry args={[0.7, 0.78, 6]} />
          </mesh>
          <mesh position-y={0.02} rotation-x={-Math.PI / 2} material={tops[i]}>
            <ringGeometry args={[1.25, 1.3, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
