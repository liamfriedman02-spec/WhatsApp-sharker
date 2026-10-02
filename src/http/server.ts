import { timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { App } from "../app.js";
import type { PlatformEvent } from "../platform/types.js";
import { KeyedQueue } from "../util/keyedQueue.js";
import { handleTelegramUpdate } from "../telegram/runtime.js";
import type { TgUpdate } from "../telegram/updates.js";
import { parseWebhook, verifySignature } from "../whatsapp/webhook.js";

type RawRequest = Request & { rawBody?: Buffer };

const PlatformEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "brand.launched",
    "player.joined",
    "earnings.generated",
    "ai_agent.activated",
    "ai_agent.social_connected",
    "ai_agent.social_disconnected",
    "ai_agent.post_published",
    "boss.updated",
  ]),
  bossId: z.string().min(1),
  occurredAt: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});
const PlatformEventsBody = z.union([PlatformEventSchema, z.object({ events: z.array(PlatformEventSchema).max(500) })]);

export function createHttpServer(app: App): { http: express.Express; queue: KeyedQueue } {
  const { config, logger, router, retention, store } = app;
  const queue = new KeyedQueue();
  const http = express();
  http.disable("x-powered-by");
  http.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as RawRequest).rawBody = Buffer.from(buf);
      },
    }),
  );

  http.get("/health", (_req, res) => {
    res.json({ ok: true, dryRun: config.whatsapp.dryRun, telegram: !!app.telegramApi, ai: !!app.assistant });
  });

  // ── WhatsApp Cloud API webhook ────────────────────────────────────────────
  http.get("/webhooks/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && config.whatsapp.verifyToken && token === config.whatsapp.verifyToken) {
      res.status(200).send(String(challenge ?? ""));
      return;
    }
    res.sendStatus(403);
  });

  http.post("/webhooks/whatsapp", (req: RawRequest, res) => {
    if (config.whatsapp.appSecret) {
      if (!req.rawBody || !verifySignature(req.rawBody, req.header("x-hub-signature-256"), config.whatsapp.appSecret)) {
        logger.warn("whatsapp webhook: bad signature");
        res.sendStatus(401);
        return;
      }
    }
    // Acknowledge immediately; Meta retries slow webhooks.
    res.sendStatus(200);

    const { messages, statuses } = parseWebhook(req.body);
    for (const m of messages) {
      void queue.run(`wa:${m.from}`, () => router.handleInbound(m)).catch((err) => {
        logger.error("whatsapp webhook: handler failed", { err });
      });
    }
    for (const s of statuses) {
      if (s.status === "failed") logger.warn("whatsapp delivery failed", { messageId: s.messageId, errors: s.errors });
    }
  });

  // ── Telegram Bot API webhook ─────────────────────────────────────────────
  http.post("/webhooks/telegram", (req: RawRequest, res) => {
    const api = app.telegramApi;
    if (!api) {
      res.sendStatus(404);
      return;
    }
    const given = Buffer.from(req.header("x-telegram-bot-api-secret-token") ?? "");
    const expected = Buffer.from(config.telegram.webhookSecret);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      logger.warn("telegram webhook: bad secret");
      res.sendStatus(401);
      return;
    }
    res.sendStatus(200); // acknowledge first; Telegram retries slow webhooks
    void handleTelegramUpdate(req.body as TgUpdate, { api, router, queue, logger });
  });

  // ── Sharker platform events (real-time retention triggers) ───────────────
  http.post("/webhooks/sharker", (req: RawRequest, res) => {
    const secret = config.sharker.webhookSecret;
    if (secret) {
      if (!req.rawBody || !verifySignature(req.rawBody, req.header("x-sharker-signature"), secret)) {
        logger.warn("sharker webhook: bad signature");
        res.sendStatus(401);
        return;
      }
    } else if (config.env === "production") {
      res.sendStatus(401);
      return;
    }
    const parsed = PlatformEventsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid event payload", issues: parsed.error.issues });
      return;
    }
    const events: PlatformEvent[] = "events" in parsed.data ? parsed.data.events : [parsed.data];
    res.status(202).json({ accepted: events.length });
    for (const e of events) {
      void queue.run(`boss:${e.bossId}`, async () => {
        await retention.handleEvent(e);
      }).catch((err) => logger.error("sharker webhook: handler failed", { eventId: e.id, err }));
    }
  });

  // ── Admin API (support agents & ops) ──────────────────────────────────────
  const admin = express.Router();
  admin.use((req: Request, res: Response, next: NextFunction) => {
    if (!config.adminApiKey) {
      res.status(503).json({ error: "admin API disabled: set ADMIN_API_KEY" });
      return;
    }
    const given = Buffer.from(req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
    const expected = Buffer.from(config.adminApiKey);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      res.sendStatus(401);
      return;
    }
    next();
  });

  admin.post("/retention/sweep", async (_req, res) => {
    res.json(await retention.sweep());
  });

  admin.get("/retention/preview/:bossId", async (req, res) => {
    const boss = await app.platform.getBoss(req.params.bossId as string);
    if (!boss) {
      res.status(404).json({ error: "boss not found" });
      return;
    }
    res.json(await retention.runForBoss(boss, { dryRun: true }));
  });

  admin.get("/handoffs", async (req, res) => {
    const status = req.query.status === "open" || req.query.status === "resolved" ? req.query.status : undefined;
    res.json(await store.listHandoffs(status));
  });

  const ReplyBody = z.object({ text: z.string().min(1).max(4000), agentName: z.string().max(60).optional() });
  admin.post("/handoffs/:id/reply", async (req, res) => {
    const body = ReplyBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    try {
      res.json(await router.agentReply(Number(req.params.id), body.data.text, body.data.agentName));
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  admin.post("/handoffs/:id/resolve", async (req, res) => {
    try {
      res.json(await router.resolveHandoff(Number(req.params.id)));
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  http.use("/admin", admin);

  http.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("http error", { err });
    res.status(500).json({ error: "internal error" });
  });

  return { http, queue };
}
