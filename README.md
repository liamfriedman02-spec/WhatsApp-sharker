# Sharker Boss WhatsApp Bot

A WhatsApp assistant for every Sharker **Boss**: their personal business assistant, not an FAQ bot.

| Pillar | What the bot does |
|---|---|
| 🎓 **Education** | 10 short, action-oriented lessons (What is a Boss? → How the AI Agent markets for me). Each one ends with a Boss Hub button so the Boss acts on what they learned. |
| 💬 **Support** | FAQ by category, answers personalized with the Boss's real numbers, step-by-step guides that check the Boss's live account, free-text questions answered by Claude, and handoff to a human. |
| 🔔 **Retention** | Proactive messages driven by the Boss's actual activity: welcome, first player, first earnings, no players yet, inactive Boss, daily/weekly performance. |
| 🤖 **Activation** | An AI Marketing Agent funnel (`not_activated` → `needs_socials` → `live`). Every message and CTA follows the Boss's stage, and a completed step is never asked for again. |

Every message reinforces **your brand, your players, your earnings, your marketing, your business**, and
points to the next step of the journey:
**Launch Brand → Understand Business → Activate AI Agent → Bring Players → Generate Activity → Earn → Come Back → Grow.**

## Try it in 1 minute (no WhatsApp needed)

```bash
npm install
npm run simulate        # chat as a demo Boss in your terminal
```

Type `hi`, then type a number to tap a button. `/boss` switches between the four demo Bosses (new Boss, Agent
without socials, established Boss, inactive Boss). `/set aiAgent.activated=true` changes the Boss's data,
`/time +3d` moves the clock forward, and `/nudge` runs the retention engine. Set `ANTHROPIC_API_KEY` to try
the free-text assistant.

```bash
npm test                # content limits, conversations, retention rules, HTTP, Claude request shape
npm run dev             # HTTP server on :3000 (dry-run until WhatsApp credentials are set)
```

Requires Node ≥ 22.13 (it uses the built-in `node:sqlite`).

## How it works

```
 WhatsApp Cloud API ──webhook──▶ /webhooks/whatsapp ──▶ BotRouter ──▶ menus, lessons, FAQ, guides
                                                          │            free text → Claude (fallback: keyword search)
                                                          │            "Talk to a human" → SupportDesk
 Sharker platform ───events────▶ /webhooks/sharker ──┐    │
                                                     ▼    ▼
                     hourly sweep ─────────▶ RetentionEngine ──▶ proactive messages (session or template)
                                                     │
                     Sharker Read API ◀──────────────┴── BossProfile (players, earnings, GCOIN, AI Agent state)
                     SQLite ◀── conversation state, message log, sent-nudge history, handoffs
```

| Path | Responsibility |
|---|---|
| `src/content/` | **All copy**: lessons (`topics.ts`), FAQ (`faq.ts`), guides (`guides.ts`), proactive messages & WhatsApp templates (`nudges.ts`), Boss Hub links (`links.ts`), next best action (`nextBestAction.ts`). |
| `src/bot/` | Conversation: `router.ts` (every inbound message), `views.ts` (screens), `intents.ts` (commands and keyword search), `handoff.ts` (human support). |
| `src/ai/` | Claude assistant: the knowledge base is built from `src/content`, and the Boss's live data is added to each request. |
| `src/retention/` | Triggers, caps and the 24h-window channel choice (`engine.ts`, `triggers.ts`). |
| `src/platform/` | Sharker API client plus the in-memory demo platform. |
| `src/whatsapp/` | Cloud API client, webhook parsing, signature checks, message-limit validation. |

### Conversation map

`hi` / `menu` → **Main menu** (personal greeting and the Boss's next step)
- 👉 **My next step**: the single most valuable action right now (guide or Boss Hub button)
- 📊 **My business**: your players, earnings, GCOIN and AI Agent, plus your next step
- 🤖 **My AI Agent**: stage-aware status (the three messages from the brief), a ✅/⬜ checklist, and "Guide me"
- 🎓 **Learn**: 10 lessons with "Next topic", so they work as a mini course
- 💬 **Get help**: 7 FAQ categories → answer → "Did this solve it?" → guide or human
- 🙋 **Talk to a human**: the Boss describes the issue, a ticket opens, and agents reply through the bot
- 🔔 **Notifications**: daily/weekly/no summary, pause/resume tips

Free text goes to the Claude assistant, which answers from the knowledge base and the Boss's data, can
attach one Boss Hub button or offer a guide, and escalates to a human when it can't solve the problem.
Keywords: `MENU`, `HELP`, `HUMAN`, `STOP` (pause tips), `START` (resume).

### Retention & activation rules

| Trigger | When | Cadence | CTA |
|---|---|---|---|
| Welcome | Brand is live | once | Start learning / My business / My AI Agent |
| First earnings | All earnings happened in the last 7 days | once | See My Earnings, or Set Up My Payouts if no payout method |
| First player | 1–10 players, all joined this week | once | Get My Brand Link |
| **AI Agent: activate** | Stage `not_activated`, launched ≥ 1 day | 3 reminders (day 0, +3, +7), different copy each time, then stop | Activate My AI Agent |
| **AI Agent: connect socials** | Stage `needs_socials` | 3 reminders (day 0, +2, +4) | Connect My Socials |
| **AI Agent live** | Stage just became `live` | once | View My AI Agent |
| Agent first post | First automatic posts published | once | View My AI Agent |
| No players | Launched ≥ 2 days, 0 players | 3 reminders (day 0, +3, +5) | Get My Brand Link |
| Inactive Boss | No Boss Hub visit for 7+ days | 3 reminders (day 0, +7, +9) | Open My Dashboard |
| Weekly summary | Monday ≥ 10:00 local (Tue/Wed if Monday's slot was used) | weekly | Open My Dashboard |
| Daily summary | Opt-in; ≥ 18:00 local and there was activity today | daily | Open My Dashboard |

Guardrails, applied in this order:
- Only Bosses with `whatsappOptIn`. Nothing is sent after `STOP` or during a human handoff.
- No messages during quiet hours (21:00–09:00 in the Boss's timezone).
- At most 2 proactive messages per 24h and at most 1 reminder or summary per 24h. Milestones can take the second slot.
- At least 3 hours between messages, and no reminders while the Boss is chatting. Celebrations still go through.
- A reminder series stops at its maximum and resets when its condition resolves (for example, the Agent gets activated).
- Inside WhatsApp's 24h window the bot sends an interactive message with a button. Outside it, it sends the approved template.

Preview any Boss without sending anything: `GET /admin/retention/preview/{bossId}`.

## Going live checklist

1. **Sharker platform**: implement the read API and events webhook in [`docs/platform-api.md`](docs/platform-api.md), and collect `whatsappOptIn` during Boss onboarding.
2. **Meta**: create the app and WhatsApp Business number. Set the webhook to `https://<host>/webhooks/whatsapp` with `WHATSAPP_VERIFY_TOKEN`, and subscribe to `messages`.
3. **Templates**: run `npm run templates:export` to print every proactive message as a Meta template payload (`-- --submit` submits them). They must be approved before they can be sent outside the 24h window.
4. **Content**: the copy in `src/content/` is a first draft. The Sharker team must verify every factual statement (earnings, payouts, GCOIN, Boss Hub section names) and the Boss Hub paths in `links.ts`.
5. **Config**: copy `.env.example` to `.env`. In production the app refuses to start without the WhatsApp, Sharker and admin secrets.
6. **Human support**: set `SUPPORT_WEBHOOK_URL` to receive `handoff.opened` / `handoff.message` / `handoff.closed` events. Agents reply with the admin API:

```bash
curl -X POST https://<host>/admin/handoffs/12/reply -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "content-type: application/json" -d '{"text":"Found it — your payout is being re-sent today.","agentName":"Marta"}'
curl -X POST https://<host>/admin/handoffs/12/resolve -H "Authorization: Bearer $ADMIN_API_KEY"
```

Other admin endpoints: `GET /admin/handoffs?status=open`, `POST /admin/retention/sweep`.

## Claude assistant

- Model `claude-opus-5` (`CLAUDE_MODEL`), adaptive thinking at `low` effort (`CLAUDE_EFFORT`) for chat latency.
- Structured output (`reply`, `cta`, `guide`, `escalate_to_human`). The model picks a button by id only, so it can never invent a URL.
- The system prompt (persona, rules, full knowledge base) is identical for every Boss and is prompt-cached. The Boss's data and recent conversation go in the user turn.
- The server-side refusal fallback (`fallbacks: "default"`) is on. Turn it off with `CLAUDE_REFUSAL_FALLBACK=false` for platforms or models that don't support it.
- Refusals, errors and rate limits fall back to keyword search over the same content. Each Boss is limited to 30 AI answers per hour.

## Editing content

Everything the Boss reads lives in `src/content/`. `npm test` checks every screen for every demo Boss against
WhatsApp's limits (button ≤ 20 chars, list row ≤ 24/72, body ≤ 1024, ≤ 10 rows…), checks that every button id
routes somewhere, and checks the template rules (no variable at the start or end of a body, sequential
placeholders, single-line params). Edit freely and let the tests catch mistakes.
