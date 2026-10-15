import * as THREE from 'three';

/**
 * Everything the 3D world shows is a function of this object. The GSAP timeline tweens
 * these numbers as the visitor scrolls; the scene reads them every frame. Kept outside
 * React on purpose: it changes every frame and must not cause re-renders.
 */
export const world = {
  /** Camera position along the camera path, 0..CAMERA_KEYS.length - 1. */
  cam: 0,
  /** Lead position: integer part is the path segment, fraction is progress along it (0..4). */
  lead: 0,
  /** 0..1 how many of the lead's attributes the scanner has revealed. */
  scan: 0,
  /** Checks lit per gate (0..4), and how far each gate's result is revealed (0..1). */
  checks: [0, 0, 0, 0],
  results: [0, 0, 0, 0],
  /** Time jump during recycling, 0..1..0. */
  warp: 0,
  /** Advertiser C going quiet after four hours without a conversion. */
  quiet: 0,
  /** Lead Recycling track drawn, 0..1. */
  recycle: 0,
  /** Postback pulse travelling from advertiser D to the GetLinked core, 0..1. */
  postback: 0,
  /** The lead turning into a conversion, 0..1. */
  converted: 0,
  /** Revenue streams, 0..1. */
  money: 0,
  /** Overview with many leads flowing, 0..1. */
  finale: 0,
  /** Lead status shown on its card: 0 New, 1 Routed, 2 Recycled, 3 Converted. */
  status: 0,
  /** HUD visibility for the lead's own card, 0..1. */
  card: 0,
};

export type World = typeof world;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const FLY = 1.4;
export const PORTAL = v(0, FLY, 0);
export const SCANNER = v(0, FLY, -10);
export const HUB = v(0, 0, -22);
export const GATE_Z = -28.5;
export const NODE_Z = -35;
export const LANES = [-4.8, -1.6, 1.6, 4.8];
export const GATE_W = 2;
export const GATE_H = 2.6;

export const ADVERTISERS = [
  { key: 'A', check: 3, pass: false, note: 'Cap reached · 50/50' },
  { key: 'B', check: 4, pass: false, note: 'Budget unavailable' },
  { key: 'C', check: 4, pass: true, note: 'Eligible · routed' },
  { key: 'D', check: 4, pass: true, note: 'Eligible · recycled' },
] as const;

export const CHECK_NAMES = ['GEO', 'Schedule', 'Cap', 'Budget'];

const curve = (...pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

/** The lead's journey, one curve per beat. */
export const LEAD_SEGMENTS = [
  // 0. From the dashboard through the portal and the tracking scanner.
  curve(v(0, FLY, 3), v(0, FLY, 0), v(0, FLY, -5), v(0, FLY, -10), v(0, FLY, -14)),
  // 1. Into the bucket, stopping above its core.
  curve(v(0, FLY, -14), v(0, FLY, -18), v(0, FLY, -22)),
  // 2. Through gate C to advertiser C.
  curve(v(0, FLY, -22), v(0.9, FLY, -25.5), v(LANES[2], 1.3, GATE_Z), v(LANES[2], 1.4, -32), v(LANES[2], 1.9, NODE_Z)),
  // 3. Lead Recycling: back over the gates to the bucket, then through gate D to advertiser D.
  curve(
    v(LANES[2], 1.9, NODE_Z),
    v(LANES[2] + 0.2, 4.2, -32.5),
    v(3.1, 4.8, -27),
    v(4.6, 3, -24),
    v(LANES[3], 1.6, -26.3),
    v(LANES[3], 1.3, GATE_Z),
    v(LANES[3], 1.4, -32),
    v(LANES[3], 1.9, NODE_Z),
  ),
];

/** Routes from the bucket core to each gate and on to each advertiser. */
export const LANE_PATHS = LANES.map((x) =>
  curve(v(0, 0.02, -22), v(x * 0.55, 0.02, -25.5), v(x, 0.02, GATE_Z), v(x, 0.02, NODE_Z)),
);

/** The postback pulse from advertiser D back to the GetLinked core. */
export const POSTBACK_PATH = curve(v(LANES[3], 2.6, NODE_Z), v(4.2, 5.2, -30), v(1.6, 5, -24.5), v(0, 3.1, -22));

/** Revenue: income arrives from D, commission flows back to the affiliate side. */
export const INCOME_PATH = curve(v(LANES[3], 1.9, NODE_Z), v(3.4, 2.6, -30), v(0.6, 2.4, -23.5), v(0, 2.2, -22));
export const COMMISSION_PATH = curve(v(0, 2.2, -22), v(1.5, 2.6, -18), v(1.9, 2.4, -13), v(0.4, FLY, -8));

/** Camera stops, one per beat: [position, look-at]. */
export const CAMERA_KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [v(0, 1.75, 6.5), v(0, FLY, -3)], // 0 entering through the portal
  [v(6.8, 3.4, -2.6), v(0.2, FLY, -11)], // 1 tracking scanner
  [v(-0.5, 10.5, -7.5), v(-0.5, 0.8, -29)], // 2 bucket and gates
  [v(13, 9, -18), v(3.2, 2, -31)], // 3 recycling loop
  [v(7.5, 9, -12), v(2, 1.6, -29.5)], // 4 postback and conversion
  [v(2.2, 7.2, -5), v(0.6, 2, -23)], // 5 revenue at the core
  [v(15, 21, 3), v(0, 0, -20)], // 6 the whole network
];

export const CAMERA_POS = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => k[0]), false, 'centripetal');
export const CAMERA_LOOK = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => k[1]), false, 'centripetal');

/** Position of the lead for a given `world.lead` value. */
export function leadPosition(value: number, out: THREE.Vector3) {
  const clamped = THREE.MathUtils.clamp(value, 0, LEAD_SEGMENTS.length);
  const seg = Math.min(Math.floor(clamped), LEAD_SEGMENTS.length - 1);
  const t = clamped - seg;
  return LEAD_SEGMENTS[seg].getPointAt(Math.min(1, t), out);
}

export const COLORS = {
  ink: new THREE.Color('#050b16'),
  blue: new THREE.Color('#3977e8'),
  sky: new THREE.Color('#8fc0ff'),
  emerald: new THREE.Color('#19be8f'),
  mint: new THREE.Color('#7ff0cb'),
  amber: new THREE.Color('#f5b44a'),
  violet: new THREE.Color('#8b7bff'),
  slate: new THREE.Color('#9dafc3'),
};
