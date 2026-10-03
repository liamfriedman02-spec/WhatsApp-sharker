import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { LogSupportDesk } from "../src/bot/handoff.js";
import { loadConfig } from "../src/config.js";
import { silentLogger } from "../src/logger.js";
import { DemoPlatform } from "../src/platform/demoPlatform.js";
import { SqliteStore } from "../src/store/store.js";
import { RecordingMessenger } from "../src/whatsapp/consoleMessenger.js";
import type { InboundMessage } from "../src/whatsapp/types.js";
import { HUB, MONDAY_NOON, ids, textOf } from "./helpers.js";

const TESTER = "972544730355";
const CHAT = "777";

function demoHarness() {
  const clock = MONDAY_NOON.getTime();
  const store = new SqliteStore(":memory:");
  const platform = new DemoPlatform({
    defaultPersona: "carla",
    now: () => clock,
    onCreate: async (boss, history) => {
      for (const snap of history) await store.saveSnapshot(boss.id, snap);
    },
  });
  const messenger = new RecordingMessenger();
  const config = loadConfig({ NODE_ENV: "test", WHATSAPP_DRY_RUN: "true", BOSS_HUB_URL: HUB, TELEGRAM_BOT_TOKEN: "test-token" });
  const app = createApp(config, silentLogger, {
    platform,
    store,
    messenger,
    supportDesk: new LogSupportDesk(silentLogger),
    assistant: null,
    now: () => new Date(clock),
  });
  let seq = 0;
  async function send(msg: Partial<InboundMessage>) {
    const before = messenger.sent.length;
    await app.router.handleInbound({ messageId: `d${++seq}`, from: TESTER, timestamp: new Date(clock), type: "text", ...msg });
    return messenger.sent.slice(before);
  }
  const tg = (msg: Partial<InboundMessage>) => send({ channel: "telegram", from: CHAT, ...msg });
  return { app, platform, store, messenger, send, tg };
}

async function all<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

describe("demo platform", () => {
  it("turns any number into a demo Boss with history, and lists only real testers", async () => {
    const seeded: string[] = [];
    const platform = new DemoPlatform({ defaultPersona: "diego", preassigned: { "123": "ana" }, onCreate: (b, h) => void seeded.push(`${b.id}:${h.length}`) });
    expect(await all(platform.listBosses())).toEqual([]);

    const diego = await platform.getBossByPhone(TESTER);
    expect(diego).toMatchObject({ id: `demo_${TESTER}_diego`, phone: TESTER, firstName: "Diego" });
    expect((await platform.getBossByPhone("123"))?.firstName).toBe("Ana");
    expect(seeded[0]).toMatch(/^demo_972544730355_diego:[1-9]\d*$/); // Diego comes with a stat history

    const carla = await platform.assign(TESTER, "carla");
    expect(await platform.getBossByPhone(TESTER)).toEqual(carla);
    expect(await platform.getBoss(diego!.id)).toBeNull(); // one profile per number at a time
    expect((await all(platform.listBosses())).map((b) => b.phone).sort()).toEqual(["123", TESTER]);
    expect(platform.personaOf(carla)?.id).toBe("carla");
  });
});

describe("demo mode conversations", () => {
  it("links a Telegram tester whose number isn't a real Boss", async () => {
    const h = demoHarness();
    const [ask] = await h.tg({ text: "hi" });
    expect(ask?.message.kind).toBe("contact_request");

    const [linked, menu] = await h.tg({ type: "contact", contactPhone: TESTER });
    expect(textOf(linked?.message)).toContain("Connected! Welcome, Carla");
    expect(textOf(linked?.message)).toContain("Type *demo* anytime");
    expect(menu?.message).toMatchObject({ kind: "buttons", footer: "🧪 Demo · type DEMO to switch Boss profile" });
    expect(await h.store.getTelegramLink(CHAT)).toMatchObject({ bossId: `demo_${TESTER}_carla`, phone: TESTER });
  });

  it("switches profiles with DEMO and keeps the conversation on the same channel", async () => {
    const h = demoHarness();
    await h.tg({ type: "contact", contactPhone: TESTER });

    const [pick] = await h.tg({ text: "demo" });
    expect(ids(pick?.message)).toEqual(["demo:ana", "demo:bruno", "demo:carla", "demo:diego"]);
    expect(textOf(pick?.message)).toContain("You're testing as: *💎 Carla — growing*");

    const [switched, menu] = await h.tg({ type: "reply", replyId: "demo:diego" });
    expect(textOf(switched?.message)).toContain("now testing as *Diego*");
    expect(menu?.message.kind).toBe("buttons");
    expect(h.messenger.sent.every((s) => s.to === `tg:${CHAT}`)).toBe(true);
    expect(await h.store.getState(`demo_${TESTER}_diego`, TESTER)).toMatchObject({ channel: "telegram", telegramChatId: CHAT });

    // The link still resolves (by phone) to the profile now in use.
    const [mission] = await h.tg({ text: "mission" });
    expect(mission?.to).toBe(`tg:${CHAT}`);
    expect(textOf((await h.tg({ type: "reply", replyId: "menu:business" }))[0]?.message)).toContain("Diego");

    // Proactive coaching only ever targets the tester's active profile, on Telegram.
    expect((await all(h.platform.listBosses())).map((b) => b.id)).toEqual([`demo_${TESTER}_diego`]);
    expect((await h.app.retention.sweep()).checked).toBe(1);
    expect(h.messenger.sent.every((s) => s.to === `tg:${CHAT}`)).toBe(true);
  });

  it("works on WhatsApp too, and ignores unknown profiles", async () => {
    const h = demoHarness();
    const [menu] = await h.send({ text: "menu" });
    expect(textOf(menu?.message)).toContain("Carla");
    const [list] = await h.send({ type: "reply", replyId: "demo:nobody" });
    expect(ids(list?.message)).toContain("demo:ana");
    const [switched] = await h.send({ type: "reply", replyId: "demo:ana" });
    expect(switched?.to).toBe(TESTER);
    expect(textOf(switched?.message)).toContain("now testing as *Ana*");
  });
});
