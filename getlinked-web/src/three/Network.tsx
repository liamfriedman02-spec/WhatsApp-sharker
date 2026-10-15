'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { heroState } from '@/lib/heroState';
import { engineState } from './engineState';
import {
  CORE_CENTER,
  DESTINATIONS,
  DESTINATION_SIZE,
  INLET,
  OUTLET,
  createIncomingCurves,
  createOutgoingCurves,
} from './geometry';
import { GlassMaterial } from './GlassMaterial';
import { BRAND, createStreamMaterial } from './materials';

const TRAIL = 7;
const MAX_PACKETS = 28;
const INCOMING_SECONDS = 3.6;
const ENGINE_SECONDS = 0.75;
const OUTGOING_SECONDS = 1.8;

type Packet = {
  /** 0 = arriving from an affiliate, 1 = inside the engine, 2 = routed to an advertiser. */
  stage: 0 | 1 | 2;
  stream: number;
  destination: number;
  t: number;
  flashed: boolean;
};

const LEAD_IN = new THREE.Color(0.62, 0.8, 1).multiplyScalar(2.6);
const LEAD_OUT = new THREE.Color(0.32, 1, 0.78).multiplyScalar(2.6);

/** Traffic streams, the leads travelling on them, and the advertiser nodes they reach. */
export function Network({ lite, animate }: { lite: boolean; animate: boolean }) {
  const incoming = useMemo(() => createIncomingCurves(lite ? 7 : 11), [lite]);
  const outgoing = useMemo(() => createOutgoingCurves(), []);

  const incomingGeometry = useMemo(
    () => incoming.map((c) => new THREE.TubeGeometry(c, 200, 0.011, 6, false)),
    [incoming],
  );
  const outgoingGeometry = useMemo(
    () => outgoing.map((c) => new THREE.TubeGeometry(c, 120, 0.013, 6, false)),
    [outgoing],
  );
  const incomingMaterials = useMemo(
    () =>
      incoming.map((_, i) =>
        createStreamMaterial({
          from: BRAND.blue,
          to: new THREE.Color('#9cc4ff'),
          speed: 0.05 + (i % 3) * 0.012,
          offset: i * 0.137,
          density: 1.4,
          fadeIn: 0.55,
        }),
      ),
    [incoming],
  );
  const outgoingMaterials = useMemo(
    () =>
      outgoing.map((_, i) =>
        createStreamMaterial({
          from: new THREE.Color('#7fe8c8'),
          to: BRAND.emerald,
          speed: 0.11,
          offset: i * 0.31,
          density: 1.1,
          fadeIn: 0.05,
          strength: 1.25,
        }),
      ),
    [outgoing],
  );

  const dots = useRef<THREE.InstancedMesh>(null);
  const packets = useRef<Packet[]>([]);
  const spawnClock = useRef(0);
  const rotation = useRef(0);

  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      mat: new THREE.Matrix4(),
      quat: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
      color: new THREE.Color(),
    }),
    [],
  );

  const step = (dt: number) => {
    spawnClock.current -= dt;
    if (heroState.intro > 0.45 && spawnClock.current <= 0 && packets.current.length < MAX_PACKETS) {
      packets.current.push({
        stage: 0,
        stream: Math.floor(Math.random() * incoming.length),
        destination: 0,
        t: 0,
        flashed: false,
      });
      spawnClock.current = 0.32 + Math.random() * 0.34;
    }

    const list = packets.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p.stage === 0) {
        p.t += dt / INCOMING_SECONDS;
        if (p.t >= 1) {
          p.stage = 1;
          p.t = 0;
          rotation.current = (rotation.current + 1) % outgoing.length;
          p.destination = rotation.current;
        }
      } else if (p.stage === 1) {
        p.t += dt / ENGINE_SECONDS;
        if (!p.flashed && p.t >= 0.5) {
          engineState.pulse = Math.min(1, engineState.pulse + 0.55);
          p.flashed = true;
        }
        if (p.t >= 1) {
          p.stage = 2;
          p.t = 0;
        }
      } else {
        p.t += dt / OUTGOING_SECONDS;
        if (p.t >= 1) {
          engineState.destinationPulse[p.destination] = 1;
          list.splice(i, 1);
        }
      }
    }
  };

  const positionAt = (p: Packet, t: number, out: THREE.Vector3) => {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    if (p.stage === 0) return incoming[p.stream].getPointAt(clamped, out);
    if (p.stage === 2) return outgoing[p.destination].getPointAt(clamped, out);
    return clamped < 0.5
      ? out.lerpVectors(INLET, CORE_CENTER, clamped * 2)
      : out.lerpVectors(CORE_CENTER, OUTLET, (clamped - 0.5) * 2);
  };

  const draw = () => {
    const mesh = dots.current;
    if (!mesh) return;
    let n = 0;
    for (const p of packets.current) {
      const gap = p.stage === 0 ? 0.0065 : p.stage === 1 ? 0.035 : 0.016;
      for (let k = 0; k < TRAIL; k++) {
        const fade = 1 - k / TRAIL;
        positionAt(p, p.t - k * gap, tmp.pos);
        tmp.scale.setScalar((0.028 + 0.022 * fade) * (k === 0 ? 1.15 : 1));
        tmp.mat.compose(tmp.pos, tmp.quat, tmp.scale);
        mesh.setMatrixAt(n, tmp.mat);
        if (p.stage === 0) tmp.color.copy(LEAD_IN);
        else if (p.stage === 2) tmp.color.copy(LEAD_OUT);
        else tmp.color.copy(LEAD_IN).lerp(LEAD_OUT, p.t);
        tmp.color.multiplyScalar(Math.pow(fade, 1.6));
        mesh.setColorAt(n, tmp.color);
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  // Seed the network so a still frame (reduced motion) already shows traffic.
  useLayoutEffect(() => {
    const mesh = dots.current;
    if (mesh) {
      for (let i = 0; i < MAX_PACKETS * TRAIL; i++) mesh.setColorAt(i, LEAD_IN);
    }
    if (!animate) {
      const intro = heroState.intro;
      heroState.intro = 1;
      for (let i = 0; i < 300; i++) step(1 / 30);
      heroState.intro = intro;
      draw();
    }
    // Only once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const intro = heroState.intro;
    for (const m of incomingMaterials) {
      m.uniforms.uTime.value = t;
      m.uniforms.uIntro.value = THREE.MathUtils.smoothstep(intro, 0.1, 0.85);
    }
    for (const m of outgoingMaterials) {
      m.uniforms.uTime.value = t;
      m.uniforms.uIntro.value = THREE.MathUtils.smoothstep(intro, 0.45, 1);
    }
    if (animate) {
      step(Math.min(delta, 1 / 20));
      draw();
    }
  });

  return (
    <group>
      {incomingGeometry.map((g, i) => (
        <mesh key={`in-${i}`} geometry={g} material={incomingMaterials[i]} renderOrder={3} />
      ))}
      {outgoingGeometry.map((g, i) => (
        <mesh key={`out-${i}`} geometry={g} material={outgoingMaterials[i]} renderOrder={3} />
      ))}
      <instancedMesh ref={dots} args={[undefined, undefined, MAX_PACKETS * TRAIL]} frustumCulled={false}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {DESTINATIONS.map((d, i) => (
        <Destination key={i} index={i} position={d} lite={lite} animate={animate} />
      ))}
    </group>
  );
}

function Destination({
  index,
  position,
  lite,
  animate,
}: {
  index: number;
  position: THREE.Vector3;
  lite: boolean;
  animate: boolean;
}) {
  const shell = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const pulse = (engineState.destinationPulse[index] = Math.max(0, engineState.destinationPulse[index] - delta * 1.8));
    const intro = THREE.MathUtils.smoothstep(heroState.intro, 0.5, 1);
    const t = state.clock.elapsedTime;
    if (shell.current) {
      shell.current.rotation.set(0.35, (animate ? t * 0.18 : 0) + index * 0.9, 0.12);
      shell.current.scale.setScalar(0.8 + 0.2 * intro + pulse * 0.06);
    }
    if (heart.current) {
      const m = heart.current.material as THREE.MeshBasicMaterial;
      m.color.copy(BRAND.emerald).multiplyScalar((0.9 + pulse * 3.2) * intro);
      heart.current.rotation.set(t * 0.4, t * 0.6, 0);
    }
  });

  return (
    <group position={position}>
      <group ref={shell}>
        <RoundedBox args={[DESTINATION_SIZE, DESTINATION_SIZE, DESTINATION_SIZE]} radius={0.1} smoothness={4} renderOrder={2}>
          <GlassMaterial lite={lite} tint="#eaf5ff" />
        </RoundedBox>
      </group>
      <mesh ref={heart}>
        <octahedronGeometry args={[0.11, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>
    </group>
  );
}
