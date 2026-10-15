let cached: boolean | null = null;

/** True when the browser can create a WebGL2 or WebGL context. */
export function canUseWebGL() {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}
