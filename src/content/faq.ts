/**
 * SUPPORT — FAQ by category. Answers are short and end in an action (CTA, guide,
 * or human support). `personal` adds the Boss's real numbers where it helps.
 *
 * ⚠️ Draft copy: verify with the Sharker support team before launch.
 */
import { money, num, plural, shortDate } from "../util/format.js";
import { agentStatusMessage } from "./agent.js";
import type { ContentCtx } from "./context.js";
import type { GuideId } from "./guides.js";
import { agentCta, type CtaId } from "./links.js";

export type FaqCategoryId = "technical" | "brand" | "earnings" | "players" | "gcoin" | "marketing" | "ai_agent";

export interface FaqCategory {
  id: FaqCategoryId;
  title: string;
  description: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: "technical", title: "🛠️ Technical help", description: "Login, links, errors" },
  { id: "brand", title: "🏷️ My brand", description: "Your brand link and settings" },
  { id: "earnings", title: "💰 Earnings & payouts", description: "Your earnings and how you get paid" },
  { id: "players", title: "👥 Players", description: "Your players and their accounts" },
  { id: "gcoin", title: "🪙 GCOIN", description: "Your GCOIN balance" },
  { id: "marketing", title: "📣 Marketing", description: "Getting your brand seen" },
  { id: "ai_agent", title: "🤖 AI Agent", description: "Your AI Marketing Agent" },
];

export interface FaqEntry {
  id: string;
  category: FaqCategoryId;
  /** List row title (≤ 24 chars). */
  title: string;
  /** Full question (≤ 72 chars, shown as the list row description). */
  question: string;
  answer: string;
  personal?: (ctx: ContentCtx) => string | null;
  cta?: (ctx: ContentCtx) => CtaId;
  guide?: GuideId;
  /** Problems a human usually needs to resolve — the bot offers support right away. */
  suggestHuman?: boolean;
  keywords: string[];
}

export const FAQ: FaqEntry[] = [
  // Technical
  {
    id: "cant_login",
    category: "technical",
    title: "Can't log in",
    question: "I can't log in to my Boss Hub",
    answer:
      "Let's fix it:\n" +
      "1. Use the same phone/email you signed up with\n" +
      "2. Tap *Forgot password* on the login page to reset it\n" +
      "3. Try another browser or a private window\n\n" +
      "Still locked out? Tap *Talk to a human* and we'll get you back in.",
    cta: () => "hub_home",
    suggestHuman: true,
    keywords: ["login", "log in", "sign in", "password", "locked", "access", "cant enter", "can't enter"],
  },
  {
    id: "link_not_working",
    category: "technical",
    title: "Link not working",
    question: "My brand link isn't working",
    answer:
      "Try this:\n" +
      "1. Copy your link again from Boss Hub → My Brand (make sure you copy all of it)\n" +
      "2. Open it in a private window to test it\n" +
      "3. If it still fails, send us a screenshot via *Talk to a human*",
    cta: () => "brand_link",
    suggestHuman: true,
    keywords: ["link broken", "link not working", "link doesn't work", "404", "wrong link", "link error"],
  },
  {
    id: "page_error",
    category: "technical",
    title: "Page error / not loading",
    question: "A page won't load or shows an error",
    answer:
      "Quick fixes:\n" +
      "1. Refresh the page\n" +
      "2. Check your internet connection\n" +
      "3. Update your browser or try another one\n\n" +
      "Still broken? Tell a human what you see (a screenshot helps a lot).",
    suggestHuman: true,
    keywords: ["error", "bug", "not loading", "blank", "crash", "broken", "problem", "issue", "doesn't work"],
  },
  // Brand
  {
    id: "find_link",
    category: "brand",
    title: "Find my brand link",
    question: "Where do I find my brand link?",
    answer: "Your brand link is in your Boss Hub → *My Brand*. Copy it and share it everywhere — every player who joins through it is *your* player.",
    cta: () => "brand_link",
    guide: "share_link",
    keywords: ["my link", "brand link", "where is my link", "find link", "referral", "invite link"],
  },
  {
    id: "brand_live",
    category: "brand",
    title: "Is my brand live?",
    question: "Is my brand live?",
    answer: "You can always check your brand status in your Boss Hub → *My Brand*.",
    personal: ({ boss, timezone }) =>
      boss.brandLaunchedAt
        ? `📍 Yes! *${boss.brandName}* has been live since ${shortDate(boss.brandLaunchedAt, timezone)}.`
        : `📍 *${boss.brandName}* is not live yet. Finish your launch steps in your Boss Hub.`,
    cta: () => "brand_settings",
    keywords: ["live", "online", "launched", "active brand", "is my brand"],
  },
  {
    id: "change_brand",
    category: "brand",
    title: "Change name or logo",
    question: "Can I change my brand name or logo?",
    answer:
      "Your brand settings are in your Boss Hub → *My Brand*. If something can't be edited there, tap *Talk to a human* and we'll help you change it.",
    cta: () => "brand_settings",
    keywords: ["change name", "rename", "logo", "colors", "design", "customize", "edit brand"],
  },
  // Earnings
  {
    id: "how_much_earned",
    category: "earnings",
    title: "How much did I earn?",
    question: "How much have I earned?",
    answer: "Your full earnings history is in your Boss Hub → *Earnings*.",
    personal: ({ boss }) =>
      `📍 Your earnings:\n• Today: *${money(boss.stats.earningsToday, boss.stats.currency)}*\n• Last 7 days: *${money(boss.stats.earnings7d, boss.stats.currency)}*\n• Total: *${money(boss.stats.earningsTotal, boss.stats.currency)}*`,
    cta: () => "earnings",
    keywords: ["how much", "earned", "my earnings", "balance", "income", "revenue"],
  },
  {
    id: "when_paid",
    category: "earnings",
    title: "When do I get paid?",
    question: "When do I get paid?",
    answer:
      "Your payout schedule and next payout are shown in your Boss Hub → *Payouts*. Make sure your payout method is set up so nothing gets delayed.",
    personal: ({ boss }) => (boss.payouts.methodConfigured ? null : "⚠️ You haven't set up a payout method yet."),
    cta: ({ boss }) => (boss.payouts.methodConfigured ? "earnings" : "payouts"),
    guide: "setup_payouts",
    keywords: ["when", "paid", "payout date", "schedule", "get paid", "next payout", "pay day"],
  },
  {
    id: "payout_missing",
    category: "earnings",
    title: "Payout not received",
    question: "I didn't receive my payout",
    answer:
      "Let's check:\n" +
      "1. Open Boss Hub → *Payouts* and check the payout status\n" +
      "2. Make sure your payout details are correct\n" +
      "3. Allow for the processing time shown there\n\n" +
      "Still missing? Tap *Talk to a human* — our team will check it for you.",
    cta: () => "payouts",
    suggestHuman: true,
    keywords: ["didn't receive", "not received", "missing payout", "where is my money", "late payout", "payment missing"],
  },
  // Players
  {
    id: "how_many_players",
    category: "players",
    title: "How many players?",
    question: "How many players do I have?",
    answer: "See all your players in your Boss Hub → *Players*.",
    personal: ({ boss }) =>
      `📍 Your players:\n• Total: *${num(boss.stats.totalPlayers)}*\n• New this week: *${num(boss.stats.newPlayers7d)}*\n• Active this week: *${num(boss.stats.activePlayers7d)}*`,
    cta: () => "players",
    keywords: ["how many players", "my players", "player count", "active players", "new players"],
  },
  {
    id: "player_problem",
    category: "players",
    title: "A player has a problem",
    question: "One of my players has a problem with their account",
    answer:
      "Player accounts are handled by Sharker support. Ask your player to contact support from your brand's site — or tap *Talk to a human* and tell us what happened.",
    suggestHuman: true,
    keywords: ["player problem", "player issue", "player can't", "player complaint", "player account", "player support"],
  },
  {
    id: "more_players",
    category: "players",
    title: "Get more players",
    question: "How do I get more players?",
    answer:
      "Share your brand link every day (WhatsApp status, groups, socials) and let your AI Agent post for you. Consistency wins.",
    cta: () => "brand_link",
    guide: "share_link",
    keywords: ["more players", "get players", "no players", "grow players"],
  },
  // GCOIN
  {
    id: "gcoin_balance",
    category: "gcoin",
    title: "My GCOIN balance",
    question: "Where do I see my GCOIN?",
    answer: "Your GCOIN balance is always in your Boss Hub.",
    personal: ({ boss }) => `📍 Your balance: *${num(boss.stats.gcoinBalance)} GCOIN*`,
    cta: () => "gcoin",
    keywords: ["gcoin balance", "my gcoin", "how much gcoin", "coins"],
  },
  {
    id: "gcoin_what",
    category: "gcoin",
    title: "What is GCOIN?",
    question: "What is GCOIN and how is it used?",
    answer: "GCOIN is Sharker's digital coin and it powers the activity on your brand. Your Boss Hub shows your balance and how you can use it.",
    cta: () => "gcoin",
    keywords: ["what is gcoin", "gcoin", "coin"],
  },
  // Marketing
  {
    id: "what_to_post",
    category: "marketing",
    title: "What should I post?",
    question: "What should I post to promote my brand?",
    answer:
      "Ideas that work:\n" +
      "• A short story about why you started your brand\n" +
      "• News and highlights from your brand\n" +
      "• A clear call: \"Join me — link in bio\"\n\n" +
      "Or let your AI Agent create and publish posts for you.",
    cta: (ctx) => (ctx.stage === "live" ? "marketing" : agentCta(ctx.stage)),
    keywords: ["what to post", "post ideas", "content ideas", "what should i post", "caption"],
  },
  {
    id: "how_often",
    category: "marketing",
    title: "How often to post?",
    question: "How often should I post?",
    answer: "Every day is ideal. Consistency beats perfection. If you don't have time, your AI Agent can post for you automatically.",
    cta: (ctx) => agentCta(ctx.stage),
    keywords: ["how often", "frequency", "every day", "daily post"],
  },
  // AI Agent
  {
    id: "activate_agent",
    category: "ai_agent",
    title: "Activate my AI Agent",
    question: "How do I activate my AI Agent?",
    answer: "Open your Boss Hub → *AI Agent* and tap *Activate*. I can guide you step by step.",
    personal: (ctx) => (ctx.stage !== "not_activated" ? "📍 Good news: your AI Agent is already active ✅" : null),
    cta: (ctx) => agentCta(ctx.stage),
    guide: "activate_agent",
    keywords: ["activate", "turn on", "enable", "start agent", "activate agent"],
  },
  {
    id: "connect_socials",
    category: "ai_agent",
    title: "Connect my socials",
    question: "How do I connect my social accounts?",
    answer: "Open your Boss Hub → AI Agent → *Connected accounts*, pick a network and log in to allow your Agent to post.",
    cta: () => "agent_socials",
    guide: "connect_socials",
    keywords: ["connect", "socials", "social account", "instagram", "tiktok", "facebook", "link account"],
  },
  {
    id: "agent_working",
    category: "ai_agent",
    title: "Is my Agent working?",
    question: "Is my AI Agent working?",
    answer: "You can see everything your Agent does in your Boss Hub → *AI Agent*.",
    personal: (ctx) => agentStatusMessage(ctx).body,
    cta: (ctx) => agentCta(ctx.stage),
    keywords: ["agent working", "is it working", "agent status", "posted", "agent posts"],
  },
  {
    id: "agent_content",
    category: "ai_agent",
    title: "What does it post?",
    question: "What does my AI Agent post, and can I see it?",
    answer:
      "Your Agent creates content about your brand and publishes it on your connected accounts. Every post is visible in your Boss Hub → *AI Agent*. Need a change? Tap *Talk to a human*.",
    cta: () => "agent_view",
    keywords: ["what does it post", "content", "see posts", "control", "approve", "agent content"],
  },
];

export function getFaq(id: string): FaqEntry | undefined {
  return FAQ.find((f) => f.id === id);
}

export function faqByCategory(category: FaqCategoryId): FaqEntry[] {
  return FAQ.filter((f) => f.category === category);
}
