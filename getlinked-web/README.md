# GetLinked website (work in progress)

The new marketing website for GetLinked.io, built separately from the production site and CRM.

## What's on the page

1. **Hero:** the headline and both CTAs on the brand blue from the logo, with the GetLinked dashboard (rebuilt in code) resting on top of it. The dashboard appears only here.
2. **Why GetLinked:** 300+ networks, 200+ features and real-time tracking in large numbers, then three reasons to choose GetLinked.
3. **Platform:** "Everything You Need to Run Your Affiliate Network." A wall of twelve features with icons (routing, recycling, injection, caps and budgets, schedules, postbacks, partners, payouts, invoices, analytics, permissions, lead quality), and a line pointing to the 200+ in total.
4. **Solutions:** "One platform. Three ways to grow." Three cards on the deep brand blue (CR Boost, Partner Platform, Lead Distribution), each with its own illustration and three features.
5. **GetLinked Bot:** what the bot does (analyzes performance and suggests improvements, sends reports to Telegram, lets you control GetLinked from the chat), next to a sample Telegram conversation on a phone.
6. **Industries:** Finance and iGaming.
7. **Questions:** a short FAQ.
8. **Closing CTA and footer.**

The dashboard is a React component styled like the real app, not an image, so text stays sharp. **Its figures are sample data.**

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
| `src/components/home/` | The page sections: hero, why GetLinked, platform, solutions (pillars), GetLinked Bot, industries, FAQ, closing CTA |
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
- **GetLinked Bot:** the chat on the phone is a sample. Check the report contents and the `/cap` command against what the bot really supports.
- **Product details:** check the feature wording (Lead Recycling rules, payout models, integrations, lead quality checks) against how the product works today.
