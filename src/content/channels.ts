/**
 * Marketing channels a Boss can open for their brand, in the order the coach opens them:
 * the free, personal ones first (status, groups), then the public ones the AI Marketing
 * Agent can post to. The coach always names the *next* channel and walks the Boss through
 * opening it (guide), so reach grows one channel at a time.
 */
import type { CoachState } from "../coach/types.js";
import type { ContentCtx } from "./context.js";
import type { GuideId } from "./guides.js";

export type ChannelId = "whatsapp_status" | "whatsapp_groups" | "instagram" | "tiktok" | "telegram" | "facebook";

export interface ChannelDef {
  id: ChannelId;
  emoji: string;
  name: string;
  /** One line: what this channel does for the brand. */
  why: string;
  /** Step-by-step guide that opens the channel (none for channels everyone already has). */
  guide?: GuideId;
  /** Mission whose completion means the channel is in use. */
  mission?: string;
  /** Social network id as the AI Agent reports it (connected = the Agent posts there). */
  social?: string;
}

export const CHANNELS: ChannelDef[] = [
  { id: "whatsapp_status", emoji: "💬", name: "WhatsApp status", why: "Everyone who has your number sees it. Free reach, every day.", mission: "share_status" },
  { id: "whatsapp_groups", emoji: "👥", name: "WhatsApp groups", why: "People who know you are the most likely to join.", mission: "share_groups" },
  { id: "instagram", emoji: "📸", name: "Instagram", why: "Stories + link in bio: every visit can become a player.", guide: "open_instagram", social: "instagram" },
  { id: "tiktok", emoji: "🎵", name: "TikTok", why: "Reaches people who don't know you yet.", guide: "open_tiktok", social: "tiktok" },
  { id: "telegram", emoji: "✈️", name: "Telegram channel", why: "Your own channel: your players hear from you first.", guide: "open_telegram" },
  { id: "facebook", emoji: "📘", name: "Facebook groups", why: "Local and interest groups full of potential players.", guide: "facebook_groups", social: "facebook" },
];

export type ChannelStatus = "autopilot" | "open" | "not_yet";

/** autopilot = the AI Agent posts there; open = the Boss told us they use it. */
export function channelStatus(ch: ChannelDef, ctx: ContentCtx, state: CoachState): ChannelStatus {
  if (ch.social && ctx.boss.aiAgent.connectedSocials.includes(ch.social)) return "autopilot";
  return state.channels[ch.id] ? "open" : "not_yet";
}

/** The next channel to open: the first one not in use that has a guide. */
export function nextChannel(ctx: ContentCtx, state: CoachState): ChannelDef | null {
  return CHANNELS.find((c) => c.guide && channelStatus(c, ctx, state) === "not_yet") ?? null;
}

export function getChannel(id: string): ChannelDef | undefined {
  return CHANNELS.find((c) => c.id === id);
}

/** "✅ 💬 WhatsApp status" lines for the channels screen. */
export function channelLines(ctx: ContentCtx, state: CoachState): string[] {
  return CHANNELS.map((c) => {
    const s = channelStatus(c, ctx, state);
    const mark = s === "autopilot" ? "🤖" : s === "open" ? "✅" : "⬜";
    const note = s === "autopilot" ? " · your AI Agent posts here" : "";
    return `${mark} ${c.emoji} ${c.name}${note}`;
  });
}
