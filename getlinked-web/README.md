# GetLinked website (work in progress)

The new marketing website for GetLinked.io, built separately from the production site and CRM.

## What's built

The homepage opening and its scroll story, "follow one lead through GetLinked":

1. **Hero:** the headline and CTAs, with the GetLinked dashboard floating in 3D perspective and a live lead-routing card.
2. **Entering the system:** scrolling flattens the dashboard and dives into the product.
3. **Track:** a lead is created with its affiliate, offer, country, device, sub ID and click ID.
4. **Distribute:** a Bucket checks GEO, schedule, cap and budget for each advertiser in priority order. A is skipped (cap reached), B is skipped (no budget), and the lead is routed to C.
5. **Recycle:** four hours later there's no conversion, so Lead Recycling sends the lead to D.
6. **Convert:** D posts back an FTD and the lead converts.
7. **Get paid:** income, affiliate commission and profit are booked, and the invoice updates.
8. **Finale:** the camera pulls back to the dashboard with updated numbers, and a demo CTA.

The product screens are real React components rebuilt from the GetLinked dashboard, not images, so text stays sharp at every zoom level. **All figures are sample data.**

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- GSAP 3 with ScrollTrigger, MotionPath and DrawSVG (scroll-driven camera, the lead's path, counters)

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

A static copy with a "design preview" banner, usable from any sub-folder:

```bash
npm run export:preview   # writes ./out
```

## Where things live

| Path | What it is |
|---|---|
| `src/app/` | Layout, metadata, global styles and design tokens (`globals.css`), self-hosted fonts |
| `src/components/site/` | Navigation, logo, buttons, footer |
| `src/components/tour/SystemTour.tsx` | The pinned stage, camera framing and the GSAP timeline for every beat |
| `src/components/tour/tourData.ts` | All copy, sample data, layout coordinates and camera regions |
| `src/components/tour/app/` | The rebuilt GetLinked UI: app shell, dashboard, lead-journey view, charts, icons |

## Behaviour

- **Snapping:** the story snaps to each finished beat. The progress rail under the copy jumps to any step, and "Skip to the end" jumps to the finale.
- **Phones:** the product sits on top and the copy below, with tighter camera framing on the relevant panel.
- **Reduced motion:** with "reduce motion" on, the camera cuts between beats instead of flying, and the lead's path draws without the moving dot.
- **Crisp text:** the camera gets `will-change` only while scrolling, so the UI re-renders sharp when it comes to rest.

## Before launch

- **Demo links:** "Book a Demo" links point to `https://getlinked.io/` until the demo form section exists (`DEMO_URL` in `SystemTour.tsx`, plus the navbar).
- **Nav links:** Solutions, Finance, iGaming and Resources point to sections that aren't built yet.
- **Logo:** `src/components/site/getlinked-logo.svg` and the "g" tab icon (`src/app/icon.svg`) are traced from a JPG of the logo. Replace them with the original vector files when available for perfectly clean edges.
- **Lead Recycling:** check the recycling rule wording (trigger, skip rule, cycle limit) against how the product works.
