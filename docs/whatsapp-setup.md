# Connecting the bot to WhatsApp

The bot talks to the **WhatsApp Cloud API** (Meta). You need: the bot online at a public HTTPS URL, a Meta app
with WhatsApp, four values in `.env`, and the webhook pointed at the bot.

## 1. Put the bot online (public HTTPS)

**Easiest: Render (no terminal).** Sign in at [render.com](https://render.com) with GitHub → **New → Blueprint** →
pick this repository (and branch). Render reads `render.yaml` and asks for the secrets:
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `DEMO_BOSS_PHONE`, and optionally
`ANTHROPIC_API_KEY`. After the deploy you get `https://<name>.onrender.com`, which is your `<host>`. The
`WHATSAPP_VERIFY_TOKEN` is generated for you; copy it from the service's **Environment** tab for step 4.
The free plan sleeps when idle (the first message after a pause can take ~1 minute) and its disk resets on
redeploy. That's fine for testing; use a paid instance with a disk for production.

**Quick test from your computer** (Node ≥ 22.13):

```bash
npm install
cp .env.example .env        # fill it in at step 3
npm run dev                 # listens on http://localhost:3000
npx cloudflared tunnel --url http://localhost:3000   # or: ngrok http 3000
```

The tunnel prints a public `https://…` address. Use it as `<host>` below. It changes every time you restart the tunnel.

**Production**: any Node 22 host (Railway, Render, Fly.io, a VPS…) with a persistent disk for `DATABASE_PATH`:
`npm ci && npm run build && npm start`.

## 2. Create the Meta app

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**, choose the WhatsApp use case (or add the **WhatsApp** product), and select/create your Meta business portfolio.
2. Open **WhatsApp → API Setup**. There you'll find:
   - a free **test phone number** and its **Phone number ID**
   - the **WhatsApp Business Account ID**
   - a **temporary access token** (valid ~24h, fine for the first test)
3. Under **To**, add your own WhatsApp number as a test recipient and confirm the code you receive.
4. **App settings → Basic → App secret**: copy it.

## 3. Fill in `.env`

```bash
WHATSAPP_ACCESS_TOKEN=<token from API Setup>
WHATSAPP_PHONE_NUMBER_ID=<Phone number ID>
WHATSAPP_APP_SECRET=<App secret>
WHATSAPP_VERIFY_TOKEN=<any random string you choose, e.g. sharker-7f3k2>
WHATSAPP_WABA_ID=<WhatsApp Business Account ID>   # for submitting templates

# Until the Sharker API is connected: chat as a demo Boss from your own phone
DEMO_BOSS_PHONE=972501234567    # your number, international format
DEMO_BOSS_ID=boss_carla         # boss_ana | boss_bruno | boss_carla | boss_diego

ANTHROPIC_API_KEY=<optional: enables the Claude coach and post writer>
```

Keep `NODE_ENV=development` for testing; `production` also requires the Sharker API and admin secrets.
Restart the bot after editing `.env`.

## 4. Point the webhook at the bot

In the Meta app: **WhatsApp → Configuration → Webhook → Edit**
- **Callback URL**: `https://<host>/webhooks/whatsapp`
- **Verify token**: the same value as `WHATSAPP_VERIFY_TOKEN`

Click **Verify and save** (the bot answers Meta's challenge), then under **Webhook fields** subscribe to **messages**.

## 5. Test

From your phone, send `hi` to the test number. You should get the main menu. Then try `mission`, `progress` and
`write me a post`. The bot's log shows every message.

## 6. Going to production

- **Permanent token**: go to [business.facebook.com](https://business.facebook.com) → Settings → Users → **System users**. Add an admin system user, then assign it the app and the WhatsApp account. Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` that never expires, and put it in `WHATSAPP_ACCESS_TOKEN`.
- **Your own number**: in WhatsApp Manager, add the phone number the Bosses will see. It can't be registered in the WhatsApp or WhatsApp Business app at the same time. The display name must be approved by Meta.
- **Business verification**: raises how many people you can message proactively per day.
- **Payment method**: proactive template messages are billed by Meta. Replies inside the 24h window after a Boss writes are free.
- **Templates**: run `npm run templates:export -- --submit` to submit all proactive messages. Until they're approved, the bot can only reply to Bosses who wrote in the last 24h.
- **Sharker API**: set `SHARKER_API_BASE_URL` (see [platform-api.md](platform-api.md)) and remove `DEMO_BOSS_PHONE`.
