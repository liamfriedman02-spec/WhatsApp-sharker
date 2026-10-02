import type { InboundMessage } from "../whatsapp/types.js";

interface TgUser {
  id: number;
  first_name?: string;
}

interface TgMessage {
  message_id: number;
  date: number;
  chat: { id: number; type: string };
  from?: TgUser;
  text?: string;
  contact?: { phone_number: string; user_id?: number };
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: { id: string; from: TgUser; data?: string; message?: TgMessage };
}

export interface ParsedUpdate {
  message: InboundMessage | null;
  /** Must be answered so the button stops spinning in the Boss's app. */
  callbackQueryId?: string;
}

/** Converts a Telegram update into our inbound message (private chats only). */
export function parseTelegramUpdate(update: TgUpdate): ParsedUpdate {
  const base = (chatId: number, date: number, from?: TgUser) => ({
    channel: "telegram" as const,
    messageId: `tg:${update.update_id}`,
    from: String(chatId),
    timestamp: new Date(date * 1000),
    profileName: from?.first_name,
  });

  const cb = update.callback_query;
  if (cb) {
    const msg = cb.message;
    if (!msg || msg.chat.type !== "private" || !cb.data) return { message: null, callbackQueryId: cb.id };
    return {
      message: { ...base(msg.chat.id, Math.floor(Date.now() / 1000), cb.from), type: "reply", replyId: cb.data },
      callbackQueryId: cb.id,
    };
  }

  const m = update.message;
  if (!m || m.chat.type !== "private") return { message: null };

  if (m.contact) {
    // Only accept the user's *own* number (Telegram's "share my phone" button sets user_id to the sender).
    const own = !!m.from && m.contact.user_id === m.from.id;
    return {
      message: { ...base(m.chat.id, m.date, m.from), type: "contact", contactPhone: own ? m.contact.phone_number.replace(/\D/g, "") : undefined },
    };
  }
  if (typeof m.text === "string") {
    // "/start" (Telegram's Start button) opens the menu; other "/commands" become plain commands.
    const text = /^\/start(\s|@|$)/.test(m.text) ? "menu" : m.text.replace(/^\/(\w+)(@\w+)?/, "$1");
    return { message: { ...base(m.chat.id, m.date, m.from), type: "text", text } };
  }
  return { message: { ...base(m.chat.id, m.date, m.from), type: "unsupported", rawType: "media" } };
}
