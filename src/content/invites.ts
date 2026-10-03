/**
 * Ready-to-send personal texts: invitations for each kind of audience, a welcome for new
 * players, a "bring a friend" ask and a gentle follow-up. Personal invites from someone
 * you know are what bring a brand's first players, so the bot writes them and the Boss
 * only forwards. "{link}" marks the brand link.
 *
 * Honest by design: no promised winnings, bonuses or money.
 */
import type { ContentCtx } from "./context.js";

export type AudienceId = "family" | "friends" | "work" | "community" | "online";

export interface Audience {
  id: AudienceId;
  /** List row title (≤ 24 chars). */
  title: string;
  /** List row description (≤ 72 chars). */
  description: string;
  /** Words that identify this audience when the Boss types freely. */
  keywords: string[];
  invite: (ctx: ContentCtx) => string;
}

const LINK = "{link}";

export const AUDIENCES: Audience[] = [
  {
    id: "family",
    title: "👨‍👩‍👧 Family",
    description: "Parents, siblings, cousins — people who root for you",
    keywords: ["family", "parents", "mom", "dad", "brother", "sister", "cousin", "cousins", "uncle", "aunt", "relatives", "familia", "família"],
    invite: (c) =>
      `Hey! 👋 Big news: I just launched my own brand, *${c.boss.brandName}*. It's something I'm building myself and I'd love to have you in it from day one. Join here, it takes a minute: ${LINK}\nTell me when you're in! 🙏`,
  },
  {
    id: "friends",
    title: "🧑‍🤝‍🧑 Friends",
    description: "Close friends and people you chat with every week",
    keywords: ["friend", "friends", "buddies", "mates", "bestie", "besties", "amigos", "amigas", "pals"],
    invite: (c) =>
      `Yo! 🔥 I finally did it: I launched my own brand, *${c.boss.brandName}*. You're one of the first people I'm telling. Come join me here: ${LINK}\nIt's quick, and it means a lot to have you in. Let me know when you're in 😄`,
  },
  {
    id: "work",
    title: "💼 Work & studies",
    description: "Colleagues, classmates, your study or work group",
    keywords: ["work", "colleague", "colleagues", "coworker", "coworkers", "office", "job", "class", "classmates", "school", "university", "college", "students", "trabalho", "trabajo"],
    invite: (c) =>
      `Hi! Quick one 🙂 Outside of work I've started my own project: *${c.boss.brandName}*. It just went live and I'm inviting people I know first. If you're curious, here's the link: ${LINK}\nHappy to tell you more over coffee ☕`,
  },
  {
    id: "community",
    title: "🏟️ Groups & clubs",
    description: "Your team, gym, neighborhood or hobby group",
    keywords: ["group", "groups", "team", "club", "gym", "football", "soccer", "basketball", "neighbors", "neighborhood", "church", "community", "whatsapp group", "grupo", "grupos", "time", "equipo"],
    invite: (c) =>
      `Hey everyone! 👋 Something personal: I just launched my own brand, *${c.boss.brandName}*. I built it and I'm proud of it, so I'm sharing it with you first. Here's the link if you want to check it out: ${LINK}\nAnyone who joins, send me a message, I want to know you're in 🙌`,
  },
  {
    id: "online",
    title: "📱 Followers",
    description: "People who follow you on Instagram, TikTok or elsewhere",
    keywords: ["followers", "instagram", "tiktok", "online", "audience", "subscribers", "story", "stories", "social", "socials", "seguidores"],
    invite: (c) =>
      `It's official 🎉 *${c.boss.brandName}* is live. I built this for us, and the first people in are the ones who've been here from the start. Link in my bio (or right here): ${LINK}\nDM me when you join, I'll see you inside 👀`,
  },
];

export const AUDIENCE_IDS = AUDIENCES.map((a) => a.id);

export function getAudience(id: string): Audience | undefined {
  return AUDIENCES.find((a) => a.id === id);
}

/** Audiences mentioned in free text ("my football group and some cousins" → community, family). */
export function matchAudiences(text: string): Audience[] {
  const n = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
  return AUDIENCES.filter((a) => a.keywords.some((k) => n.includes(` ${k} `)));
}

/** Text the Boss sends to a player who just joined (keeps them playing: activity is earnings). */
export function welcomeText(ctx: ContentCtx): string {
  return `Welcome to *${ctx.boss.brandName}*! 🎉 So happy you're in. If anything is unclear, just message me, I'm right here. Have fun, and tell me what you think after your first game 😄`;
}

/** Text the Boss sends to an active player, asking them to bring a friend. */
export function referralText(ctx: ContentCtx): string {
  return `Hey! Thanks for being part of *${ctx.boss.brandName}* 🙏 Quick favor: do you know one person who'd enjoy it too? Send them this link: ${LINK}\nIt helps me a lot, and it's more fun with people you know 😉`;
}

/** Gentle second touch for people who got the invite and didn't answer. */
export function followUpText(ctx: ContentCtx): string {
  return `Hey 🙂 I sent you my *${ctx.boss.brandName}* link a few days ago, no pressure at all! If you want to take a look, it's here: ${LINK}\nAnd if it's not for you, all good 🙌`;
}

/** Text the Boss sends to a player who hasn't played this week. */
export function comebackText(ctx: ContentCtx): string {
  return `Hey! Haven't seen you around *${ctx.boss.brandName}* this week 👀 Everything okay? Come back for a round when you have a minute, I'd love to have you back: ${LINK}`;
}

/** Replaces {link} with the Boss's brand link, or a visible placeholder. */
export function withLink(text: string, ctx: ContentCtx): string {
  return text.replaceAll(LINK, ctx.boss.brandUrl || "[your brand link]");
}
