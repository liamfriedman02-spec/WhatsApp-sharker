import * as THREE from 'three';

/** Small seeded random so the network looks the same on every visit. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A closed stadium path (two half circles joined by straight runs) in the XY plane.
 * It's the shape of one link in the GetLinked mark.
 */
export class StadiumCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly radius = 0.62,
    private readonly halfStraight = 0.55,
  ) {
    super();
  }

  override getPoint(t: number, target = new THREE.Vector3()) {
    const r = this.radius;
    const h = this.halfStraight;
    const straight = 2 * h;
    const arc = Math.PI * r;
    let d = (((t % 1) + 1) % 1) * (2 * straight + 2 * arc);

    if (d < straight) return target.set(-h + d, r, 0);
    d -= straight;
    if (d < arc) {
      const a = Math.PI / 2 - d / r;
      return target.set(h + r * Math.cos(a), r * Math.sin(a), 0);
    }
    d -= arc;
    if (d < straight) return target.set(h - d, -r, 0);
    d -= straight;
    const a = -Math.PI / 2 - d / r;
    return target.set(-h + r * Math.cos(a), r * Math.sin(a), 0);
  }
}

/** Link geometry constants, shared by the core and the network so they line up. */
export const LINK = {
  radius: 0.62,
  halfStraight: 0.55,
  /** Distance of each link's centre from the core's centre along X. */
  offset: 0.55,
  tube: 0.105,
};

/** Where traffic enters the core and where routed leads leave it, in world space. */
export const INLET = new THREE.Vector3(-2.15, 0, 0);
export const CORE_CENTER = new THREE.Vector3(0, 0, 0);
export const OUTLET = new THREE.Vector3(2.15, 0, 0);

/** Advertiser destinations, placed in depth so they frame the core without crowding it. */
export const DESTINATIONS = [
  new THREE.Vector3(3.55, 1.72, -2.3),
  new THREE.Vector3(4.25, -0.08, -3.3),
  new THREE.Vector3(3.3, -1.78, -1.4),
];

export const DESTINATION_SIZE = 0.62;

/** Traffic streams flowing in from far off the left edge and converging on the inlet. */
export function createIncomingCurves(count: number, seed = 7) {
  const rand = seeded(seed);
  const curves: THREE.CubicBezierCurve3[] = [];
  for (let i = 0; i < count; i++) {
    const f = count === 1 ? 0.5 : i / (count - 1);
    const start = new THREE.Vector3(
      -13.5 - rand() * 3.5,
      (f - 0.5) * 8.2 + (rand() - 0.5) * 0.9,
      -7.5 + rand() * 8.5,
    );
    const c1 = new THREE.Vector3(start.x * 0.5, start.y * 0.82, start.z * 0.5);
    const c2 = new THREE.Vector3(INLET.x - 2.8, start.y * 0.1, start.z * 0.06);
    curves.push(new THREE.CubicBezierCurve3(start, c1, c2, INLET.clone()));
  }
  return curves;
}

/** Routed-lead paths from the outlet to each advertiser's face. */
export function createOutgoingCurves() {
  return DESTINATIONS.map((d) => {
    const end = d.clone().add(new THREE.Vector3(-DESTINATION_SIZE * 0.62, 0, 0));
    return new THREE.CubicBezierCurve3(
      OUTLET.clone(),
      OUTLET.clone().add(new THREE.Vector3(1.25, 0, 0)),
      end.clone().add(new THREE.Vector3(-1.35, 0, 0.35)),
      end,
    );
  });
}
