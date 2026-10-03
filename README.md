# Sharker Boss Coach (WhatsApp + Telegram)

A WhatsApp and Telegram coach for every Sharker **Boss**. It knows their numbers, sets goals with them, gives them one
concrete mission a day, tracks their progress and pushes them to grow. It's their personal business
coach, not an FAQ bot.

| Pillar | What the bot does |
|---|---|
| 🎓 **Education** | 10 short, action-oriented lessons (What is a Boss? → How the AI Agent markets for me). Each one ends with a Boss Hub button so the Boss acts on what they learned. |
| 💬 **Support** | FAQ by category, answers personalized with the Boss's real numbers, step-by-step guides that check the Boss's live account, free-text questions answered by the Claude coach, and handoff to a human. |
| 🔔 **Retention** | Proactive messages driven by the Boss's actual activity: welcome, first player, first earnings, no players yet, inactive Boss, weekly coaching. |
| 🤖 **Activation** | An AI Marketing Agent funnel (`not_activated` → `needs_socials` → `live`). Every message and CTA follows the Boss's stage, and a completed step is never asked for again. |
| 🏆 **Coaching** | Daily missions with streaks and points, personal goals with pace tracking, levels, week-over-week insights, momentum alerts, a coach that remembers the Boss and checks back in, and ready-to-post content. |
| 💰 **Earning, hand in hand** | The coach leads: a 7-day launch sprint to the first players and first earnings, campaigns (bring-a-friend, comeback, new-channel weeks), every invite and post written for the Boss, marketing channels opened one at a time, and earnings math that turns "I want $500 a month" into a number of players and a goal. Buttons under every message, and free text always works. |

Every message reinforces **your brand, your players, your earnings, your marketing, your business**, and
points to the next step of the journey:
**Launch Brand → Understand Business → Activate AI Agent → Bring Players → Generate Activity → Earn → Come Back → Grow.**

## Try it in 1 minute (no WhatsApp needed)

```bash
npm install
npm run simulate        # chat as a demo Boss in your terminal
```

Type `hi`, then type a number to tap a button. Try `sprint`, `texts`, `channels`, `how much can I earn`, `mission` and `write me a post`.
- `/boss` switches between the four demo Bosses: new Boss, Agent without socials, established and growing (Carla), slowing down (Diego).
- `/set aiAgent.activated=true` changes the Boss's data.
- `/time +3d` moves the clock forward.
- `/nudge` runs the proactive engine.

Set `ANTHROPIC_API_KEY` (Claude) or `OPENAI_API_KEY` (OpenAI) to talk to the AI coach.

```bash
npm test                # content limits, conversations, coaching, retention rules, HTTP, Claude request shape
npm run dev             # HTTP server on :3000 (dry-run until WhatsApp credentials are set)
```

Requires Node ≥ 22.13 (it uses the built-in `node:sqlite`).

## The coach

| | How it works |
|---|---|
| 🎯 **Today's mission** | One concrete action picked from the Boss's stage, goal and numbers: activate the Agent → connect socials → set up payouts → bring players (groups, status, bio, friends) → bring inactive players back. Missions that can be checked are verified on the live account ("I don't see it yet…"); the rest are self-reported. Buttons: ✅ Done · 🧭 Guide me / 🙋 Help me · 🔄 Another one. |
| 🔥 **Streak & points** | Each mission earns points. The streak counts missions done at most 3 days apart; skipping a mission resets it. |
| 🎯 **Goals** | The coach proposes a goal from the Boss's own pace (e.g. *15 new players by Oct 26*, or an earnings goal for established Bosses). The Boss can aim higher or go smaller. Progress shows a bar, "ahead / on track / behind", and the pace needed per day. Reaching the goal is celebrated and the coach proposes a bigger one. |
| 🏆 **Levels** | 🌱 Starter → 🚀 Rising (Agent live + first player) → 🏗️ Builder (10 players + first earnings) → 💎 Pro (50 players, 20 active) → 👑 Elite (200 players, 75 active). The coach always says exactly what's missing for the next level. |
| 💡 **Insights** | Week-over-week changes from daily snapshots, drops flagged early, and the value of inactive players estimated from the Boss's own numbers ("Each active player brought you about $5.10 this week. Bringing back 10 of your 128 inactive players could mean about +$51 a week"). |
| 📈 **Momentum** | "🔥 Best day ever" celebrations, and one "Let's turn it around" alert when new players drop 30%+ (with the mission that fixes it). |
| 🚀 **Launch sprint** | New Bosses get a 7-day plan, one 10-minute step a day, everything prepared: day 1 *who's around you?* → invites written per audience (family, friends, work, groups, followers; or whatever the Boss types), day 2 groups + status, day 3 the AI Agent, day 4 a new channel, day 5 welcome + follow-up texts, day 6 bring-a-friend, day 7 the review and a goal. Each morning the bot opens the next day (`playbook_step`); the step's mission is today's mission, so ✅ Done, points and streaks work as usual. |
| 📣 **Campaigns** | Short plans the coach proposes when they fit: 🤝 bring-a-friend week (players ≥ 3), 🔁 comeback week (≥ 5 inactive players), 📣 new-channel week. Same engine as the sprint (`src/content/playbooks.ts`). While a plan runs, no other reminder asks for the Boss's time. |
| 💌 **Texts** | Invites by audience, a welcome for new players, a bring-a-friend ask, a friendly follow-up and a comeback message, each as its own forwardable message with the brand link. Claude writes the invite in the Boss's voice when available. Naming an audience in free text ("my gym buddies") is enough. |
| 📣 **Channels** | WhatsApp status → groups → Instagram → TikTok → Telegram channel → Facebook groups. The screen shows what's in use (🤖 = the AI Agent posts there), names the next channel, and opens it with a step-by-step guide. |
| 💰 **Earnings math** | "How much do you want to earn a month?" → from the Boss's own earnings per active player and activation rate: *$500 takes about 48 active players; bring about 70 more*. Becomes the proposed goal. Without data yet, it says so and points to the first 5 players. |
| 🧠 **AI coach** | Claude sees the Boss's data, level, goal and pace, mission, plan, streak, insights, audiences, channels and what it remembers about them. It leads (states the plan, asks for a commitment), and from the conversation it can set a goal, remember facts, mark the mission done, schedule a check-in, design a custom campaign, and pick the buttons shown under its reply. |
| ✍️ **Post writer** | "Write me a post" returns 3 ready-to-post texts (WhatsApp status, Instagram, TikTok) with the brand link, written by Claude and tailored to what the coach knows. Without AI it uses built-in texts. |
| 💪 **Intensity** | The Boss chooses **🔥 Push me hard** (daily missions), **💪 Standard** (missions Tue/Thu plus weekly coaching) or **🌿 Light touch** (weekly coaching only). |

## Channels

| | WhatsApp | Telegram |
|---|---|---|
| Setup | Meta app + webhook ([guide](docs/whatsapp-setup.md)) | @BotFather token ([guide](docs/telegram-setup.md)) |
| Who is the Boss? | The sender's phone number | The Boss shares their own number once (📱 button); the chat is linked to that Boss |
| Buttons | Reply buttons, lists, link buttons | Inline keyboards |
| Proactive messages | Approved templates outside the 24h window; WhatsApp opt-in required | Always the interactive version; free, no window |

Proactive coaching follows the Boss to the app they used last.

## How it works

```
 WhatsApp Cloud API ──webhook──▶ /webhooks/whatsapp ──▶ BotRouter ──▶ menus, lessons, FAQ, guides,
                                                          │            missions, goals, progress, posts
                                                          │            free text → Claude coach (fallback: keyword search)
                                                          │            "Talk to a human" → SupportDesk
 Sharker platform ───events────▶ /webhooks/sharker ──┐    │
                                                     ▼    ▼
                     hourly sweep ─────────▶ RetentionEngine ──▶ proactive messages (session or template)
                                                     │    ▲
                                                     │    └── CoachService: insights, goals, levels, missions, memory
                     Sharker Read API ◀──────────────┴── BossProfile (players, earnings, GCOIN, AI Agent state)
                     SQLite ◀── conversation state, message log, sent-nudge history, handoffs,
                                coach state, missions, daily stat snapshots
```

| Path | Responsibility |
|---|---|
| `src/content/` | **All copy**: lessons (`topics.ts`), FAQ (`faq.ts`), guides incl. channel guides (`guides.ts`), missions (`missions.ts`), the launch sprint and campaigns (`playbooks.ts`), invites and player texts (`invites.ts`), marketing channels (`channels.ts`), levels (`levels.ts`), proactive messages & WhatsApp templates (`nudges.ts`), Boss Hub links (`links.ts`), buttons the AI may attach (`quickButtons.ts`). |
| `src/coach/` | Coaching brain: `insights.ts` (trends, where the money is), `goals.ts` (proposal, pace), `money.ts` (target → players), `plan.ts` (today's step / mission), `service.ts` (state, missions, streaks, plans, memory, follow-ups). |
| `src/bot/` | Conversation: `router.ts` (every inbound message), `views.ts` + `coachViews.ts` (screens), `intents.ts` (commands and keyword search), `handoff.ts` (human support). |
| `src/ai/` | Claude coach and post writer. The knowledge base is built from `src/content`; Boss and coach data are added to each request. |
| `src/retention/` | Triggers, frequency caps and the 24h-window channel choice (`engine.ts`, `triggers.ts`). |
| `src/platform/` | Sharker API client plus the demo platform: any number becomes a demo Boss, with demo history. |
| `src/whatsapp/` | Cloud API client, webhook parsing, signature checks, message-limit validation. |
| `src/telegram/` | Telegram Bot API client, HTML formatting, update parsing, webhook/polling runtime. |
| `src/channels.ts` | Addresses (`5511…` = WhatsApp, `tg:123…` = Telegram) and routing messages to the right channel. |

### Conversation map

`hi` / `menu` → **Main menu**: "Here's the plan for *your brand* today" — the one thing to do first, then the rows:
- 🚀 **My plan today** (or the plan the coach would start now): the day's step of the launch sprint or campaign, with its texts
- 🎯 **Today's mission**: one action for today, with ✅ Done · Guide me · Another one
- 🏆 **My goal & level**: level ladder, goal progress bar and pace, streak and points, top insight
- 📊 **My business**: players, earnings, GCOIN and AI Agent, with week-over-week trends and the next step
- 🤖 **My AI Agent**: stage-aware status (the three messages from the brief), a ✅/⬜ checklist, and "Guide me"
- 📣 **My channels**: what's open, the next channel, and the guide that opens it
- 💌 **Texts for me**: invites by audience, welcome, bring-a-friend, follow-up, comeback, and posts for socials
- 💰 **Earnings math**: a monthly target → active players needed → players to bring → goal
- 🎓 **Learn**: 10 lessons with "Next topic", so they work as a mini course
- 💬 **Get help**: 7 FAQ categories → answer → "Did this solve it?" → guide or human; also 🙋 talk to a human and 🔔 coaching & alerts

Every screen is hybrid: tap a button, or type. Keywords: `MENU`, `SPRINT`/`PLAN`, `MISSION`, `TEXTS`, `MONEY`, `CHANNELS`,
`PROGRESS`, `POST`, `HELP`, `HUMAN`, `STOP` (pause tips), `START` (resume). "sent it" / "done" completes today's mission;
"my gym buddies" gets an invite; "I want to earn 500 a month" gets the math. Anything else goes to the Claude coach,
whose replies always end with the buttons it picked.

### Proactive rules

| Trigger | When | Cadence |
|---|---|---|
| Welcome | Brand is live | once |
| First earnings / first player | Recent first earnings (asks for payout setup if missing) / first players this week | once each |
| Goal reached · Level up · Best day ever | Goal hit · a new level · a record day for new players (after a week of history) | when it happens |
| **AI Agent: activate** | Stage `not_activated`, launched ≥ 1 day | 3 reminders (day 0, +3, +7), different copy each time, then stop |
| **AI Agent: connect socials** | Stage `needs_socials` | 3 reminders (day 0, +2, +4) |
| **AI Agent live** / first post | Stage just became `live` / first automatic posts | once each |
| Coach check-in | A follow-up the coach scheduled in conversation is due | when due |
| **Plan step** / plan complete | A new day of the Boss's sprint or campaign (opens the step, assigns its mission) / the morning after the last day | daily while the plan runs (outside the weekly budget; all other reminders pause) / once |
| No players | Launched ≥ 2 days, 0 players | 3 reminders |
| Momentum drop | New players down 30%+ vs last week | once per drop |
| Inactive Boss | No Boss Hub visit for 7+ days | 3 reminders |
| Weekly coaching | Monday ≥ 09:00 local (Tue/Wed if Monday's slot was used): trends, level, goal, this week's focus, "Full coaching" button | weekly |
| Goal proposal | Engaged Boss without a goal (Wed/Fri) | at most weekly |
| Daily mission | Mission days for the Boss's intensity, 09:00–20:00 local | per intensity |
| Daily summary | Opt-in; ≥ 18:00 local and there was activity today | daily |

Guardrails, applied in this order:
- Only Bosses with `whatsappOptIn`. Nothing is sent after `STOP` or during a human handoff.
- No messages during quiet hours (21:00–09:00 in the Boss's timezone).
- Per local day: at most 2 messages and at most 1 reminder, summary or mission. Milestones can take the second slot.
- Weekly reminder budget by intensity: light 2, standard 4, push-me-hard 7. Check-ins the Boss asked for don't count.
- Reminders at least 12h apart, any two messages at least 3h apart, and no reminders while the Boss is chatting. Celebrations still go through.
- A reminder series stops at its maximum and resets when its condition resolves (for example, the Agent gets activated).
- Inside WhatsApp's 24h window the bot sends an interactive message. Missions keep their ✅ Done button, with the link inline. Outside the window it sends the approved template.

Preview any Boss without sending anything: `GET /admin/retention/preview/{bossId}`.

## Going live checklist

1. **Sharker platform**: implement the read API and events webhook in [`docs/platform-api.md`](docs/platform-api.md), and collect `whatsappOptIn` during Boss onboarding. Add `brandUrl` so posts include the real link.
2. **Meta**: follow [`docs/whatsapp-setup.md`](docs/whatsapp-setup.md). You create the Meta app, fill in `.env` and point the webhook at `https://<host>/webhooks/whatsapp`. Before the Sharker API exists, any number that writes becomes a demo Boss (`DEMO_BOSS_ID` picks the starting profile), and typing `demo` switches between the four profiles.
3. **Telegram (optional)**: create a bot with @BotFather and set `TELEGRAM_BOT_TOKEN` ([`docs/telegram-setup.md`](docs/telegram-setup.md)). On Render the webhook registers itself.
4. **Templates**: run `npm run templates:export` to print all 27 proactive messages as Meta template payloads (`-- --submit` submits them). They must be approved before they can be sent outside the 24h window.
5. **Content & tuning**: the copy in `src/content/` is a first draft. The Sharker team must verify every factual statement (earnings, payouts, GCOIN, Boss Hub section names), the Boss Hub paths in `links.ts`, the level thresholds in `levels.ts`, and the mission list in `missions.ts`.
6. **Config**: copy `.env.example` to `.env`. In production the app refuses to start without at least one channel (WhatsApp or Telegram) and the Sharker and admin secrets.
7. **Human support**: set `SUPPORT_WEBHOOK_URL` to receive `handoff.opened` / `handoff.message` / `handoff.closed` events. Agents reply with the admin API:

```bash
curl -X POST https://<host>/admin/handoffs/12/reply -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "content-type: application/json" -d '{"text":"Found it — your payout is being re-sent today.","agentName":"Marta"}'
curl -X POST https://<host>/admin/handoffs/12/resolve -H "Authorization: Bearer $ADMIN_API_KEY"
```

Other admin endpoints: `GET /admin/handoffs?status=open`, `POST /admin/retention/sweep`.

## Claude coach

- Model `claude-opus-5` (`CLAUDE_MODEL`), adaptive thinking at `low` effort (`CLAUDE_EFFORT`) for chat latency.
- Structured output: `reply`, `cta`, `guide`, `escalate_to_human`, plus the coaching actions `set_goal`, `remember`, `follow_up_hours`/`follow_up_reason` and `mission_done`. Every action is validated before it's applied. The model picks buttons by id only, so it can never invent a URL.
- The system prompt (coach persona, rules, full knowledge base) is identical for every Boss and is prompt-cached. The Boss's data, coach data and recent conversation go in the user turn.
- The server-side refusal fallback (`fallbacks: "default"`) is on. Turn it off with `CLAUDE_REFUSAL_FALLBACK=false` for platforms or models that don't support it.
- No Anthropic key? `OPENAI_API_KEY` runs the same coach (same prompts, schemas and validation) on OpenAI Chat Completions with a strict JSON schema; `OPENAI_MODEL` defaults to `gpt-5-mini`. The Anthropic key wins when both are set.
- Refusals, errors and rate limits fall back to keyword search and built-in posts. Each Boss is limited to 30 AI calls per hour.

## Editing content

Everything the Boss reads lives in `src/content/`. `npm test` checks every screen for every demo Boss against
WhatsApp's limits (button ≤ 20 chars, list row ≤ 24/72, body ≤ 1024, ≤ 10 rows…), checks that every button id
routes somewhere, and checks the template rules (no variable at the start or end of a body, sequential
placeholders, single-line params). Edit freely and let the tests catch mistakes.
