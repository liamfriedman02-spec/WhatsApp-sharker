# GetLinked website (work in progress)

The new marketing website for GetLinked.io, built separately from the production site and CRM.
Only the hero section exists so far.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- React Three Fiber + Three.js + Drei, with `@react-three/postprocessing` for bloom
- GSAP + ScrollTrigger for the intro and scroll-driven camera

All versions are pinned exactly in `package.json`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Checks:

```bash
npm run typecheck
npm run lint
npm run build && npm start
```

## Where things live

| Path | What it is |
|---|---|
| `src/app/` | Layout, metadata, global styles and design tokens (`globals.css`), self-hosted fonts |
| `src/components/site/` | Navigation, logo, buttons |
| `src/components/sections/` | Page sections (`Hero.tsx`) and the hero's 3D wrapper |
| `src/three/` | The WebGL scene, kept separate from marketing content |
| `src/lib/` | Shared hero state, reduced-motion hook, WebGL check |

## Behaviour

- **Loading:** the 3D scene loads on the client after the page is interactive. Without WebGL, the hero shows a static gradient and the page works normally.
- **Phones and touch devices:** they get a lighter scene, with no glass transmission and no post-processing.
- **Reduced motion:** with "reduce motion" on, the scene renders a still frame and the intro and scroll animations are skipped.
- **Shared previews:** set `NEXT_PUBLIC_CONCEPT_BANNER=1` to show a "design preview" banner.
