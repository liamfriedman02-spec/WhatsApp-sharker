/**
 * Channel-agnostic outbound message model. The Cloud API messenger translates these
 * into WhatsApp payloads; the console messenger prints them for local testing.
 */
export interface Button {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface CtaLink {
  label: string;
  url: string;
}

export type TemplateButtonParam =
  | { type: "url"; index: number; suffix: string }
  | { type: "quick_reply"; index: number; payload: string };

export type OutboundMessage =
  | { kind: "text"; text: string; previewUrl?: boolean }
  /** Telegram only: asks the user to share their own phone number (to link their Boss account). */
  | { kind: "contact_request"; body: string; buttonLabel: string }
  | { kind: "buttons"; body: string; header?: string; footer?: string; buttons: Button[] }
  | { kind: "list"; body: string; header?: string; footer?: string; buttonLabel: string; sections: ListSection[] }
  | { kind: "cta"; body: string; header?: string; footer?: string; cta: CtaLink }
  | { kind: "template"; name: string; language: string; bodyParams: string[]; buttonParams: TemplateButtonParam[] };

export interface SendResult {
  messageId: string | null;
}

/** Messaging channels the bot runs on. */
export type ChannelName = "whatsapp" | "telegram";

/**
 * Sends messages to an address: a WhatsApp number ("5511999998888") or a Telegram chat
 * ("tg:123456789"). See src/channels.ts.
 */
export interface Messenger {
  send(to: string, message: OutboundMessage): Promise<SendResult>;
  /** Marks an inbound message as read and shows the typing indicator while the bot works. */
  markRead(messageId: string, from?: string): Promise<void>;
}

/** WhatsApp Cloud API limits for interactive messages. */
export const LIMITS = {
  textBody: 4096,
  interactiveBody: 1024,
  header: 60,
  footer: 60,
  buttonTitle: 20,
  buttonId: 256,
  maxButtons: 3,
  listButtonLabel: 20,
  rowTitle: 24,
  rowDescription: 72,
  rowId: 200,
  maxRows: 10,
  sectionTitle: 24,
  ctaLabel: 20,
  /** Telegram inline-button callback_data limit (bytes); every button/row id must fit. */
  telegramCallbackData: 64,
} as const;

/** Normalized inbound message (WhatsApp webhook or Telegram update). */
export interface InboundMessage {
  /** Defaults to "whatsapp". */
  channel?: ChannelName;
  messageId: string;
  /** WhatsApp: the sender's number. Telegram: the private chat id. */
  from: string;
  timestamp: Date;
  profileName?: string;
  /**
   * "text" for typed input; "reply" when the Boss tapped a button/list row/template quick reply;
   * "contact" when a Telegram user shared their own phone number.
   */
  type: "text" | "reply" | "contact" | "unsupported";
  /** Telegram: the user's own phone number, shared with the "Share my phone number" button. */
  contactPhone?: string;
  text?: string;
  /** Stable id of the tapped button/row, e.g. "learn:gcoin". */
  replyId?: string;
  replyTitle?: string;
  /** Original WhatsApp type for unsupported messages (image, audio, sticker…). */
  rawType?: string;
}
