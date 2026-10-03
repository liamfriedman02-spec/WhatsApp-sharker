import type { ContentCtx } from "./context.js";

export const LINK_PLACEHOLDER = "[your brand link]";

/** Ready-to-post texts when the AI writer is unavailable ("{link}" = brand link). */
export function fallbackPosts(ctx: ContentCtx): string[] {
  const b = ctx.boss.brandName;
  const tag = b.replace(/[^\p{L}\p{N}]/gu, "");
  return [
    `🔥 *${b}* is live! Come join me 👉 {link}`,
    `Big news: ${b} is officially live 🎉 I built it for us — come join me through the link in my bio. See you inside! #${tag}`,
    `POV: you finally launch your own brand 👑 ${b} is live — link in bio. Who's joining me first? 👇`,
  ];
}
