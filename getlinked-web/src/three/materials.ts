import * as THREE from 'three';

/** Brand colours in the renderer's linear working space. */
export const BRAND = {
  ink: new THREE.Color('#08111f'),
  inkRaised: new THREE.Color('#101c2d'),
  emerald: new THREE.Color('#19be8f'),
  blue: new THREE.Color('#3977e8'),
  slate: new THREE.Color('#9dafc3'),
};

const passthroughVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A luminous data stream. Brightness pulses travel from t=0 towards t=1, with a
 * sharp leading edge and a soft tail. Additive, so it reads as light, not geometry.
 */
export function createStreamMaterial(opts: {
  from: THREE.Color;
  to: THREE.Color;
  speed: number;
  offset: number;
  density: number;
  /** How far along the stream it fades in from nothing, 0..1. */
  fadeIn: number;
  strength?: number;
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uFrom: { value: opts.from },
      uTo: { value: opts.to },
      uSpeed: { value: opts.speed },
      uOffset: { value: opts.offset },
      uDensity: { value: opts.density },
      uFadeIn: { value: opts.fadeIn },
      uStrength: { value: opts.strength ?? 1 },
    },
    vertexShader: passthroughVertex,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntro, uSpeed, uOffset, uDensity, uFadeIn, uStrength;
      uniform vec3 uFrom, uTo;
      varying vec2 vUv;

      void main() {
        float t = vUv.x;
        float s = 1.0 - fract(t * uDensity - uTime * uSpeed + uOffset);
        float pulse = smoothstep(0.0, 0.012, s) * exp(-s * 7.0);
        float fade = smoothstep(0.0, uFadeIn, t);
        float reveal = 1.0 - smoothstep(uIntro * 1.35 - 0.2, uIntro * 1.35, t);
        float energy = (0.075 + pulse * 1.35) * fade * reveal * uStrength;
        vec3 color = mix(uFrom, uTo, smoothstep(0.15, 1.0, t));
        gl_FragColor = vec4(color * energy * 2.4, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/**
 * The light filament that runs inside each glass link. Opaque on purpose, so the
 * glass refracts it.
 */
export function createFilamentMaterial(phase: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uPulse: { value: 0 },
      uPhase: { value: phase },
      uEmerald: { value: BRAND.emerald },
      uBlue: { value: BRAND.blue },
    },
    vertexShader: passthroughVertex,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntro, uPulse, uPhase;
      uniform vec3 uEmerald, uBlue;
      varying vec2 vUv;

      float runner(float t, float shift) {
        float s = 1.0 - fract(t * 2.0 - uTime * 0.16 + uPhase + shift);
        return smoothstep(0.0, 0.01, s) * exp(-s * 10.0);
      }

      void main() {
        float t = vUv.x;
        vec3 tint = mix(uEmerald, uBlue, 0.5 + 0.5 * sin((t + uPhase) * 6.2831853));
        float glow = 0.22 + runner(t, 0.0) * 3.2 + runner(t, 0.37) * 1.6 + uPulse * 1.4;
        gl_FragColor = vec4(tint * glow * uIntro, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  });
}

/** The engine's nucleus: a bright core with a cool fresnel rim. */
export function createNucleusMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIntro: { value: 0 },
      uPulse: { value: 0 },
      uEmerald: { value: BRAND.emerald },
      uBlue: { value: BRAND.blue },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntro, uPulse;
      uniform vec3 uEmerald, uBlue;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
        float rim = pow(1.0 - facing, 2.2);
        vec3 heart = mix(uEmerald, vec3(1.0), 0.45 + 0.3 * uPulse);
        vec3 color = heart * (1.6 + uPulse * 2.6) * facing + uBlue * rim * 2.2;
        gl_FragColor = vec4(color * uIntro, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  });
}

/** Distant drifting dust that gives the scene depth. */
export function createDustMaterial(pixelRatio: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new THREE.Color('#8fb3d9') },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPixelRatio, uIntro;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x = mod(p.x + uTime * (0.04 + aSeed * 0.07) + 26.0, 52.0) - 26.0;
        p.y += sin(uTime * 0.18 + aSeed * 31.0) * 0.18;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.0, 2.8, fract(aSeed * 7.31));
        gl_PointSize = size * uPixelRatio * (34.0 / -mv.z);
        float twinkle = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed) + aSeed * 47.0);
        float near = smoothstep(-58.0, -16.0, mv.z);
        vAlpha = twinkle * (0.18 + 0.55 * near) * uIntro;
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

/** Deep navy backdrop with a soft blue glow behind the core and a hint of emerald below it. */
export function createBackdropMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uInk: { value: BRAND.ink },
      uBlue: { value: new THREE.Color('#123566') },
      uEmerald: { value: new THREE.Color('#0d4a3c') },
      uFocus: { value: new THREE.Vector2(0.56, 0.52) },
    },
    vertexShader: passthroughVertex,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk, uBlue, uEmerald;
      uniform vec2 uFocus;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - uFocus) * vec2(1.7, 2.6);
        float glow = exp(-dot(p, p) * 3.2);
        vec2 q = (vUv - uFocus - vec2(0.12, -0.16)) * vec2(2.2, 3.2);
        float low = exp(-dot(q, q) * 4.0);
        vec3 color = uInk + uBlue * glow * 0.55 + uEmerald * low * 0.32;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    depthWrite: false,
  });
}

/** Soft round sprite used for halos. */
export function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
