/**
 * SUPPORT — step-by-step guides. The bot sends one step at a time with
 * [✅ Done] [😕 I'm stuck] buttons, and when possible verifies completion against the
 * Boss's live data before celebrating.
 */
import type { BossProfile } from "../platform/types.js";
import { agentStage } from "../platform/types.js";
import type { CtaId } from "./links.js";

export type GuideId =
  | "activate_agent"
  | "connect_socials"
  | "share_link"
  | "setup_payouts"
  | "open_instagram"
  | "open_tiktok"
  | "open_telegram"
  | "facebook_groups";

export interface GuideStep {
  text: string;
  cta?: CtaId;
}

export interface Guide {
  id: GuideId;
  title: string;
  intro: string;
  steps: GuideStep[];
  /** When present, checked after the last step; false → "I don't see it yet". */
  verify?: (boss: BossProfile) => boolean;
  /** Skip this guide (and go to `next`) when the Boss already did it. */
  alreadyDone?: (boss: BossProfile) => boolean;
  success: string;
  /** Guide to continue with after success. */
  next?: GuideId;
  /** Finishing this guide opens this marketing channel (recorded for the Boss). */
  channel?: "instagram" | "tiktok" | "telegram" | "facebook";
}

export const GUIDES: Record<GuideId, Guide> = {
  activate_agent: {
    id: "activate_agent",
    title: "Activate your AI Agent",
    intro: "Let's activate your AI Marketing Agent together. It takes about a minute. 🤖",
    steps: [
      { text: "*Step 1*: Open your Boss Hub on the AI Agent page.", cta: "agent_activate" },
      { text: "*Step 2*: Tap *Activate* and follow the short setup (your brand details are already filled in)." },
    ],
    verify: (b) => b.aiAgent.activated,
    alreadyDone: (b) => b.aiAgent.activated,
    success: "🎉 Your AI Agent is active! One more step and it starts marketing *your* brand for you.",
    next: "connect_socials",
  },
  connect_socials: {
    id: "connect_socials",
    title: "Connect your socials",
    intro: "Now let's connect your social accounts so your Agent can post for you. 🔗",
    steps: [
      { text: "*Step 1*: Open your Boss Hub → AI Agent → *Connected accounts*.", cta: "agent_socials" },
      { text: "*Step 2*: Pick a network (for example Instagram or TikTok) and log in to allow your Agent to post." },
      { text: "*Step 3*: Repeat for every account you want your Agent to post on. More accounts = more reach." },
    ],
    verify: (b) => agentStage(b) === "live",
    alreadyDone: (b) => agentStage(b) === "live",
    success: "🚀 Your AI Agent is live! It's now creating and publishing content for your brand. Automatically.",
  },
  share_link: {
    id: "share_link",
    title: "Share your brand link",
    intro: "Let's get players to *your* brand. Do these 3 things today. 👥",
    steps: [
      { text: "*Step 1*: Open your Boss Hub → My Brand and copy your brand link.", cta: "brand_link" },
      { text: "*Step 2*: Post your link on your WhatsApp status and send it to 3 groups where people know you." },
      { text: "*Step 3*: Add the link to your Instagram/TikTok bio and share one post about your brand." },
    ],
    success: "💪 Great work! Every share brings your next player closer. I'll tell you when new players join.",
  },
  setup_payouts: {
    id: "setup_payouts",
    title: "Set up your payouts",
    intro: "Let's make sure *your earnings* can reach you. 💳",
    steps: [
      { text: "*Step 1*: Open your Boss Hub → Earnings → *Payouts*.", cta: "payouts" },
      { text: "*Step 2*: Choose your payout method and add your details." },
      { text: "*Step 3*: Save and double-check the details. Wrong details are the #1 cause of delayed payouts." },
    ],
    verify: (b) => b.payouts.methodConfigured,
    alreadyDone: (b) => b.payouts.methodConfigured,
    success: "✅ Your payout method is set. Your earnings are ready to reach you.",
  },

  // ── Marketing channels ────────────────────────────────────────────────────
  open_instagram: {
    id: "open_instagram",
    title: "Open Instagram for your brand",
    intro: "Let's open Instagram for your brand. 10 minutes, and every profile visit can become a player. 📸",
    steps: [
      { text: "*Step 1*: In Instagram, create a new account (or use yours) named after your brand. Use your brand name as the display name." },
      { text: "*Step 2*: Copy your brand link from Boss Hub → My Brand and paste it in your bio. Write one line: what your brand is and why people should join.", cta: "brand_link" },
      { text: "*Step 3*: Post your first story: say you launched your brand and add the link sticker. Then follow 20 people you know so they see it." },
    ],
    alreadyDone: (b) => b.aiAgent.connectedSocials.includes("instagram"),
    success: "📸 Instagram is open for your brand! Connect it to your AI Agent and it posts there for you, every day.",
    next: "connect_socials",
    channel: "instagram",
  },
  open_tiktok: {
    id: "open_tiktok",
    title: "Open TikTok for your brand",
    intro: "TikTok reaches people who don't know you yet. Let's open it for your brand, 10 minutes. 🎵",
    steps: [
      { text: "*Step 1*: In TikTok, create an account named after your brand (or use yours and switch to a Business account in Settings)." },
      { text: "*Step 2*: Add your brand link to your bio (Business accounts can add a link). Write one line about your brand.", cta: "brand_link" },
      { text: "*Step 3*: Post a 10-second video: your face, 'I just launched my own brand, link in bio'. Real beats polished." },
    ],
    alreadyDone: (b) => b.aiAgent.connectedSocials.includes("tiktok"),
    success: "🎵 TikTok is open for your brand! Connect it to your AI Agent so it keeps posting for you.",
    next: "connect_socials",
    channel: "tiktok",
  },
  open_telegram: {
    id: "open_telegram",
    title: "Open a Telegram channel",
    intro: "Your own Telegram channel is where your players hear from you first. Let's open it, 5 minutes. ✈️",
    steps: [
      { text: "*Step 1*: In Telegram: New message → New Channel. Name it after your brand and make it public with a short link." },
      { text: "*Step 2*: Put your brand link in the channel description and pin a welcome post with it.", cta: "brand_link" },
      { text: "*Step 3*: Invite your players and share the channel link on your WhatsApp status." },
    ],
    success: "✈️ Your Telegram channel is live! Post there whenever there's news for your players.",
    channel: "telegram",
  },
  facebook_groups: {
    id: "facebook_groups",
    title: "Use Facebook groups",
    intro: "Facebook groups are full of people near you and people who share your interests. Let's use them the right way. 📘",
    steps: [
      { text: "*Step 1*: Join 3 groups where your brand fits: your city or neighborhood, a hobby you share, and one you're already active in." },
      { text: "*Step 2*: Read each group's rules. Where posting a link is allowed, post a personal message about your brand with your link.", cta: "brand_link" },
      { text: "*Step 3*: Where links aren't allowed, join the conversation first and invite people privately. Personal beats spam, always." },
    ],
    alreadyDone: (b) => b.aiAgent.connectedSocials.includes("facebook"),
    success: "📘 You're in! Keep it personal in the groups and the players will come.",
    channel: "facebook",
  },
};

export function getGuide(id: string): Guide | undefined {
  return (GUIDES as Record<string, Guide>)[id];
}
