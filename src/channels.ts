/**
 * The bot runs on several channels. Everywhere else in the code a recipient is just an
 * address string: a WhatsApp number ("5511999998888") or a Telegram chat ("tg:123456789").
 */
import type { BossState } from "./store/store.js";
import type { ChannelName, Messenger, OutboundMessage, SendResult } from "./whatsapp/types.js";

const TG = "tg:";

export function telegramAddress(chatId: string): string {
  return `${TG}${chatId}`;
}

export function channelOf(address: string): ChannelName {
  return address.startsWith(TG) ? "telegram" : "whatsapp";
}

/** Where to reach this Boss right now: the channel they last used (if it's available). */
export function bossAddress(state: BossState, phone: string, telegramEnabled: boolean): string {
  if (state.channel === "telegram" && state.telegramChatId && telegramEnabled) return telegramAddress(state.telegramChatId);
  return phone;
}

/** Routes each message to the right channel's messenger. */
export class ChannelMessenger implements Messenger {
  constructor(private readonly channels: { whatsapp: Messenger; telegram?: Messenger }) {}

  get telegramEnabled(): boolean {
    return !!this.channels.telegram;
  }

  async send(to: string, message: OutboundMessage): Promise<SendResult> {
    if (channelOf(to) === "telegram") {
      if (!this.channels.telegram) throw new Error("Telegram is not configured");
      return this.channels.telegram.send(to.slice(TG.length), message);
    }
    return this.channels.whatsapp.send(to, message);
  }

  async markRead(messageId: string, from?: string): Promise<void> {
    if (from && channelOf(from) === "telegram") return this.channels.telegram?.markRead(messageId, from.slice(TG.length));
    return this.channels.whatsapp.markRead(messageId, from);
  }
}
