# Getlinked 3D website

A one-page marketing site for [Getlinked.io](https://getlinked.io/), built around a live 3D model of what the platform does:

- **Affiliates** (the posts on the left) send leads (cobalt dots) along their cables into the **Getlinked hub**.
- The hub's arm rotates to the **advertiser** that gets the next lead. Each advertiser tower is as tall as its daily cap. It fills up as leads land, turns grey when the cap is reached, and the rotation skips it until the next "day".
- Conversions send **payouts** (gold dots) back along the same cables to the affiliate who sent the lead.

Scrolling moves the camera through the lead's journey: click, route, convert, pay. Each step's copy describes the matching Getlinked features.

## Files

| File | What it is |
|---|---|
| `index.html` | Page structure and all copy |
| `styles.css` | Layout, type and colors |
| `main.js` | The Three.js scene, the lead simulation, scroll-driven camera, labels and tabs |
| `favicon.svg` | Placeholder mark |

There's no build step. Three.js (0.165.0) loads from jsDelivr through the import map in `index.html`, and the Archivo font comes from Google Fonts.

## Run it locally

Any static server works, for example:

```bash
cd getlinked-site
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly from disk won't work because browsers block ES modules on `file://`.

## Deploy

Upload the folder to any static host: Netlify, Vercel, Cloudflare Pages, GitHub Pages or S3.

## Before going live

- **Demo links.** Every "Book a demo" link has a `data-demo` attribute and points to `https://getlinked.io/`. Change the `href`s to your booking page or contact form.
- **Logo.** The two-link mark and the "getlinked" wordmark are placeholders. Swap the inline SVGs in the header and footer, and `favicon.svg`, for the official logo.
- **Copy.** The feature copy is based on Getlinked's public feature lists (tracking links, postbacks and pixels, parallel tracking, smart lead distribution, capping, budget management, flexible commissions, automated balances, billing, KYC, fraud detection, remarketing and more). Check that it matches the current product.
- **Colors.** The palette is defined once at the top of `styles.css` (`--paper`, `--ink`, `--cobalt`, `--gold`) and mirrored in `COLOR` at the top of `main.js`. Change both together.

## Behavior notes

- **Phones:** the model turns 90° so the flow runs up the screen, the camera has its own shots, and the step copy sits on cards.
- **Reduced motion:** with "reduce motion" turned on, the model shows a still frame of a busy day. The camera still follows scroll, but without easing.
- **No WebGL:** the canvas is hidden and the page reads as a normal text site.
- **Performance:** rendering pauses while the opaque Features and Teams sections fill the screen. Pixel ratio is capped and phones get fewer affiliates and smaller shadow maps.
