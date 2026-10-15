'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { glowTexture } from './materials';
import { COLORS, leadPosition, world } from './worldState';

const TRAIL = 14;
const STATUS = [
  { label: 'New lead', tone: 'blue' },
  { label: 'Routed to C', tone: 'green' },
  { label: 'Recycled to D', tone: 'violet' },
  { label: 'Converted · FTD', tone: 'solid' },
];

/** The lead: a bright core in a glass shell, a light trail, and its live data card. */
export function Lead() {
  const group = useRef<THREE.Group>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: COLORS.sky.clone(), toneMapped: false }), []);
  const halo = useMemo(() => glowTexture(), []);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const card = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLSpanElement | null)[]>([]);
  const lastStatus = useRef(-1);
  const lastCard = useRef(-1);
  const layout = useRef({ compact: '', side: '' });
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color(), t: new THREE.Color() }), []);

  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    leadPosition(world.lead, tmp.p);
    g.position.copy(tmp.p);
    const visible = world.card > 0.001 || world.lead > 0.001;
    g.visible = visible && world.finale < 0.98;

    tmp.c.copy(COLORS.sky).lerp(COLORS.mint, world.converted);
    coreMat.color.copy(tmp.c).multiplyScalar(2.6 + world.converted * 1.2);
    if (haloMat.current) {
      haloMat.current.color.copy(world.converted > 0.5 ? COLORS.emerald : COLORS.blue);
      haloMat.current.opacity = 0.75 * (1 - world.finale);
    }

    const mesh = trail.current;
    if (mesh) {
      for (let k = 0; k < TRAIL; k++) {
        const fade = 1 - k / TRAIL;
        leadPosition(world.lead - (k + 1) * 0.011, tmp.p);
        tmp.p.sub(g.position);
        tmp.s.setScalar(0.11 * fade + 0.02);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        mesh.setMatrixAt(k, tmp.m);
        mesh.setColorAt(k, tmp.t.copy(tmp.c).multiplyScalar(1.8 * fade * fade));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    const status = Math.min(3, Math.floor(world.status + 0.001));
    if (status !== lastStatus.current) {
      lastStatus.current = status;
      chips.current.forEach((el, i) => el && (el.dataset.on = String(i === status)));
    }
    // After tracking, the card shrinks to its ID and status. It sits above the lead and
    // switches sides near the right edge; on phones it's centred above it.
    if (card.current) {
      const compact = String(world.cam > 1.45);
      const x = ((tmp.p.copy(g.position).project(camera).x + 1) / 2) * size.width;
      const cw = card.current.offsetWidth;
      const prev = layout.current.side;
      // First side that fits; the current side gets a little slack so it doesn't flicker.
      const fits = (s: string) => {
        const m = s === prev ? 0 : 16;
        if (s === 'right') return x + 22 + cw + 12 + m <= size.width;
        if (s === 'top') return x + cw / 2 + 12 + m <= size.width && x - cw / 2 - m >= 12;
        return true;
      };
      const side = size.width < 640 ? 'top' : ['right', 'top', 'left'].find(fits)!;
      if (compact !== layout.current.compact) card.current.dataset.compact = layout.current.compact = compact;
      if (side !== prev) card.current.dataset.side = layout.current.side = side;
    }

    const c = Math.round(world.card * 100) / 100;
    if (c !== lastCard.current && card.current) {
      lastCard.current = c;
      card.current.style.opacity = String(c);
      card.current.style.visibility = c < 0.01 ? 'hidden' : 'visible';
    }
  });

  return (
    <group ref={group}>
      <mesh material={coreMat}>
        <sphereGeometry args={[0.13, 32, 16]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.24, 32, 16]} />
        <meshPhysicalMaterial color="#e8f2ff" transparent opacity={0.22} roughness={0.05} clearcoat={1} envMapIntensity={1.6} />
      </mesh>
      <sprite scale={1.5}>
        <spriteMaterial ref={haloMat} map={halo} color={COLORS.blue} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <Html position={[0, 0, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={card} className="hud hud-lead" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="flex items-center gap-2">
            <span className="hud-dot" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.02em] text-fg">GL-48213</span>
            <span className="relative ml-auto inline-grid [&>*]:col-start-1 [&>*]:row-start-1">
              {STATUS.map((s, i) => (
                <span key={s.label} ref={(el) => { chips.current[i] = el; }} data-on={i === 0} className={`hud-chip hud-chip-${s.tone}`}>
                  {s.label}
                </span>
              ))}
            </span>
          </div>
          <div className="hud-lead-more">
            <div className="min-h-0 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-2 text-[10.5px]">
                <span className="text-slate-dim">Affiliate</span>
                <span className="text-right text-fg">#214</span>
                <span className="text-slate-dim">Offer</span>
                <span className="text-right text-fg">Finance · Tier 1</span>
                <span className="text-slate-dim">Country</span>
                <span className="text-right text-fg">Canada · CA</span>
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
