import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createHttpServer } from "../src/http/server.js";
import { silentLogger } from "../src/logger.js";
import { TelegramApi, toTelegramPayload } from "../src/telegram/api.js";
import { toTelegramHtml } from "../src/telegram/format.js";
import { startTelegram } from "../src/telegram/runtime.js";
import { parseTelegramUpdate, type TgUpdate } from "../src/telegram/updates.js";
import { KeyedQueue } from "../src/util/keyedQueue.js";
import { PHONES, harness, ids, textOf, type Harness } from "./helpers.js";

const CHAT = "111222333";
const TG = `tg:${CHAT}`;
let seq = 0;

const tgHarness = (env: Record<string, string> = {}) => harness({ env: { TELEGRAM_BOT_TOKEN: "test-token", ...env } });

async function tgSend(h: Harness, msg: Partial<Parameters<Harness["app"]["router"]["handleInbound"]>[0]>) {
  const before = h.messenger.sent.length;
  await h.app.router.handleInbound({ channel: "telegram", messageId: `tg:${++seq}`, from: CHAT, timestamp: h.now(), type: "text", ...msg });
  return h.messenger.sent.slice(before);
}

async function link(h: Harness, phone: string = PHONES.carla) {
  return tgSend(h, { type: "contact", contactPhone: phone });
}

describe("Telegram formatting", () => {
  it("converts WhatsApp-style formatting to HTML without breaking links", () => {
    expect(toTelegramHtml("*Bold* and _italic_ & <stuff>")).toBe("<b>Bold</b> and <i>italic</i> &amp; &lt;stuff&gt;");
    const url = "https://hub.test/players?utm_source=whatsapp&utm_medium=boss_bot&utm_campaign=mission_reengage_players";
    expect(toTelegramHtml(`🔗 ${url}`)).toBe("🔗 https://hub.test/players?utm_source=telegram&amp;utm_medium=boss_bot&amp;utm_campaign=mission_reengage_players");
    expect(toTelegramHtml("snake_case_word stays")).toBe("snake_case_word stays");
  });

  it("renders buttons, lists and links as inline keyboards", () => {
    expect(toTelegramPayload({ kind: "buttons", body: "Pick", buttons: [{ id: "mission:done", title: "✅ Done" }] })).toMatchObject({
      parse_mode: "HTML",
      text: "Pick",
      reply_markup: { inline_keyboard: [[{ text: "✅ Done", callback_data: "mission:done" }]] },
    });
    const list = toTelegramPayload({
      kind: "list",
      header: "Menu",
      body: "Hi",
      buttonLabel: "Open",
      sections: [{ title: "A", rows: [{ id: "menu:learn", title: "🎓 Learn", description: "x" }, { id: "menu:help", title: "💬 Help" }] }],
    });
    expect(list.text).toBe("<b>Menu</b>\n\nHi");
    expect(list.reply_markup).toEqual({ inline_keyboard: [[{ text: "🎓 Learn", callback_data: "menu:learn" }], [{ text: "💬 Help", callback_data: "menu:help" }]] });
    const cta = toTelegramPayload({ kind: "cta", body: "Go", footer: "Reply MENU", cta: { label: "Open", url: "https://hub.test/x?utm_source=whatsapp" } });
    expect(cta.text).toBe("Go\n\n<i>Reply MENU</i>");
    expect(cta.reply_markup).toEqual({ inline_keyboard: [[{ text: "Open", url: "https://hub.test/x?utm_source=telegram" }]] });
    expect(toTelegramPayload({ kind: "contact_request", body: "Share", buttonLabel: "📱 Share" }).reply_markup).toEqual({
      keyboard: [[{ text: "📱 Share", request_contact: true }]],
      one_time_keyboard: true,
      resize_keyboard: true,
    });
    expect(toTelegramPayload({ kind: "text", text: "hi" }).reply_markup).toEqual({ remove_keyboard: true });
    expect(() => toTelegramPayload({ kind: "template", name: "x", language: "en", bodyParams: [], buttonParams: [] })).toThrow();
  });
});

describe("Telegram updates", () => {
  const msg = (extra: Record<string, unknown>, chatType = "private"): TgUpdate =>
    ({ update_id: 7, message: { message_id: 1, date: 1_790_000_000, chat: { id: 42, type: chatType }, from: { id: 42, first_name: "Carla" }, ...extra } }) as TgUpdate;

  it("parses text, commands, button taps and contacts", () => {
    expect(parseTelegramUpdate(msg({ text: "hello" })).message).toMatchObject({ channel: "telegram", messageId: "tg:7", from: "42", type: "text", text: "hello", profileName: "Carla" });
    expect(parseTelegramUpdate(msg({ text: "/start" })).message?.text).toBe("menu");
    expect(parseTelegramUpdate(msg({ text: "/mission@SharkerBot" })).message?.text).toBe("mission");
    const cb = parseTelegramUpdate({ update_id: 8, callback_query: { id: "cb1", from: { id: 42 }, data: "goal:accept", message: { message_id: 2, date: 0, chat: { id: 42, type: "private" } } } });
    expect(cb).toMatchObject({ callbackQueryId: "cb1", message: { type: "reply", replyId: "goal:accept", from: "42" } });
    expect(parseTelegramUpdate(msg({ contact: { phone_number: "+372 5368 7238", user_id: 42 } })).message).toMatchObject({ type: "contact", contactPhone: "37253687238" });
  });

  it("rejects someone else's contact, group chats, and treats media as unsupported", () => {
    expect(parseTelegramUpdate(msg({ contact: { phone_number: "+15550000003", user_id: 99 } })).message?.contactPhone).toBeUndefined();
    expect(parseTelegramUpdate(msg({ text: "hi" }, "group")).message).toBeNull();
    expect(parseTelegramUpdate(msg({ photo: [{}] })).message).toMatchObject({ type: "unsupported" });
  });
});

describe("Telegram conversations", () => {
  it("asks an unknown chat to share their phone, then links it to the Boss", async () => {
    const h = tgHarness();
    const [ask] = await tgSend(h, { text: "hi", profileName: "Carla" });
    expect(ask?.to).toBe(TG);
    expect(ask?.message.kind).toBe("contact_request");
    expect(textOf(ask?.message)).toContain("Hi Carla!");

    const [retry] = await tgSend(h, { type: "contact" }); // someone else's contact (no verified phone)
    expect(textOf(retry?.message)).toContain("*your own* phone number");

    const [unknown] = await link(h, "19999999999");
    expect(textOf(unknown?.message)).toContain("couldn't find a Boss account");

    const [linked, menu] = await link(h);
    expect(textOf(linked?.message)).toContain("Connected! Welcome, Carla");
    expect(menu?.message.kind).toBe("list");
    expect(menu?.to).toBe(TG);
    expect(await h.store.getTelegramLink(CHAT)).toMatchObject({ bossId: "boss_carla", phone: PHONES.carla });
    expect(await h.store.getState("boss_carla", PHONES.carla)).toMatchObject({ channel: "telegram", telegramChatId: CHAT });
  });

  it("runs the full coach on Telegram once linked", async () => {
    const h = tgHarness();
    await link(h);
    const [mission] = await tgSend(h, { text: "mission" });
    expect(mission?.to).toBe(TG);
    expect(textOf(mission?.message)).toContain("Message 5 of your players");
    const [done] = await tgSend(h, { type: "reply", replyId: "mission:done" });
    expect(textOf(done?.message)).toContain("Mission complete!");
    expect(h.messenger.sent.every((s) => s.to === TG)).toBe(true); // nothing leaked to WhatsApp
  });

  it("sends proactive coaching on Telegram (no templates, no WhatsApp opt-in needed)", async () => {
    const h = tgHarness();
    h.platform.update("boss_carla", { whatsappOptIn: false });
    await link(h);
    h.advance(2 * 3_600_000);
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_carla"))!);
    expect(d.sent).toMatchObject({ via: "telegram", channel: "session" });
    const last = h.messenger.sent.at(-1)!;
    expect(last.to).toBe(TG);
    expect(last.message.kind).not.toBe("template");
  });

  it("follows the Boss back to WhatsApp when they write there", async () => {
    const h = tgHarness();
    await link(h);
    await h.text(PHONES.carla, "hi");
    h.advance(2 * 3_600_000);
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_carla"))!);
    expect(d.sent?.via).toBe("whatsapp");
    expect(h.messenger.sent.at(-1)?.to).toBe(PHONES.carla);
  });

  it("support agents reply on the Boss's channel", async () => {
    const h = tgHarness();
    await link(h);
    await tgSend(h, { text: "human" });
    await tgSend(h, { text: "My payout is missing" });
    const [handoff] = await h.store.listHandoffs("open");
    await h.app.router.agentReply(handoff!.id, "On it!", "Marta");
    expect(h.messenger.sent.at(-1)).toMatchObject({ to: TG });
    expect(textOf(h.messenger.sent.at(-1)?.message)).toContain("Marta (Sharker Support)");
  });

  it("without a Telegram token, proactive messages stay on WhatsApp", async () => {
    const h = harness();
    await h.store.saveState({ ...(await h.store.getState("boss_carla", PHONES.carla)), channel: "telegram", telegramChatId: CHAT });
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_carla"))!);
    expect(d.sent?.via).toBe("whatsapp");
  });
});

describe("Telegram transport", () => {
  let close: (() => void) | undefined;
  afterEach(() => close?.());

  it("accepts webhook calls only with the right secret", async () => {
    const h = tgHarness({ TELEGRAM_WEBHOOK_SECRET: "s3cret" });
    const { http, queue } = createHttpServer(h.app);
    const server = http.listen(0);
    await new Promise((r) => server.once("listening", r));
    close = () => server.close();
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const body = JSON.stringify({ update_id: 1, message: { message_id: 1, date: 1_790_000_000, chat: { id: Number(CHAT), type: "private" }, from: { id: Number(CHAT) }, text: "hi" } });

    const bad = await fetch(`${base}/webhooks/telegram`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "nope" }, body });
    expect(bad.status).toBe(401);
    const ok = await fetch(`${base}/webhooks/telegram`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "s3cret" }, body });
    expect(ok.status).toBe(200);
    await queue.idle();
    expect(h.messenger.sent.at(-1)).toMatchObject({ to: TG, message: { kind: "contact_request" } });
  });

  it("long-polls when there's no public URL, and registers a webhook when there is", async () => {
    const calls: { method: string; body: Record<string, unknown> }[] = [];
    let served = false;
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const method = String(url).split("/").pop()!;
      const body = JSON.parse(String(init?.body ?? "{}"));
      calls.push({ method, body });
      let result: unknown = true;
      if (method === "getUpdates") {
        result = served ? [] : [{ update_id: 5, message: { message_id: 1, date: 1_790_000_000, chat: { id: Number(CHAT), type: "private" }, from: { id: Number(CHAT) }, text: "hi" } }];
        served = true;
        await new Promise((r) => setTimeout(r, 5));
      }
      return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
    }) as typeof fetch;

    const h = tgHarness();
    const api = new TelegramApi("test-token", silentLogger, fakeFetch);
    const queue = new KeyedQueue();
    const stop = await startTelegram(h.config, { api, router: h.app.router, queue, logger: silentLogger });
    await new Promise((r) => setTimeout(r, 40));
    stop();
    await queue.idle();
    expect(calls.map((c) => c.method).slice(0, 3)).toEqual(["setMyCommands", "deleteWebhook", "getUpdates"]);
    expect(calls.filter((c) => c.method === "getUpdates")[1]?.body.offset).toBe(6);
    expect(h.messenger.sent.at(-1)).toMatchObject({ to: TG, message: { kind: "contact_request" } });

    calls.length = 0;
    const web = tgHarness({ PUBLIC_URL: "https://bot.example.com/", TELEGRAM_WEBHOOK_SECRET: "abc" });
    await startTelegram(web.config, { api, router: web.app.router, queue, logger: silentLogger });
    expect(calls.find((c) => c.method === "setWebhook")?.body).toMatchObject({ url: "https://bot.example.com/webhooks/telegram", secret_token: "abc" });
  });
});
