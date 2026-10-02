import type { Logger } from "../logger.js";
import { LIMITS, type Messenger, type OutboundMessage, type SendResult } from "./types.js";

export interface CloudApiOptions {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  logger: Logger;
  fetchImpl?: typeof fetch;
}

/** Messenger backed by the WhatsApp Cloud API (graph.facebook.com). */
export class CloudApiMessenger implements Messenger {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: CloudApiOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async send(to: string, message: OutboundMessage): Promise<SendResult> {
    const payload = { messaging_product: "whatsapp", recipient_type: "individual", to, ...toCloudPayload(message) };
    const json = (await this.post(payload)) as { messages?: { id: string }[] };
    return { messageId: json.messages?.[0]?.id ?? null };
  }

  async markRead(messageId: string): Promise<void> {
    try {
      await this.post({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      });
    } catch (err) {
      // Read receipts are cosmetic; never fail a conversation because of them.
      this.opts.logger.debug("markRead failed", { err });
    }
  }

  private async post(body: unknown): Promise<unknown> {
    const url = `https://graph.facebook.com/${this.opts.apiVersion}/${this.opts.phoneNumberId}/messages`;
    for (let attempt = 1; ; attempt++) {
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: { authorization: `Bearer ${this.opts.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return res.json();
      const text = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      throw new Error(`WhatsApp API ${res.status}: ${text}`);
    }
  }
}

/** Translates our message model into a Cloud API `messages` payload (without recipient fields). */
export function toCloudPayload(message: OutboundMessage): Record<string, unknown> {
  switch (message.kind) {
    case "text":
      return { type: "text", text: { body: clip(message.text, LIMITS.textBody), preview_url: message.previewUrl ?? false } };
    case "contact_request":
      // Telegram-only concept; on WhatsApp we already know the number.
      return { type: "text", text: { body: clip(message.body, LIMITS.textBody), preview_url: false } };
    case "buttons":
      return {
        type: "interactive",
        interactive: {
          type: "button",
          ...headerFooter(message.header, message.footer),
          body: { text: clip(message.body, LIMITS.interactiveBody) },
          action: {
            buttons: message.buttons.slice(0, LIMITS.maxButtons).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: clip(b.title, LIMITS.buttonTitle) },
            })),
          },
        },
      };
    case "list":
      return {
        type: "interactive",
        interactive: {
          type: "list",
          ...headerFooter(message.header, message.footer),
          body: { text: clip(message.body, LIMITS.interactiveBody) },
          action: {
            button: clip(message.buttonLabel, LIMITS.listButtonLabel),
            sections: message.sections.map((s) => ({
              title: clip(s.title, LIMITS.sectionTitle),
              rows: s.rows.map((r) => ({
                id: r.id,
                title: clip(r.title, LIMITS.rowTitle),
                ...(r.description ? { description: clip(r.description, LIMITS.rowDescription) } : {}),
              })),
            })),
          },
        },
      };
    case "cta":
      return {
        type: "interactive",
        interactive: {
          type: "cta_url",
          ...headerFooter(message.header, message.footer),
          body: { text: clip(message.body, LIMITS.interactiveBody) },
          action: {
            name: "cta_url",
            parameters: { display_text: clip(message.cta.label, LIMITS.ctaLabel), url: message.cta.url },
          },
        },
      };
    case "template": {
      const components: Record<string, unknown>[] = [];
      if (message.bodyParams.length > 0) {
        components.push({
          type: "body",
          parameters: message.bodyParams.map((text) => ({ type: "text", text })),
        });
      }
      for (const b of message.buttonParams) {
        components.push(
          b.type === "url"
            ? { type: "button", sub_type: "url", index: String(b.index), parameters: [{ type: "text", text: b.suffix }] }
            : { type: "button", sub_type: "quick_reply", index: String(b.index), parameters: [{ type: "payload", payload: b.payload }] },
        );
      }
      return {
        type: "template",
        template: { name: message.name, language: { code: message.language }, components },
      };
    }
  }
}

function headerFooter(header?: string, footer?: string): Record<string, unknown> {
  return {
    ...(header ? { header: { type: "text", text: clip(header, LIMITS.header) } } : {}),
    ...(footer ? { footer: { text: clip(footer, LIMITS.footer) } } : {}),
  };
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}
