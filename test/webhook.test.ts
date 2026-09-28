import { describe, expect, it } from "vitest";
import { toCloudPayload } from "../src/whatsapp/cloudApi.js";
import { validateMessage } from "../src/whatsapp/validate.js";
import { parseWebhook, sign, verifySignature } from "../src/whatsapp/webhook.js";

const envelope = (message: Record<string, unknown>) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            contacts: [{ wa_id: "15550000001", profile: { name: "Ana" } }],
            messages: [{ from: "15550000001", id: "wamid.1", timestamp: "1790000000", ...message }],
          },
        },
      ],
    },
  ],
});

describe("parseWebhook", () => {
  it("parses text messages", () => {
    const { messages } = parseWebhook(envelope({ type: "text", text: { body: "hi" } }));
    expect(messages).toEqual([
      expect.objectContaining({ messageId: "wamid.1", from: "15550000001", type: "text", text: "hi", profileName: "Ana" }),
    ]);
  });

  it("parses reply buttons, list rows and template quick replies", () => {
    const button = parseWebhook(envelope({ type: "interactive", interactive: { type: "button_reply", button_reply: { id: "menu:main", title: "Menu" } } }));
    const list = parseWebhook(envelope({ type: "interactive", interactive: { type: "list_reply", list_reply: { id: "learn:gcoin", title: "GCOIN" } } }));
    const template = parseWebhook(envelope({ type: "button", button: { payload: "guide:activate_agent", text: "Guide me" } }));
    expect(button.messages[0]).toMatchObject({ type: "reply", replyId: "menu:main" });
    expect(list.messages[0]).toMatchObject({ type: "reply", replyId: "learn:gcoin" });
    expect(template.messages[0]).toMatchObject({ type: "reply", replyId: "guide:activate_agent" });
  });

  it("marks media as unsupported and ignores non-WhatsApp payloads", () => {
    expect(parseWebhook(envelope({ type: "image", image: { id: "x" } })).messages[0]).toMatchObject({ type: "unsupported", rawType: "image" });
    expect(parseWebhook({ object: "page" }).messages).toEqual([]);
    expect(parseWebhook(null).messages).toEqual([]);
  });

  it("extracts delivery statuses", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.9", status: "failed", recipient_id: "1", errors: [{ code: 131026 }] }] } }] }],
    };
    expect(parseWebhook(body).statuses).toEqual([{ messageId: "wamid.9", status: "failed", recipient: "1", errors: [{ code: 131026 }] }]);
  });
});

describe("signatures", () => {
  it("accepts a valid HMAC and rejects tampering", () => {
    const body = Buffer.from('{"a":1}');
    const header = sign(body, "secret");
    expect(verifySignature(body, header, "secret")).toBe(true);
    expect(verifySignature(Buffer.from('{"a":2}'), header, "secret")).toBe(false);
    expect(verifySignature(body, header, "other")).toBe(false);
    expect(verifySignature(body, undefined, "secret")).toBe(false);
    expect(verifySignature(body, "sha256=short", "secret")).toBe(false);
  });
});

describe("Cloud API payloads", () => {
  it("builds interactive CTA, list and template payloads", () => {
    expect(toCloudPayload({ kind: "cta", body: "Hi", cta: { label: "Open", url: "https://x.test" } })).toEqual({
      type: "interactive",
      interactive: { type: "cta_url", body: { text: "Hi" }, action: { name: "cta_url", parameters: { display_text: "Open", url: "https://x.test" } } },
    });
    const template = toCloudPayload({
      kind: "template",
      name: "boss_agent_activate_1",
      language: "en",
      bodyParams: ["Ana Arena"],
      buttonParams: [
        { type: "url", index: 0, suffix: "ai-agent/activate?utm_source=whatsapp" },
        { type: "quick_reply", index: 1, payload: "learn:ai_autopilot" },
      ],
    });
    expect(template).toEqual({
      type: "template",
      template: {
        name: "boss_agent_activate_1",
        language: { code: "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: "Ana Arena" }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "ai-agent/activate?utm_source=whatsapp" }] },
          { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: "learn:ai_autopilot" }] },
        ],
      },
    });
  });

  it("validator flags limit violations", () => {
    expect(validateMessage({ kind: "buttons", body: "x", buttons: [{ id: "a", title: "This title is far too long" }] })).toHaveLength(1);
    expect(
      validateMessage({ kind: "list", body: "x", buttonLabel: "Go", sections: [{ title: "S", rows: Array.from({ length: 11 }, (_, i) => ({ id: `r${i}`, title: "t" })) }] }),
    ).toHaveLength(1);
    expect(validateMessage({ kind: "template", name: "ok_name", language: "en", bodyParams: ["two\nlines"], buttonParams: [] })).toHaveLength(1);
  });
});
