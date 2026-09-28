/**
 * EDUCATION — "Learn" topics.
 *
 * Rules for this copy: short, simple, action-oriented, always "your". Every topic ends
 * with a CTA so the Boss can immediately *do* what they just learned.
 *
 * ⚠️ Draft copy: the Sharker team must verify every factual statement (earnings, payouts,
 * GCOIN, Boss Hub section names) before launch. The AI assistant answers from this text,
 * so keeping it accurate keeps the bot accurate.
 */
import { money, num, plural } from "../util/format.js";
import { agentChecklist } from "./agent.js";
import type { ContentCtx } from "./context.js";
import type { GuideId } from "./guides.js";
import { agentCta, type CtaId } from "./links.js";

export type TopicId =
  | "what_is_boss"
  | "how_brand_works"
  | "how_earn"
  | "bring_players"
  | "boss_hub"
  | "payments"
  | "gcoin"
  | "marketing"
  | "ai_agent"
  | "ai_autopilot";

export interface Topic {
  id: TopicId;
  /** List row title (≤ 24 chars). */
  title: string;
  /** List row description (≤ 72 chars). */
  description: string;
  /** Static explanation — also fed to the AI assistant as knowledge. */
  body: string;
  /** Optional personalized line appended when the bot sends the topic. */
  personal?: (ctx: ContentCtx) => string | null;
  cta: (ctx: ContentCtx) => CtaId;
  guide?: GuideId;
  keywords: string[];
}

export const TOPICS: Topic[] = [
  {
    id: "what_is_boss",
    title: "👑 What is a Boss?",
    description: "Your role and your business",
    body:
      "A *Boss* is the owner of a Sharker brand. That's you. 👑\n\n" +
      "Sharker gives you the platform and the technology. You bring the players and grow the brand.\n\n" +
      "*Your brand. Your players. Your earnings. Your business.*",
    personal: ({ boss }) => `Your brand: *${boss.brandName}*`,
    cta: () => "hub_home",
    keywords: ["boss", "what is a boss", "role", "owner", "who am i", "sharker"],
  },
  {
    id: "how_brand_works",
    title: "🏷️ How my brand works",
    description: "Your brand, your link, your players",
    body:
      "Your brand is *your own business*, running on Sharker.\n\n" +
      "• Players join through *your* brand link\n" +
      "• Everything they do is tracked to *your* brand\n" +
      "• You manage everything from your Boss Hub\n\n" +
      "Sharker runs the tech. You focus on growing.",
    personal: ({ boss }) =>
      boss.brandLaunchedAt
        ? `📍 *${boss.brandName}* is live with ${plural(boss.stats.totalPlayers, "player", "players")}.`
        : `📍 *${boss.brandName}* isn't live yet — finish your launch in your Boss Hub.`,
    cta: () => "brand_link",
    keywords: ["brand", "my brand", "how does my brand work", "link", "brand link", "launch"],
  },
  {
    id: "how_earn",
    title: "💰 How do I earn?",
    description: "Where your earnings come from",
    body:
      "You earn from the activity of *your players* on *your brand*.\n\n" +
      "*More players + more activity = more earnings.*\n\n" +
      "1. Bring players with your brand link\n" +
      "2. Keep them active (let your AI Agent post for you)\n" +
      "3. Track your earnings live in your Boss Hub",
    personal: ({ boss }) =>
      boss.stats.earningsTotal > 0
        ? `📍 Your earnings so far: *${money(boss.stats.earningsTotal, boss.stats.currency)}*`
        : "📍 Your first earnings arrive as soon as your players get active.",
    cta: () => "earnings",
    keywords: ["earn", "earning", "earnings", "money", "income", "commission", "revenue", "profit", "make money"],
  },
  {
    id: "bring_players",
    title: "👥 Bring players",
    description: "Simple ways to grow your player base",
    body:
      "Every player who joins through your brand link is *your player*.\n\n" +
      "Fastest ways to bring players:\n" +
      "1. Share your brand link on WhatsApp status and groups\n" +
      "2. Post it on Instagram, TikTok and your other socials\n" +
      "3. Post regularly — or let your AI Agent do it for you\n\n" +
      "Tip: start with the people who already know you.",
    personal: ({ boss }) =>
      boss.stats.totalPlayers > 0
        ? `📍 You have *${plural(boss.stats.totalPlayers, "player", "players")}* (+${num(boss.stats.newPlayers7d)} this week).`
        : "📍 Your first player is one share away. Do it today!",
    cta: () => "brand_link",
    guide: "share_link",
    keywords: ["player", "players", "bring players", "get players", "more players", "grow", "invite", "recruit", "share"],
  },
  {
    id: "boss_hub",
    title: "🖥️ Use my Boss Hub",
    description: "Your control center, explained",
    body:
      "Your Boss Hub is the control center of your business.\n\n" +
      "• *Dashboard* – your players, activity and earnings\n" +
      "• *My Brand* – your brand link and settings\n" +
      "• *Earnings* – what you earned and your payouts\n" +
      "• *AI Agent* – your automatic marketing\n" +
      "• *Support* – help whenever you need it\n\n" +
      "Tip: check your Dashboard once a day to see your business grow.",
    cta: () => "dashboard",
    keywords: ["hub", "boss hub", "dashboard", "panel", "control", "login", "account", "where do i"],
  },
  {
    id: "payments",
    title: "💳 How payments work",
    description: "Your earnings, balance and payouts",
    body:
      "Your earnings are calculated automatically from your players' activity.\n\n" +
      "• See your balance anytime in Boss Hub → *Earnings*\n" +
      "• Add your payout details once in Boss Hub → *Payouts*\n" +
      "• Payouts go to the payout method you choose\n\n" +
      "Your exact payout schedule is always shown in your Boss Hub.",
    personal: ({ boss }) =>
      boss.payouts.methodConfigured
        ? "📍 Your payout method is set up ✅"
        : "📍 You haven't added a payout method yet — do it now so nothing gets delayed.",
    cta: ({ boss }) => (boss.payouts.methodConfigured ? "earnings" : "payouts"),
    guide: "setup_payouts",
    keywords: ["payment", "payments", "payout", "payouts", "paid", "withdraw", "withdrawal", "bank", "balance", "transfer"],
  },
  {
    id: "gcoin",
    title: "🪙 What is GCOIN?",
    description: "The coin that powers Sharker",
    body:
      "*GCOIN* is Sharker's digital coin. It powers the activity on your brand.\n\n" +
      "• Your GCOIN balance is always in your Boss Hub\n" +
      "• More player activity = more GCOIN moving through *your* brand\n\n" +
      "Open your Boss Hub to see your GCOIN and how you can use it.",
    personal: ({ boss }) => `📍 Your GCOIN balance: *${num(boss.stats.gcoinBalance)} GCOIN*`,
    cta: () => "gcoin",
    keywords: ["gcoin", "g coin", "coin", "coins", "token", "crypto", "wallet"],
  },
  {
    id: "marketing",
    title: "📣 Market my brand",
    description: "A simple plan to get seen",
    body:
      "Marketing = more players = more earnings.\n\n" +
      "A simple plan:\n" +
      "1. Post every day on your socials with your brand link\n" +
      "2. Share on your WhatsApp status and in groups\n" +
      "3. Show real moments: news, events, highlights\n\n" +
      "No time? Your *AI Marketing Agent* can do this for you, automatically.",
    cta: (ctx) => (ctx.stage === "live" ? "marketing" : agentCta(ctx.stage)),
    keywords: ["market", "marketing", "promote", "promotion", "advertise", "ads", "post", "content", "social", "instagram", "tiktok"],
  },
  {
    id: "ai_agent",
    title: "🤖 AI Marketing Agent",
    description: "Your marketer that works 24/7",
    body:
      "Your *AI Marketing Agent* is your personal marketer. It works 24/7 for your brand.\n\n" +
      "It creates content for your brand and publishes it on your connected social accounts — automatically.\n\n" +
      "*You launched your business. Now let AI market it for you.*",
    personal: (ctx) =>
      ctx.stage === "live"
        ? "📍 Your AI Agent is live ✅"
        : ctx.stage === "needs_socials"
          ? "📍 Your AI Agent is active — connect your socials so it can start posting."
          : "📍 Your AI Agent isn't active yet.",
    cta: (ctx) => agentCta(ctx.stage),
    guide: "activate_agent",
    keywords: ["ai", "agent", "ai agent", "marketing agent", "robot", "bot", "artificial intelligence", "automatic"],
  },
  {
    id: "ai_autopilot",
    title: "⚙️ AI on autopilot",
    description: "How the AI Agent markets for you",
    body:
      "3 steps to put your marketing on autopilot:\n\n" +
      "1. Activate your AI Agent in your Boss Hub\n" +
      "2. Connect your social accounts\n" +
      "3. Your Agent creates and publishes content for your brand — automatically\n\n" +
      "You can see everything it publishes in Boss Hub → *AI Agent*.",
    personal: (ctx) => `Your progress:\n${agentChecklist(ctx.stage)}`,
    cta: (ctx) => agentCta(ctx.stage),
    guide: "activate_agent",
    keywords: ["autopilot", "automatically", "automatic", "connect", "socials", "how does the agent", "publish", "schedule"],
  },
];

export function getTopic(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function nextTopic(id: TopicId): Topic | undefined {
  const i = TOPICS.findIndex((t) => t.id === id);
  return i >= 0 ? TOPICS[i + 1] : undefined;
}
