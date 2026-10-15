import * as THREE from 'three';

const passthrough = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A light rail. Pulses travel from t=0 to t=1 with a sharp head and a soft tail.
 * `uDraw` reveals the rail from its start, so a route can be drawn in as the lead takes it.
 */
export function railMaterial(color: THREE.Color, opts: { speed?: number; density?: number; base?: number; draw?: number } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color.clone() },
      uSpeed: { value: opts.speed ?? 0.12 },
      uDensity: { value: opts.density ?? 3 },
      uBase: { value: opts.base ?? 0.18 },
      uDraw: { value: opts.draw ?? 1 },
      uGain: { value: 1 },
    },
    vertexShader: passthrough,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSpeed, uDensity, uBase, uDraw, uGain;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float t = vUv.x;
        float s = 1.0 - fract(t * uDensity - uTime * uSpeed);
        float pulse = smoothstep(0.0, 0.01, s) * exp(-s * 8.0);
        float drawn = 1.0 - smoothstep(uDraw - 0.02, uDraw, t);
        float energy = (uBase + pulse * 1.6) * drawn * uGain;
        gl_FragColor = vec4(uColor * energy * 2.2, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** An endless floor grid that fades into the dark. */
export function gridMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#2b5cb8') },
      uCenter: { value: new THREE.Vector2(0, -20) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec2 uCenter;
      varying vec3 vWorld;
      float line(float c, float w) {
        float d = abs(fract(c - 0.5) - 0.5) / fwidth(c);
        return 1.0 - min(d / w, 1.0);
      }
      void main() {
        vec2 p = vWorld.xz;
        float minor = max(line(p.x, 1.0), line(p.y, 1.0)) * 0.35;
        float major = max(line(p.x / 4.0, 1.2), line(p.y / 4.0, 1.2)) * 0.8;
        float fade = 1.0 - smoothstep(10.0, 46.0, length(p - uCenter));
        float a = max(minor, major) * fade * 0.5;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** The bucket's floor: concentric rings that pulse outwards from the core. */
export function hubMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#3977e8') },
      uAccent: { value: new THREE.Color('#19be8f') },
      uFlash: { value: 0 },
    },
    vertexShader: passthrough,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlash;
      uniform vec3 uColor, uAccent;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float rings = smoothstep(0.92, 1.0, abs(sin(r * 26.0 - uTime * 1.6)));
        float rim = smoothstep(0.94, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
        float core = exp(-r * 9.0);
        float a = (rings * 0.12 + rim * 0.9 + core * 0.6) * (1.0 - smoothstep(0.98, 1.0, r));
        vec3 col = mix(uColor, uAccent, uFlash) * a * (1.0 + uFlash * 1.5);
        gl_FragColor = vec4(col * 1.6, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** An energy barrier inside a gate: scanlines that tint amber when the gate closes. */
export function barrierMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#3977e8') },
      uStrength: { value: 0.15 },
    },
    vertexShader: passthrough,
    fragmentShader: /* glsl */ `
      uniform float uTime, uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float lines = smoothstep(0.55, 1.0, sin((vUv.y * 60.0) - uTime * 4.0) * 0.5 + 0.5);
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(0.0, 0.05, 1.0 - vUv.y);
        float glow = (0.25 + lines * 0.55) * edge * uStrength;
        gl_FragColor = vec4(uColor * glow * 2.0, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Distant drifting dust that gives the void depth. */
export function dustMaterial(pixelRatio: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uWarp: { value: 0 },
      uColor: { value: new THREE.Color('#8fb3d9') },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPixelRatio, uWarp;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.z = mod(p.z + uTime * (0.3 + aSeed * 0.4) + uWarp * 60.0 * aSeed + 80.0, 90.0) - 80.0;
        p.y += sin(uTime * 0.2 + aSeed * 31.0) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.0, 3.0, fract(aSeed * 7.31)) * (1.0 + uWarp * 2.5);
        gl_PointSize = size * uPixelRatio * (22.0 / -mv.z);
        float twinkle = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed) + aSeed * 47.0);
        vAlpha = twinkle * smoothstep(-70.0, -4.0, mv.z) * (0.35 + uWarp * 0.6);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor * a * a * vAlpha, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Soft round sprite for halos. */
export function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A closed rounded-rectangle path in the XY plane, for gate frames and the portal. */
export class RoundedRectCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly w: number,
    private readonly h: number,
    private readonly r: number,
  ) {
    super();
  }

  override getPoint(t: number, out = new THREE.Vector3()) {
    const { w, h, r } = this;
    const sw = w - 2 * r;
    const sh = h - 2 * r;
    const arc = (Math.PI / 2) * r;
    const total = 2 * sw + 2 * sh + 4 * arc;
    let d = (((t % 1) + 1) % 1) * total;
    const hw = w / 2;
    const hh = h / 2;
    if (d < sw) return out.set(-hw + r + d, hh, 0);
    d -= sw;
    if (d < arc) {
      const a = Math.PI / 2 - d / r;
      return out.set(hw - r + Math.cos(a) * r, hh - r + Math.sin(a) * r, 0);
    }
    d -= arc;
    if (d < sh) return out.set(hw, hh - r - d, 0);
    d -= sh;
    if (d < arc) {
      const a = -d / r;
      return out.set(hw - r + Math.cos(a) * r, -hh + r + Math.sin(a) * r, 0);
    }
    d -= arc;
    if (d < sw) return out.set(hw - r - d, -hh, 0);
    d -= sw;
    if (d < arc) {
      const a = -Math.PI / 2 - d / r;
      return out.set(-hw + r + Math.cos(a) * r, -hh + r + Math.sin(a) * r, 0);
    }
    d -= arc;
    if (d < sh) return out.set(-hw, -hh + r + d, 0);
    d -= sh;
    const a = Math.PI - d / r;
    return out.set(-hw + r + Math.cos(a) * r, hh - r + Math.sin(a) * r, 0);
  }
}
