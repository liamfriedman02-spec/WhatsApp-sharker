import type { Assistant } from "../src/ai/assistant.js";
import { createApp } from "../src/app.js";
import { LogSupportDesk } from "../src/bot/handoff.js";
import { loadConfig } from "../src/config.js";
import { contentCtx, type ContentCtx } from "../src/content/context.js";
import { silentLogger } from "../src/logger.js";
import { InMemoryPlatform, demoBosses } from "../src/platform/mockPlatform.js";
import type { BossProfile } from "../src/platform/types.js";
import { SqliteStore } from "../src/store/store.js";
import { RecordingMessenger } from "../src/whatsapp/consoleMessenger.js";
import type { OutboundMessage } from "../src/whatsapp/types.js";

/** Monday 2026-09-28, 12:00 UTC. */
export const MONDAY_NOON = new Date("2026-09-28T12:00:00Z");
export const HUB = "https://hub.test";

export const PHONES = {
  ana: "15550000001",
  bruno: "15550000002",
  carla: "15550000003",
  diego: "15550000004",
} as const;

export function harness(opts: { now?: Date; bosses?: BossProfile[]; assistant?: Assistant | null; env?: Record<string, string> } = {}) {
  let clock = (opts.now ?? MONDAY_NOON).getTime();
  const config = loadConfig({ NODE_ENV: "test", WHATSAPP_DRY_RUN: "true", BOSS_HUB_URL: HUB, ...opts.env });
  const platform = new InMemoryPlatform(opts.bosses ?? demoBosses(clock));
  const store = new SqliteStore(":memory:");
  const messenger = new RecordingMessenger();
  const supportDesk = new LogSupportDesk(silentLogger);
  const app = createApp(config, silentLogger, {
    platform,
    store,
    messenger,
    supportDesk,
    assistant: opts.assistant ?? null,
    now: () => new Date(clock),
  });
  let seq = 0;

  return {
    app,
    config,
    platform,
    store,
    messenger,
    supportDesk,
    now: () => new Date(clock),
    advance(ms: number) {
      clock += ms;
    },
    setNow(d: Date) {
      clock = d.getTime();
    },
    ctx(boss: BossProfile): ContentCtx {
      return contentCtx(boss, { now: new Date(clock), hubUrl: HUB, defaultTimezone: "UTC" });
    },
    /** Sends a text message from `phone` and returns the bot's replies. */
    async text(phone: string, text: string): Promise<OutboundMessage[]> {
      const before = messenger.sent.length;
      await app.router.handleInbound({ messageId: `m${++seq}`, from: phone, timestamp: new Date(clock), type: "text", text });
      return messenger.sent.slice(before).map((s) => s.message);
    },
    /** Taps a button/list row with the given id and returns the bot's replies. */
    async tap(phone: string, replyId: string): Promise<OutboundMessage[]> {
      const before = messenger.sent.length;
      await app.router.handleInbound({ messageId: `m${++seq}`, from: phone, timestamp: new Date(clock), type: "reply", replyId, replyTitle: replyId });
      return messenger.sent.slice(before).map((s) => s.message);
    },
  };
}

export type Harness = ReturnType<typeof harness>;

/** Flattens a message into searchable text. */
export function textOf(m: OutboundMessage | undefined): string {
  if (!m) return "";
  switch (m.kind) {
    case "text":
      return m.text;
    case "contact_request":
      return `${m.body}\n${m.buttonLabel}`;
    case "buttons":
      return `${m.body}\n${m.buttons.map((b) => `${b.id} ${b.title}`).join("\n")}`;
    case "list":
      return `${m.header ?? ""}\n${m.body}\n${m.sections.flatMap((s) => s.rows.map((r) => `${r.id} ${r.title} ${r.description ?? ""}`)).join("\n")}`;
    case "cta":
      return `${m.body}\n${m.cta.label} ${m.cta.url}`;
    case "template":
      return `${m.name} ${m.bodyParams.join(" ")}`;
  }
}

export function ids(m: OutboundMessage | undefined): string[] {
  if (!m) return [];
  if (m.kind === "buttons") return m.buttons.map((b) => b.id);
  if (m.kind === "list") return m.sections.flatMap((s) => s.rows.map((r) => r.id));
  return [];
}
