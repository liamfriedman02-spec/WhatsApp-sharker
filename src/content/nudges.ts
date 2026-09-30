/**
 * RETENTION & ACTIVATION — proactive message copy.
 *
 * Each nudge is written once, WhatsApp-template style ({{1}}, {{2}}…). The same definition is
 * used to:
 *   • send a free-form interactive message when the Boss is inside the 24h service window
 *   • send the approved template when outside it (WhatsApp only allows templates there)
 *   • generate the template submission payloads (npm run templates:export)
 *
 * Template rules respected here: no variables at the very start/end of the body, no
 * newlines inside variables, headline kept in the body (template headers can't hold emoji).
 *
 * ⚠️ Every template must be submitted to and approved by Meta before it can be sent.
 */
import { goalStatusLine, describeProposal, formatAmount } from "../coach/goals.js";
import { formatChange } from "../coach/insights.js";
import { lowerFirst, plannedMission, plannedProposal } from "../coach/plan.js";
import { money, num, plural, networkName } from "../util/format.js";
import type { ContentCtx } from "./context.js";
import { levelName, nextLevelNeeds } from "./levels.js";
import type { CtaId } from "./links.js";

export type TemplateCategory = "MARKETING" | "UTILITY";

export interface QuickReply {
  /** ≤ 20 chars */
  title: string;
  payload: string;
}

export interface NudgeTemplate {
  /** WhatsApp template name (lowercase, underscores). */
  name: string;
  category: TemplateCategory;
  body: string;
  params: (ctx: ContentCtx) => string[];
  /** Sample values for Meta's template review. */
  example: string[];
  /** URL button → Boss Hub deep link (button index 0). Its label is fixed in the template. */
  cta?: CtaId;
  /** Page the URL button opens when it depends on the Boss (template keeps `cta`'s label). */
  ctaFor?: (ctx: ContentCtx) => CtaId;
  /** In-session: one buttons message with the link inline, so quick replies (e.g. ✅ Done) stay. */
  sessionLinkInline?: boolean;
  /** Quick-reply buttons (after the URL button). */
  quickReplies?: QuickReply[];
  footer?: string;
}

const STOP_FOOTER = "Reply STOP to pause these tips";
const MENU = { title: "🏠 Menu", payload: "menu:main" };

const first = (c: ContentCtx) => c.boss.firstName;
const brand = (c: ContentCtx) => c.boss.brandName;

/** Short, param-safe description of the Agent's state for digests. */
export function agentSummary(ctx: ContentCtx): string {
  const a = ctx.boss.aiAgent;
  if (ctx.stage === "not_activated") return "not active yet";
  if (ctx.stage === "needs_socials") return "waiting for your socials";
  return a.postsPublished7d > 0 ? `${plural(a.postsPublished7d, "post", "posts")} this week` : "live";
}

export const NUDGES = {
  // ── Onboarding ────────────────────────────────────────────────────────────
  welcome: {
    name: "boss_welcome",
    category: "UTILITY",
    body:
      "👋 *Welcome to your Boss Assistant, {{1}}!*\n\n" +
      "I'm here on WhatsApp to help you grow *{{2}}*:\n" +
      "🎓 Learn how your business works\n" +
      "💬 Get help anytime\n" +
      "📊 Follow your players and earnings\n" +
      "🤖 Put your marketing on autopilot\n\n" +
      "Reply *MENU* anytime to see everything I can do.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    quickReplies: [
      { title: "🎓 Start learning", payload: "learn:what_is_boss" },
      { title: "📊 My business", payload: "menu:business" },
      { title: "🤖 My AI Agent", payload: "menu:ai_agent" },
    ],
  },

  // ── Milestones ────────────────────────────────────────────────────────────
  first_player: {
    name: "boss_first_player",
    category: "UTILITY",
    body:
      "🎉 *Your first player is here!*\n\n" +
      "Someone just joined *{{1}}* — your brand, your player.\n\n" +
      "Keep the momentum going: share your brand link again today and bring the next one.",
    params: (c) => [brand(c)],
    example: ["Ana Arena"],
    cta: "brand_link",
  },
  first_earnings: {
    name: "boss_first_earnings",
    category: "UTILITY",
    body:
      "💰 *You just made your first earnings!*\n\n" +
      "*{{1}}* has generated {{2}} so far. This is your business working for you.\n\n" +
      "See every detail in your Boss Hub.",
    params: (c) => [brand(c), money(c.boss.stats.earningsTotal, c.boss.stats.currency)],
    example: ["Ana Arena", "$18.50"],
    cta: "earnings",
  },
  first_earnings_payouts: {
    name: "boss_first_earnings_payouts",
    category: "UTILITY",
    body:
      "💰 *You just made your first earnings!*\n\n" +
      "*{{1}}* has generated {{2}} so far. This is your business working for you.\n\n" +
      "Next step: add your payout method so your earnings can reach you.",
    params: (c) => [brand(c), money(c.boss.stats.earningsTotal, c.boss.stats.currency)],
    example: ["Ana Arena", "$18.50"],
    cta: "payouts",
    quickReplies: [{ title: "Guide me", payload: "guide:setup_payouts" }],
  },

  // ── AI Marketing Agent funnel ─────────────────────────────────────────────
  agent_activate_1: {
    name: "boss_agent_activate_1",
    category: "MARKETING",
    body:
      "🤖 *Let AI Grow Your Brand*\n\n" +
      "Your brand *{{1}}* is live. Now put your marketing on autopilot.\n\n" +
      "Activate your AI Marketing Agent, connect your socials and let it automatically create and publish content for your brand.",
    params: (c) => [brand(c)],
    example: ["Ana Arena"],
    cta: "agent_activate",
    quickReplies: [{ title: "How does it work?", payload: "learn:ai_autopilot" }],
    footer: STOP_FOOTER,
  },
  agent_activate_2: {
    name: "boss_agent_activate_2",
    category: "MARKETING",
    body:
      "⏱️ *Your marketing, on autopilot*\n\n" +
      "Hi {{1}}! Posting every day takes time. Your AI Marketing Agent can do it for *{{2}}* — it creates and publishes content automatically.\n\n" +
      "It's one tap away.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "agent_activate",
    quickReplies: [{ title: "Guide me", payload: "guide:activate_agent" }],
    footer: STOP_FOOTER,
  },
  agent_activate_3: {
    name: "boss_agent_activate_3",
    category: "MARKETING",
    body:
      "🤖 *Still marketing by hand, {{1}}?*\n\n" +
      "Your AI Agent is ready to promote *{{2}}* for you, every day.\n\n" +
      "This is my last reminder about it — you can activate it anytime from your Boss Hub.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "agent_activate",
    footer: STOP_FOOTER,
  },
  agent_socials_1: {
    name: "boss_agent_socials_1",
    category: "MARKETING",
    body:
      "*Your AI Agent Is Ready 🤖*\n\n" +
      "One last step.\n\n" +
      "Connect your social account so your Agent can start promoting *{{1}}* automatically.",
    params: (c) => [brand(c)],
    example: ["Ana Arena"],
    cta: "agent_socials",
    quickReplies: [{ title: "Guide me", payload: "guide:connect_socials" }],
    footer: STOP_FOOTER,
  },
  agent_socials_2: {
    name: "boss_agent_socials_2",
    category: "MARKETING",
    body:
      "🔗 *Your Agent is waiting for you, {{1}}*\n\n" +
      "Your AI Agent is active but can't post yet. Connect Instagram, TikTok or another account and it starts promoting *{{2}}* right away.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "agent_socials",
    quickReplies: [{ title: "Guide me", payload: "guide:connect_socials" }],
    footer: STOP_FOOTER,
  },
  agent_socials_3: {
    name: "boss_agent_socials_3",
    category: "MARKETING",
    body:
      "🤖 *Last step to autopilot, {{1}}*\n\n" +
      "Connect one social account and your Agent starts working for *{{2}}*.\n\n" +
      "This is my last reminder — you can do it anytime in your Boss Hub.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "agent_socials",
    footer: STOP_FOOTER,
  },
  agent_live: {
    name: "boss_agent_live",
    category: "UTILITY",
    body:
      "🚀 *Your AI Agent Is Live*\n\n" +
      "Your Agent is now working for *{{1}}* and automatically publishing content to help you grow.\n\n" +
      "I'll keep you posted on what it does.",
    params: (c) => [brand(c)],
    example: ["Ana Arena"],
    cta: "agent_view",
  },
  agent_first_post: {
    name: "boss_agent_first_post",
    category: "UTILITY",
    body:
      "📣 *Your AI Agent just published its first post!*\n\n" +
      "A new post for *{{1}}* is live on {{2}}. Your marketing now works even while you sleep.\n\n" +
      "Take a look in your Boss Hub.",
    params: (c) => [brand(c), networkName(c.boss.aiAgent.lastPostNetwork ?? c.boss.aiAgent.connectedSocials[0] ?? "your socials")],
    example: ["Ana Arena", "Instagram"],
    cta: "agent_view",
  },

  // ── Players ───────────────────────────────────────────────────────────────
  no_players_1: {
    name: "boss_no_players_1",
    category: "MARKETING",
    body:
      "👥 *Let's get your first player, {{1}}*\n\n" +
      "*{{2}}* is live, but no players have joined yet.\n\n" +
      "The fastest way: share your brand link on your WhatsApp status and in 3 groups today.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "brand_link",
    quickReplies: [{ title: "Guide me", payload: "guide:share_link" }],
    footer: STOP_FOOTER,
  },
  no_players_2: {
    name: "boss_no_players_2",
    category: "MARKETING",
    body:
      "💡 *Quick tip for {{1}}*\n\n" +
      "Add your brand link to your Instagram and TikTok bio, and post it on your WhatsApp status today. People can't join *{{2}}* if they can't find it.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "brand_link",
    footer: STOP_FOOTER,
  },
  no_players_3: {
    name: "boss_no_players_3",
    category: "MARKETING",
    body:
      "🚀 *Your brand is ready for players, {{1}}*\n\n" +
      "*{{2}}* is live and waiting. One share today can bring your first player.\n\n" +
      "Need help? Just reply to this message.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "brand_link",
    footer: STOP_FOOTER,
  },

  // ── Inactive Boss ─────────────────────────────────────────────────────────
  inactive_1: {
    name: "boss_inactive_1",
    category: "MARKETING",
    body:
      "👋 *Your business misses you, {{1}}*\n\n" +
      "Here's *{{2}}* in the last 7 days:\n" +
      "👥 New players: {{3}}\n" +
      "💰 Earnings: {{4}}\n\n" +
      "Check in on your Boss Hub and keep growing.",
    params: (c) => [first(c), brand(c), num(c.boss.stats.newPlayers7d), money(c.boss.stats.earnings7d, c.boss.stats.currency)],
    example: ["Diego", "Diego Den", "3", "$22.10"],
    cta: "dashboard",
    footer: STOP_FOOTER,
  },
  inactive_2: {
    name: "boss_inactive_2",
    category: "MARKETING",
    body:
      "📊 *Your brand is waiting for you, {{1}}*\n\n" +
      "*{{2}}* is live and ready to grow. Take 2 minutes today: check your dashboard and share your brand link once.",
    params: (c) => [first(c), brand(c)],
    example: ["Diego", "Diego Den"],
    cta: "dashboard",
    footer: STOP_FOOTER,
  },
  inactive_3: {
    name: "boss_inactive_3",
    category: "MARKETING",
    body:
      "🔔 *Still there, {{1}}?*\n\n" +
      "*{{2}}* is still yours and still live. Whenever you're ready, I'm here to help you grow it.\n\n" +
      "Reply *MENU* to see what I can do.",
    params: (c) => [first(c), brand(c)],
    example: ["Diego", "Diego Den"],
    cta: "hub_home",
    footer: STOP_FOOTER,
  },

  // ── Performance ───────────────────────────────────────────────────────────
  daily_summary: {
    name: "boss_daily_summary",
    category: "UTILITY",
    body:
      "📊 *Your day on {{1}}*\n\n" +
      "👥 New players today: {{2}}\n" +
      "💰 Earnings today: {{3}}\n" +
      "🤖 Your AI Agent: {{4}}\n\n" +
      "Keep it going!",
    params: (c) => [
      brand(c),
      num(c.boss.stats.newPlayersToday),
      money(c.boss.stats.earningsToday, c.boss.stats.currency),
      agentSummary(c),
    ],
    example: ["Carla Kingdom", "4", "$96.40", "3 posts this week"],
    cta: "dashboard",
  },
  weekly_coaching: {
    name: "boss_weekly_coaching",
    category: "UTILITY",
    body:
      "📈 *Your week on {{1}}*\n\n" +
      "👥 New players: {{2}} ({{3}})\n" +
      "💰 Earnings: {{4}} ({{5}})\n" +
      "🏆 Level: {{6}}\n" +
      "🎯 Goal: {{7}}\n\n" +
      "👉 This week's focus: {{8}}.\n\n" +
      "Tap below for your full coaching session.",
    params: (c) => {
      const coach = c.coach!;
      return [
        brand(c),
        num(c.boss.stats.newPlayers7d),
        formatChange(coach.insights.newPlayers),
        money(c.boss.stats.earnings7d, c.boss.stats.currency),
        formatChange(coach.insights.earnings),
        levelName(coach.level.current),
        goalStatusLine(coach.goal?.goal.status === "active" ? coach.goal : null),
        lowerFirst(plannedMission(c).title),
      ];
    },
    example: ["Carla Kingdom", "31", "+24% vs last week", "$612.30", "+12% vs last week", "💎 Pro", "18/40 new players · on track ✅", "bring 5 players back"],
    cta: "dashboard",
    quickReplies: [{ title: "📊 Full coaching", payload: "coach:session" }],
  },

  // ── Coaching ──────────────────────────────────────────────────────────────
  daily_mission: {
    name: "boss_daily_mission",
    category: "MARKETING",
    body:
      "🎯 *Today's mission for {{1}}*\n\n" +
      "{{2}}\n\n" +
      "💡 {{3}}\n\n" +
      "🔥 Streak: {{4}} · 🏅 {{5}} points\n\n" +
      "Tap *Done* when you've finished it.",
    params: (c) => {
      const m = plannedMission(c);
      const streak = c.coach!.state.streak;
      return [brand(c), m.task, m.why, streak > 0 ? `${plural(streak, "mission", "missions")} in a row` : "start one today", num(c.coach!.state.points)];
    },
    example: ["Ana Arena", "Send your brand link to 3 WhatsApp groups where people know you.", "People who already know you are the most likely to join your brand.", "2 missions in a row", "45"],
    cta: "hub_home",
    ctaFor: (c) => plannedMission(c).cta ?? "hub_home",
    sessionLinkInline: true,
    quickReplies: [
      { title: "✅ Done", payload: "mission:done" },
      { title: "🙋 Help me", payload: "mission:help" },
    ],
    footer: STOP_FOOTER,
  },
  goal_proposal: {
    name: "boss_goal_proposal",
    category: "MARKETING",
    body:
      "🎯 *Let's set your goal, {{1}}*\n\n" +
      "Based on your pace, I think *{{2}}* can reach *{{3}}*.\n\n" +
      "A clear target is how brands grow on purpose. Want to go for it?",
    params: (c) => [first(c), brand(c), describeProposal(plannedProposal(c), c.boss, c.now, c.timezone)],
    example: ["Bruno", "Bruno Club", "15 new players by Oct 26"],
    quickReplies: [
      { title: "✅ Let's do it", payload: "goal:accept" },
      { title: "📈 Aim higher", payload: "goal:higher" },
      { title: "📉 Smaller goal", payload: "goal:lower" },
    ],
    footer: STOP_FOOTER,
  },
  goal_achieved: {
    name: "boss_goal_achieved",
    category: "UTILITY",
    body:
      "🏆 *Goal reached, {{1}}!*\n\n" +
      "*{{2}}* hit {{3}}. That's your business growing because you pushed it.\n\n" +
      "Ready for a bigger one?",
    params: (c) => {
      const g = c.coach?.state.goal;
      return [first(c), brand(c), g ? formatAmount(g.metric, g.target, c.boss.stats.currency) : "your goal"];
    },
    example: ["Carla", "Carla Kingdom", "40 new players"],
    quickReplies: [
      { title: "🎯 New goal", payload: "goal:new" },
      { title: "🏆 My progress", payload: "coach:progress" },
    ],
  },
  level_up: {
    name: "boss_level_up",
    category: "UTILITY",
    body:
      "🎉 *Level up, {{1}}!*\n\n" +
      "*{{2}}* is now a *{{3}}* brand.\n\n" +
      "Next level: {{4}}. Let's get there!",
    params: (c) => [first(c), brand(c), levelName(c.coach!.level.current), nextLevelNeeds(c.coach!.level)],
    example: ["Bruno", "Bruno Club", "🚀 Rising", "10 players (2/10) and your first earnings"],
    quickReplies: [
      { title: "🏆 My progress", payload: "coach:progress" },
      { title: "🎯 Today's mission", payload: "mission:today" },
    ],
  },
  best_day: {
    name: "boss_best_day",
    category: "UTILITY",
    body:
      "🔥 *Best day ever for {{1}}!*\n\n" +
      "{{2}} new players joined today — your best day so far. Your marketing is working.\n\n" +
      "Strike while it's hot: share your link once more tonight.",
    params: (c) => [brand(c), num(c.boss.stats.newPlayersToday)],
    example: ["Carla Kingdom", "12"],
    cta: "brand_link",
  },
  momentum_drop: {
    name: "boss_momentum_drop",
    category: "MARKETING",
    body:
      "📉 *Let's turn it around, {{1}}*\n\n" +
      "New players on *{{2}}* are down {{3}} vs last week.\n\n" +
      "One push today makes the difference: {{4}}.",
    params: (c) => [first(c), brand(c), `${Math.abs(c.coach!.insights.newPlayers.changePct ?? 0)}%`, lowerFirst(plannedMission(c).title)],
    example: ["Diego", "Diego Den", "40%", "share your link in 3 groups"],
    cta: "hub_home",
    ctaFor: (c) => plannedMission(c).cta ?? "hub_home",
    sessionLinkInline: true,
    quickReplies: [
      { title: "✅ Done", payload: "mission:done" },
      { title: "🙋 Help me", payload: "mission:help" },
    ],
    footer: STOP_FOOTER,
  },
  follow_up: {
    name: "boss_follow_up",
    category: "UTILITY",
    body: "👋 *Checking in, {{1}}*\n\nLast time you planned to {{2}}. How did it go?",
    params: (c) => {
      const due = c.coach!.state.followUps.find((f) => f.status === "pending" && new Date(f.dueAt) <= c.now);
      return [first(c), due?.reason || "take the next step for your brand"];
    },
    example: ["Ana", "share your link in 3 WhatsApp groups"],
    quickReplies: [
      { title: "✅ Done!", payload: "followup:done" },
      { title: "😕 Not yet", payload: "followup:notyet" },
    ],
  },
} as const satisfies Record<string, NudgeTemplate>;

export type NudgeTemplateId = keyof typeof NUDGES;

export const MENU_QUICK_REPLY = MENU;

/** Replaces {{n}} placeholders with params. */
export function fillTemplate(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}
