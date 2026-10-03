import type { Logger } from "../logger.js";
import type { Messenger, OutboundMessage, SendResult } from "../whatsapp/types.js";
import { retag, toTelegramHtml } from "./format.js";

type Json = Record<string, unknown>;

/** Minimal Telegram Bot API client (https://core.telegram.org/bots/api). */
export class TelegramApi {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly token: string,
    private readonly logger: Logger,
    fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async call<T = unknown>(method: string, body: Json = {}, timeoutMs = 15_000): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const res = await this.fetchImpl(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const json = (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as {
        ok: boolean;
        result?: T;
        description?: string;
        parameters?: { retry_after?: number };
      };
      if (json.ok) return json.result as T;
      const retryAfter = json.parameters?.retry_after;
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((r) => setTimeout(r, (retryAfter ?? attempt) * 1000));
        continue;
      }
      // Never include the URL in errors: it contains the bot token.
      throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    }
  }

  setWebhook(url: string, secretToken: string): Promise<boolean> {
    return this.call("setWebhook", { url, secret_token: secretToken, allowed_updates: ["message", "callback_query"] });
  }

  deleteWebhook(): Promise<boolean> {
    return this.call("deleteWebhook", { drop_pending_updates: false });
  }

  setCommands(commands: { command: string; description: string }[]): Promise<boolean> {
    return this.call("setMyCommands", { commands });
  }

  answerCallback(callbackQueryId: string): Promise<boolean> {
    return this.call("answerCallbackQuery", { callback_query_id: callbackQueryId });
  }

  getUpdates(offset: number, timeoutSec: number): Promise<unknown[]> {
    return this.call("getUpdates", { offset, timeout: timeoutSec, allowed_updates: ["message", "callback_query"] }, (timeoutSec + 10) * 1000);
  }
}

/** Sends our channel-agnostic messages as Telegram messages with inline buttons. */
export class TelegramMessenger implements Messenger {
  constructor(
    private readonly api: TelegramApi,
    private readonly logger: Logger,
  ) {}

  async send(chatId: string, message: OutboundMessage): Promise<SendResult> {
    const payload = toTelegramPayload(message);
    const result = await this.api.call<{ message_id: number }>("sendMessage", { chat_id: chatId, ...payload });
    return { messageId: String(result.message_id) };
  }

  async markRead(_messageId: string, chatId?: string): Promise<void> {
    if (!chatId) return;
    try {
      await this.api.call("sendChatAction", { chat_id: chatId, action: "typing" });
    } catch (err) {
      this.logger.debug("telegram typing failed", { err });
    }
  }
}

const TEXT_LIMIT = 4096;

/** Translates our message model into a Telegram sendMessage payload (without chat_id). */
export function toTelegramPayload(message: OutboundMessage): Json {
  const html = (parts: (string | undefined)[]) =>
    parts
      .filter((p): p is string => !!p)
      .join("\n\n")
      .slice(0, TEXT_LIMIT);
  const base = { parse_mode: "HTML", link_preview_options: { is_disabled: true } };

  switch (message.kind) {
    case "text":
      // Plain messages also clear any "share my phone" keyboard left on screen.
      return { ...base, text: html([toTelegramHtml(message.text)]), reply_markup: { remove_keyboard: true } };
    case "contact_request":
      return {
        ...base,
        text: html([toTelegramHtml(message.body)]),
        reply_markup: {
          keyboard: [[{ text: message.buttonLabel, request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      };
    case "buttons":
      return {
        ...base,
        text: html([header(message.header), toTelegramHtml(message.body), footer(message.footer)]),
        reply_markup: { inline_keyboard: message.buttons.map((b) => [{ text: b.title, callback_data: b.id }]) },
      };
    case "list": {
      // WhatsApp collapses a list behind one button; Telegram shows every row. Long lists go two
      // per line so the screen isn't a wall of buttons.
      const rows = message.sections.flatMap((s) => s.rows.map((r) => ({ text: r.title, callback_data: r.id })));
      return {
        ...base,
        text: html([header(message.header), toTelegramHtml(message.body), footer(message.footer)]),
        reply_markup: { inline_keyboard: rows.length > 4 ? grid(rows, 2) : rows.map((r) => [r]) },
      };
    }
    case "cta":
      return {
        ...base,
        text: html([header(message.header), toTelegramHtml(message.body), footer(message.footer)]),
        reply_markup: { inline_keyboard: [[{ text: message.cta.label, url: retag(message.cta.url) }]] },
      };
    case "template":
      // WhatsApp templates exist only for WhatsApp's 24h rule; Telegram always gets the interactive version.
      throw new Error("WhatsApp templates can't be sent on Telegram");
  }
}

function grid<T>(items: T[], perRow: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) out.push(items.slice(i, i + perRow));
  return out;
}

function header(text?: string): string | undefined {
  return text ? `<b>${toTelegramHtml(text)}</b>` : undefined;
}

function footer(text?: string): string | undefined {
  return text ? `<i>${toTelegramHtml(text)}</i>` : undefined;
}
