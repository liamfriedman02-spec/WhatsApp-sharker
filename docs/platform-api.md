# Sharker platform ↔ bot contract

What the bot needs from the Sharker platform, in priority order:

| Phase | What | Sections |
|---|---|---|
| 1. Go live with real Bosses | Boss read API, signed events webhook, a staging environment with a test key and sample Bosses | 1, 2 |
| 2. Player-level data | Each Boss's players (nickname, joined, last active, status, source, do-not-contact), player events, daily stats history | 4, 5, 6 |
| 3. Smart marketing | One tracked link per channel, AI Agent post stats, platform benchmarks | 7, 8, 9 |

Until phase 1 exists, the bot runs on built-in demo Bosses (`SHARKER_API_BASE_URL` empty). Privacy rules for
player data are in section 10.

## 1. Read API

Base URL: `SHARKER_API_BASE_URL`. Auth: `Authorization: Bearer <SHARKER_API_KEY>`.

| Method | Path | Returns |
|---|---|---|
| GET | `/bosses/by-phone/{phone}` | `BossProfile` or 404 |
| GET | `/bosses/{bossId}` | `BossProfile` or 404 |
| GET | `/bosses?cursor={cursor}` | `{ "data": BossProfile[], "nextCursor": string \| null }` |

`phone` is the WhatsApp id: E.164 digits without `+` (e.g. `5511999998888`).
The list endpoint can return only Bosses with `whatsappOptIn: true`; the bot also checks the flag.

### `BossProfile`

```json
{
  "id": "boss_123",
  "phone": "5511999998888",
  "firstName": "Carla",
  "brandName": "Carla Kingdom",
  "brandUrl": "https://carlakingdom.example/join",
  "timezone": "America/Sao_Paulo",
  "whatsappOptIn": true,
  "brandLaunchedAt": "2026-07-30T14:00:00Z",
  "lastActiveAt": "2026-09-28T09:12:00Z",
  "stats": {
    "totalPlayers": 248,
    "newPlayersToday": 4,
    "newPlayers7d": 31,
    "activePlayers7d": 120,
    "earningsTotal": 4820.75,
    "earningsToday": 96.4,
    "earnings7d": 612.3,
    "currency": "USD",
    "gcoinBalance": 58400
  },
  "aiAgent": {
    "activated": true,
    "activatedAt": "2026-08-19T10:00:00Z",
    "connectedSocials": ["instagram", "tiktok"],
    "postsPublishedTotal": 86,
    "postsPublished7d": 14,
    "lastPostAt": "2026-09-28T05:00:00Z",
    "lastPostNetwork": "instagram"
  },
  "payouts": { "methodConfigured": true }
}
```

| Field | Why the bot needs it |
|---|---|
| `brandUrl` (optional) | Put into the ready-to-post texts the coach writes. |
| `whatsappOptIn` | WhatsApp policy: proactive messages only to Bosses who agreed (collect it in Boss Hub onboarding). |
| `brandLaunchedAt` | Welcome message, "no players after launch", journey stage. |
| `lastActiveAt` | Last Boss Hub session → inactive-Boss reminders. |
| `stats.*` | Personalized answers, milestones, summaries and coaching. "Today" and "7d" are in the Boss's timezone. The bot stores a daily snapshot of these to compute week-over-week trends, levels and goal progress. |
| `aiAgent.activated` + `connectedSocials` | **AI Agent stage**: `not_activated` → `needs_socials` → `live`. Drives every Agent message and CTA. |
| `aiAgent.posts*` / `lastPost*` | "Your AI Agent just published its first post", activity in summaries. |
| `payouts.methodConfigured` | Pushes payout setup after first earnings. |

## 2. Events webhook

`POST {bot}/webhooks/sharker` with header `X-Sharker-Signature: sha256=<hex HMAC-SHA256 of the raw body using SHARKER_WEBHOOK_SECRET>`.

Body: one event, or `{ "events": [ ... ] }` (max 500).

```json
{ "id": "evt_9f1", "type": "player.joined", "bossId": "boss_123", "occurredAt": "2026-09-28T12:00:00Z", "data": { "totalPlayers": 1 } }
```

Types: `brand.launched`, `player.joined`, `earnings.generated`, `ai_agent.activated`, `ai_agent.social_connected`,
`ai_agent.social_disconnected`, `ai_agent.post_published`, `boss.updated`. Phase 2 adds the player events in section 5.

The bot answers `202`, de-duplicates by `id`, re-reads the Boss from the Read API, and runs the retention
rules for that Boss right away. Events are an accelerator, not a requirement: every rule is also evaluated by
the hourly sweep, so a lost event only delays a message.

## 3. Boss Hub deep links

CTA buttons open `BOSS_HUB_URL/<path>?utm_source=whatsapp&utm_medium=boss_bot&utm_campaign=<message>`.
The paths are placeholders in `src/content/links.ts` — align them with the real Boss Hub routes. The UTM
parameters let the Hub measure which WhatsApp messages drive activations.

## 4. Players of a Boss (phase 2)

| Method | Path | Returns |
|---|---|---|
| GET | `/bosses/{bossId}/players?status=new\|active\|inactive\|dormant&cursor={cursor}` | `{ "data": Player[], "nextCursor": string \| null }` |

```json
{
  "id": "pl_8f2a",
  "displayName": "Yossi",
  "joinedAt": "2026-10-05T18:20:00Z",
  "lastActiveAt": "2026-10-06T09:12:00Z",
  "activeDays7d": 2,
  "status": "new",
  "source": { "channel": "instagram", "linkId": "lnk_ig_01" },
  "doNotContact": false
}
```

| Field | Why the bot needs it |
|---|---|
| `id` | Stable, pseudonymous id (never a phone number or email). |
| `displayName` | The nickname the player has on the platform, so the coach can say "Yossi just joined". |
| `joinedAt` | Welcome a new player on their first day. |
| `lastActiveAt`, `activeDays7d` | Who's a regular, who's drifting away. |
| `status` | `new` joined in the last 7 days · `active` played in the last 7 days · `inactive` no play for 7 to 29 days · `dormant` 30+ days. |
| `source.channel`, `source.linkId` | `instagram`, `tiktok`, `whatsapp`, `telegram`, `facebook`, `direct`: which channel (and which tracked link, section 7) actually brings players. |
| `doNotContact` | **Required.** `true` for self-excluded or limited players, minors, and players who asked not to be contacted. The bot never suggests contacting them. |

## 5. Player and payout events (phase 2)

Same webhook and signature as section 2. `data` carries `playerId` (and `displayName` on `player.joined`).

| Type | When | What the bot does |
|---|---|---|
| `player.joined` | A player joined the Boss's brand | "Yossi just joined, here's a welcome to send him" |
| `player.first_play` | The player's first game | Tells the Boss the player is now active |
| `player.became_inactive` | 7 days without playing | Offers the Boss a personal comeback message |
| `player.returned` | Played again after a break | Celebrates with the Boss |
| `player.do_not_contact` | Self-exclusion, limit or request | Stops any suggestion to contact the player |
| `player.deleted`, `boss.deleted` | Data deletion | Deletes what the bot stored |
| `payout.available`, `payout.sent` | Money ready to withdraw / withdrawn | "You have money to collect" / celebrates the first payout |

## 6. Daily stats history (phase 2)

| Method | Path | Returns |
|---|---|---|
| GET | `/bosses/{bossId}/stats/daily?from=YYYY-MM-DD&to=YYYY-MM-DD` | `[{ "date", "newPlayers", "activePlayers", "earnings" }]`, up to 90 days, Boss timezone |

Gives the coach week-over-week trends from day one instead of after a week of its own snapshots.

## 7. Tracked links per channel (phase 3)

| Method | Path | Returns |
|---|---|---|
| GET | `/bosses/{bossId}/links` | `[{ "linkId", "channel", "url" }]`, one link per channel (Instagram, TikTok, status, groups, Telegram) |

Each player's `source.linkId` points to the link they joined through, so the coach can say which channel works.

## 8. AI Agent posts (phase 3)

| Method | Path | Returns |
|---|---|---|
| GET | `/bosses/{bossId}/agent/posts?since=YYYY-MM-DD` | `[{ "id", "network", "url", "publishedAt", "clicks", "joins" }]` (`clicks`/`joins` when known) |

## 9. Platform benchmarks (phase 3)

| Method | Path | Returns |
|---|---|---|
| GET | `/benchmarks?currency=USD` | `{ "weeklyEarningsPerActivePlayer", "medianDaysToFirstPlayer", "medianDaysToFirstEarnings", "updatedAt" }`, refreshed weekly |

Lets the earnings math ("how many players does $1,000 a month take?") work for a new Boss with real platform
numbers instead of waiting for the Boss's own first active players.

## 10. Privacy and responsibility

- **Never sent to the bot:** a player's phone, email or full name; deposit, bet or loss amounts; balances; payment details.
- `doNotContact` is mandatory and kept current (`player.do_not_contact`).
- Player terms state that their Boss can see their nickname and activity.
- The bot stores only player ids, nicknames and statuses, and deletes them on `player.deleted` / `boss.deleted`.
- The texts the bot prepares for Bosses to send are personal contact messages: no promised winnings, no pressure to play.

## 11. Technical basics

- Auth: `Authorization: Bearer <SHARKER_API_KEY>`, separate keys for staging and production.
- JSON, ISO 8601 UTC timestamps, cursor pagination.
- Expected load: each Boss read about once an hour (and on events); a Boss's player list on demand, at most once a minute per Boss.
- Events delivered within a minute; every event has a unique `id` (the bot de-duplicates).
