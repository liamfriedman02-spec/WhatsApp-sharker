import { createHmac, timingSafeEqual } from "node:crypto";
import type { InboundMessage } from "./types.js";

/** Verifies an `X-Hub-Signature-256` / `X-Sharker-Signature` style header: "sha256=<hex hmac of raw body>". */
export function verifySignature(rawBody: Buffer, header: string | undefined, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(header.slice("sha256=".length), "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function sign(rawBody: Buffer | string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

interface CloudWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { payload: string; text: string };
}

interface CloudWebhookBody {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: CloudWebhookMessage[];
        statuses?: { id: string; status: string; recipient_id: string; errors?: unknown[] }[];
      };
    }[];
  }[];
}

export interface DeliveryStatus {
  messageId: string;
  status: string;
  recipient: string;
  errors?: unknown[];
}

/** Extracts inbound messages and delivery statuses from a Cloud API webhook body. */
export function parseWebhook(body: unknown): { messages: InboundMessage[]; statuses: DeliveryStatus[] } {
  const messages: InboundMessage[] = [];
  const statuses: DeliveryStatus[] = [];
  const b = body as CloudWebhookBody;
  if (b?.object !== "whatsapp_business_account") return { messages, statuses };

  for (const entry of b.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of value.messages ?? []) {
        messages.push(normalize(m, names.get(m.from)));
      }
      for (const s of value.statuses ?? []) {
        statuses.push({ messageId: s.id, status: s.status, recipient: s.recipient_id, errors: s.errors });
      }
    }
  }
  return { messages, statuses };
}

function normalize(m: CloudWebhookMessage, profileName?: string): InboundMessage {
  const base = {
    messageId: m.id,
    from: m.from,
    timestamp: new Date(Number(m.timestamp) * 1000),
    profileName,
  };
  if (m.type === "text" && m.text) {
    return { ...base, type: "text", text: m.text.body };
  }
  if (m.type === "interactive" && m.interactive) {
    const reply = m.interactive.button_reply ?? m.interactive.list_reply;
    if (reply) return { ...base, type: "reply", replyId: reply.id, replyTitle: reply.title };
  }
  if (m.type === "button" && m.button) {
    // Quick-reply button on a template message.
    return { ...base, type: "reply", replyId: m.button.payload, replyTitle: m.button.text };
  }
  return { ...base, type: "unsupported", rawType: m.type };
}
