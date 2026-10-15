/**
 * Shared, mutable state between the DOM (GSAP, pointer events) and the 3D scene.
 * Kept outside React on purpose: it changes every frame and must not trigger renders.
 */
export const heroState = {
  /** 0 at the top of the page, 1 when the hero has scrolled out of view. */
  progress: 0,
  /** Pointer position in normalized device coordinates, -1..1. */
  pointer: { x: 0, y: 0 },
  /** 0 → 1 while the engine powers on after load. */
  intro: 0,
};
