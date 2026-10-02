# Connecting the bot to Telegram

Telegram runs the same coach as WhatsApp: same menus, missions, goals, AI coach and proactive messages.
It's simpler to set up: no Meta app, no template approval, and proactive messages are free with no
24-hour window.

## 1. Create the bot (2 minutes)

1. In Telegram, open **@BotFather** and send `/newbot`.
2. Choose a display name (e.g. *Sharker Boss Coach*) and a username ending in `bot` (e.g. `SharkerBossCoachBot`).
3. BotFather replies with a **token** like `1234567890:AAH…`. Treat it like a password.

Optional, also in BotFather: `/setuserpic` (logo), `/setdescription` (what Bosses see before pressing Start).

## 2. Give the token to the bot

- **On Render**: service → **Environment** → add `TELEGRAM_BOT_TOKEN` = the token → **Save** (Render redeploys).
  The bot registers its webhook on Render's public URL by itself.
- **On your computer**: put `TELEGRAM_BOT_TOKEN=…` in `.env` and run `npm run dev`. Without `PUBLIC_URL` the
  bot long-polls Telegram, so you don't need a tunnel.

Check `https://<host>/health`: it should show `"telegram": true`.

## 3. Try it

Open `t.me/<your bot username>` and press **Start**. The bot asks the Boss to tap **📱 Share my phone number**:
Telegram doesn't reveal phone numbers otherwise. The bot only accepts the user's *own* contact, and links the
chat to the Boss account with that number. From then on:

- every menu, mission, goal and AI answer works as on WhatsApp, with Telegram buttons
- proactive coaching goes to the app the Boss used last (Telegram or WhatsApp)
- the commands menu has `/menu`, `/mission`, `/progress`, `/post`, `/help`

Before the Sharker API is connected, set `DEMO_BOSS_PHONE` to your number so sharing your phone links you to
a demo Boss.

## Notes

- Only private chats are handled; the bot ignores groups.
- The webhook is protected by a secret (`TELEGRAM_WEBHOOK_SECRET`, derived from the token if you don't set one).
- `TELEGRAM_MODE` = `auto` (default: webhook when `PUBLIC_URL`/`RENDER_EXTERNAL_URL` is set, else polling),
  `webhook` or `polling`.
