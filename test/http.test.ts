import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createHttpServer } from "../src/http/server.js";
import { sign } from "../src/whatsapp/webhook.js";
import { PHONES, harness } from "./helpers.js";

const ENV = {
  WHATSAPP_VERIFY_TOKEN: "verify-me",
  WHATSAPP_APP_SECRET: "app-secret",
  SHARKER_WEBHOOK_SECRET: "sharker-secret",
  ADMIN_API_KEY: "admin-key",
};

let close: (() => void) | undefined;
afterEach(() => close?.());

async function start() {
  const h = harness({ env: ENV });
  const { http, queue } = createHttpServer(h.app);
  const server = http.listen(0);
  await new Promise((r) => server.once("listening", r));
  close = () => server.close();
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { h, queue, base };
}

const inbound = (text: string) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ value: { messages: [{ from: PHONES.ana, id: `wamid.${text}`, timestamp: "1790000000", type: "text", text: { body: text } }] } }] }],
  });

describe("HTTP server", () => {
  it("answers Meta's webhook verification challenge", async () => {
    const { base } = await start();
    const ok = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");
    const bad = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42`);
    expect(bad.status).toBe(403);
  });

  it("rejects unsigned WhatsApp webhooks and processes signed ones", async () => {
    const { base, h, queue } = await start();
    const body = inbound("hi");
    const unsigned = await fetch(`${base}/webhooks/whatsapp`, { method: "POST", headers: { "content-type": "application/json" }, body });
    expect(unsigned.status).toBe(401);

    const signed = await fetch(`${base}/webhooks/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hub-signature-256": sign(body, ENV.WHATSAPP_APP_SECRET) },
      body,
    });
    expect(signed.status).toBe(200);
    await queue.idle();
    expect(h.messenger.to(PHONES.ana)[0]?.kind).toBe("buttons");
  });

  it("accepts signed Sharker platform events and triggers retention in real time", async () => {
    const { base, h, queue } = await start();
    const body = JSON.stringify({ events: [{ id: "evt_1", type: "player.joined", bossId: "boss_bruno", occurredAt: new Date().toISOString() }] });
    const res = await fetch(`${base}/webhooks/sharker`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharker-signature": sign(body, ENV.SHARKER_WEBHOOK_SECRET) },
      body,
    });
    expect(res.status).toBe(202);
    await queue.idle();
    expect(h.messenger.to(PHONES.bruno)).toHaveLength(1);

    const invalid = JSON.stringify({ id: "x" });
    const bad = await fetch(`${base}/webhooks/sharker`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharker-signature": sign(invalid, ENV.SHARKER_WEBHOOK_SECRET) },
      body: invalid,
    });
    expect(bad.status).toBe(400);
  });

  it("protects the admin API and exposes previews and handoffs", async () => {
    const { base } = await start();
    expect((await fetch(`${base}/admin/handoffs`)).status).toBe(401);
    const auth = { authorization: "Bearer admin-key" };
    const preview = await fetch(`${base}/admin/retention/preview/boss_ana`, { headers: auth });
    expect(preview.status).toBe(200);
    expect(await preview.json()).toMatchObject({ bossId: "boss_ana", sent: { trigger: "welcome" } });
    const handoffs = await fetch(`${base}/admin/handoffs?status=open`, { headers: auth });
    expect(await handoffs.json()).toEqual([]);
    const reply = await fetch(`${base}/admin/handoffs/99/reply`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(reply.status).toBe(409);
  });
});
