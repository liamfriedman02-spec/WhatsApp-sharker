# Sharker platform ↔ bot contract

The bot needs two things from the Sharker platform:

1. **Read API** to look up a Boss (by phone or id) and to list Bosses for the retention sweep.
2. **Events webhook** so it can react in real time (first player, Agent connected, …).

Both are small. Until they exist, the bot runs on built-in demo Bosses (`SHARKER_API_BASE_URL` empty).

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
`ai_agent.social_disconnected`, `ai_agent.post_published`, `boss.updated`.

The bot answers `202`, de-duplicates by `id`, re-reads the Boss from the Read API, and runs the retention
rules for that Boss right away. Events are an accelerator, not a requirement: every rule is also evaluated by
the hourly sweep, so a lost event only delays a message.

## 3. Boss Hub deep links

CTA buttons open `BOSS_HUB_URL/<path>?utm_source=whatsapp&utm_medium=boss_bot&utm_campaign=<message>`.
The paths are placeholders in `src/content/links.ts` — align them with the real Boss Hub routes. The UTM
parameters let the Hub measure which WhatsApp messages drive activations.
