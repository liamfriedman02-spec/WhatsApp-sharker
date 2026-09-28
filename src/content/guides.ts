/**
 * SUPPORT — step-by-step guides. The bot sends one step at a time with
 * [✅ Done] [😕 I'm stuck] buttons, and when possible verifies completion against the
 * Boss's live data before celebrating.
 */
import type { BossProfile } from "../platform/types.js";
import { agentStage } from "../platform/types.js";
import type { CtaId } from "./links.js";

export type GuideId = "activate_agent" | "connect_socials" | "share_link" | "setup_payouts";

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
}

export const GUIDES: Record<GuideId, Guide> = {
  activate_agent: {
    id: "activate_agent",
    title: "Activate your AI Agent",
    intro: "Let's activate your AI Marketing Agent together. It takes about a minute. 🤖",
    steps: [
      { text: "*Step 1* — Open your Boss Hub on the AI Agent page.", cta: "agent_activate" },
      { text: "*Step 2* — Tap *Activate* and follow the short setup (your brand details are already filled in)." },
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
      { text: "*Step 1* — Open your Boss Hub → AI Agent → *Connected accounts*.", cta: "agent_socials" },
      { text: "*Step 2* — Pick a network (for example Instagram or TikTok) and log in to allow your Agent to post." },
      { text: "*Step 3* — Repeat for every account you want your Agent to post on. More accounts = more reach." },
    ],
    verify: (b) => agentStage(b) === "live",
    alreadyDone: (b) => agentStage(b) === "live",
    success: "🚀 Your AI Agent is live! It's now creating and publishing content for your brand — automatically.",
  },
  share_link: {
    id: "share_link",
    title: "Share your brand link",
    intro: "Let's get players to *your* brand. Do these 3 things today. 👥",
    steps: [
      { text: "*Step 1* — Open your Boss Hub → My Brand and copy your brand link.", cta: "brand_link" },
      { text: "*Step 2* — Post your link on your WhatsApp status and send it to 3 groups where people know you." },
      { text: "*Step 3* — Add the link to your Instagram/TikTok bio and share one post about your brand." },
    ],
    success: "💪 Great work! Every share brings your next player closer. I'll tell you when new players join.",
  },
  setup_payouts: {
    id: "setup_payouts",
    title: "Set up your payouts",
    intro: "Let's make sure *your earnings* can reach you. 💳",
    steps: [
      { text: "*Step 1* — Open your Boss Hub → Earnings → *Payouts*.", cta: "payouts" },
      { text: "*Step 2* — Choose your payout method and add your details." },
      { text: "*Step 3* — Save and double-check the details. Wrong details are the #1 cause of delayed payouts." },
    ],
    verify: (b) => b.payouts.methodConfigured,
    alreadyDone: (b) => b.payouts.methodConfigured,
    success: "✅ Your payout method is set. Your earnings are ready to reach you.",
  },
};

export function getGuide(id: string): Guide | undefined {
  return (GUIDES as Record<string, Guide>)[id];
}
