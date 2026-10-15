# GetLinked website (work in progress)

The new marketing website for GetLinked.io, built separately from the production site and CRM.

## What's on the page

1. **Hero:** the headline, both CTAs and the GetLinked dashboard, rebuilt in code. The dashboard appears only here.
2. **How it works:** one lead's trip through GetLinked, playing on a loop. It's tracked and validated, matched to a bucket, skipped by A (cap reached) and B (no budget), routed to C, recycled to D after four hours without a conversion, and converts as an FTD with commission and profit worked out. The lead's event log fills in alongside the diagram.
3. **Platform:** in-depth sections for Tracking, Lead distribution, Lead Recycling, and Postbacks and integrations, then Reports, Affiliates and payouts, Finance and invoices, and Lead quality and monitoring. Each one has its own product screen.
4. **Solutions:** Finance and iGaming.
5. **Questions:** a short FAQ.
6. **Closing CTA and footer.**

The product screens are React components styled like the real app, not images, so text stays sharp. **All figures are sample data.**

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- GSAP 3 with ScrollTrigger and MotionPath (hero entrance, dashboard tilt, the lead animation)

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
| `src/components/site/` | Navigation, logo, buttons, footer, and `links.ts` (the demo link) |
| `src/components/home/` | The page sections: hero, lead journey, platform, solutions, FAQ, closing CTA |
| `src/components/home/screens.tsx` | The small product screens used in the platform sections |
| `src/components/product/` | The rebuilt GetLinked app: shell, dashboard, charts, icons |

## Behaviour

- **Motion:** the hero fades in once and the dashboard settles flat as you scroll. The lead animation plays only while it's on screen and has a pause button.
- **Phones:** the lead diagram switches to a vertical layout, and the dashboard bleeds off the right edge so it stays readable.
- **Reduced motion:** nothing moves. The lead diagram and its log show the finished journey.

## Before launch

- **Demo link:** every "Book a Demo" button points to `https://getlinked.io/`. Set the real booking page in `src/components/site/links.ts`.
- **Logo:** `src/components/site/getlinked-logo.svg` and the "g" tab icon (`src/app/icon.svg`) are traced from a JPG of the logo. Replace them with the original vector files when available for perfectly clean edges.
- **Product details:** check the feature wording (Lead Recycling rules, payout models, integrations, lead quality checks) against how the product works today.
