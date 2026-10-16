# GetLinked website (work in progress)

The new marketing website for GetLinked.io, built separately from the production site and CRM.

## What's on the page

1. **Hero:** the headline and both CTAs on the brand blue from the logo, with the GetLinked dashboard (rebuilt in code) resting on top of it. The dashboard appears only here.
2. **Why GetLinked:** 300+ networks, 200+ features and real-time tracking in large numbers, then three reasons to choose GetLinked.
3. **Platform:** "Everything You Need to Run Your Affiliate Network." Four cards (Smart Lead Distribution, Automated Lead Recycling, High-Speed Lead Processing, Real-Time Tracking & Analytics), then postbacks, partner management, finance and monitoring. Every card shows a GetLinked screen instead of an icon.
4. **Solutions:** Finance and iGaming.
5. **Questions:** a short FAQ.
6. **Closing CTA and footer.**

The product screens are React components styled like the real app, not images, so text stays sharp. **All figures are sample data.**

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- GSAP 3 (the hero's entrance)

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
| `src/components/home/` | The page sections: hero, why GetLinked, platform, solutions, FAQ, closing CTA |
| `src/components/home/screens.tsx` | The small product screens used in the platform sections |
| `src/components/product/` | The rebuilt GetLinked app: shell, dashboard, charts, icons |

## Behaviour

- **Colours:** the brand blue from the logo for the hero and closing CTA, light pages like the product itself, and green only for money and positive results. Tokens are in `globals.css`.
- **Motion:** only the hero fades in once. Nothing else animates.
- **Phones:** the dashboard bleeds off the right edge so it stays readable.
- **Reduced motion:** the hero appears without the fade.

## Before launch

- **Demo link:** every "Book a Demo" button points to `https://getlinked.io/`. Set the real booking page in `src/components/site/links.ts`.
- **Logo:** `src/components/site/getlinked-logo.svg` and the "g" tab icon (`src/app/icon.svg`) are traced from a JPG of the logo. Replace them with the original vector files when available for perfectly clean edges.
- **Numbers:** 300+ networks and 200+ features come from GetLinked. Confirm them before launch.
- **Product details:** check the feature wording (Lead Recycling rules, payout models, integrations, lead quality checks) against how the product works today.
