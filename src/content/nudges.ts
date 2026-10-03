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
import { lowerFirst, plannedMission, plannedProposal, plannedStep, smallStep, stepMission } from "../coach/plan.js";
import { money, num, plural, networkName } from "../util/format.js";
import type { ContentCtx } from "./context.js";
import { levelName, nextLevelNeeds } from "./levels.js";
import type { CtaId } from "./links.js";
import { getPlaybook } from "./playbooks.js";

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

/** The plan step a proactive message talks about (the launch program's first day when there's no active plan). */
function stepFor(c: ContentCtx) {
  const planned = plannedStep(c);
  const p =
    planned && planned !== "finished"
      ? planned
      : (() => {
          const playbook = getPlaybook(c.coach?.state.playbook?.id ?? "launch") ?? getPlaybook("launch")!;
          return { playbook, index: 0, step: playbook.steps[0]!, opensNew: true, missed: 0 };
        })();
  return { ...p, mission: stepMission(c, p), small: smallStep(c, p), day: `${p.index + 1} of ${p.playbook.steps.length}` };
}

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
      "I'm your coach, right here in this chat, to help you grow *{{2}}*:\n" +
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
      "Someone just joined *{{1}}*. Your brand, your player.\n\n" +
      "Two things now: send them a welcome (I have the text ready), then share your link again today and bring the next one.",
    params: (c) => [brand(c)],
    example: ["Ana Arena"],
    cta: "brand_link",
    sessionLinkInline: true,
    quickReplies: [{ title: "👋 Welcome text", payload: "invite:welcome" }],
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
      "Hi {{1}}! Posting every day takes time. Your AI Marketing Agent can do it for *{{2}}*. It creates and publishes content automatically.\n\n" +
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
      "This is my last reminder about it. You can activate it anytime from your Boss Hub.",
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
      "This is my last reminder. You can do it anytime in your Boss Hub.",
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
      "*{{2}}* is live, but no players have joined yet. Here's how we fix that: 7 days, one 10-minute step a day, every text written for you.\n\n" +
      "Day 1 is ready. Shall we?",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    cta: "brand_link",
    sessionLinkInline: true,
    quickReplies: [{ title: "🚀 Start the sprint", payload: "play:start:launch" }],
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

  // ── Playbooks ─────────────────────────────────────────────────────────────
  playbook_step: {
    name: "boss_playbook_step",
    category: "MARKETING",
    body:
      "🚀 *{{1}}* · Day {{2}}\n\n" +
      "💡 {{3}}\n\n" +
      "🎯 *Today:* {{4}}\n\n" +
      "Everything you need is ready. Tap below and let's do it.",
    params: (c) => {
      const s = stepFor(c);
      return [s.playbook.title, s.day, s.step.lesson?.(c, c.coach!.state) ?? s.step.brief(c, c.coach!.state), s.mission.task];
    },
    example: ["Launch program", "2 of 10", "Your Instagram page is your shop window. People look at it before they join.", "Open an Instagram page for your brand, with your brand link in the bio."],
    cta: "hub_home",
    ctaFor: (c) => stepFor(c).mission.cta ?? "hub_home",
    sessionLinkInline: true,
    quickReplies: [
      { title: "🚀 Open today's step", payload: "play:today" },
      { title: "✅ Done", payload: "mission:done" },
      { title: "😕 I'm stuck", payload: "stuck:menu" },
    ],
    footer: STOP_FOOTER,
  },
  // The rescue ladder: a step that stays undone is reopened with a softer, smaller message.
  playbook_retry: {
    name: "boss_playbook_retry",
    category: "MARKETING",
    body:
      "👋 *{{1}}, yesterday's step is still waiting*\n\n" +
      "{{2}} · Day {{3}}: *{{4}}*\n\n" +
      "Short on time today? The 2-minute version counts too: {{5}}.\n\n" +
      "I'm right here if anything's unclear.",
    params: (c) => {
      const s = stepFor(c);
      return [first(c), s.playbook.title, s.day, s.step.title, s.small];
    },
    example: ["Ana", "Launch program", "2 of 10", "Open your Instagram", "create the account with your brand name, the rest can wait"],
    quickReplies: [
      { title: "▶️ Let's do it", payload: "play:today" },
      { title: "✅ Done", payload: "mission:done" },
      { title: "😕 I'm stuck", payload: "stuck:menu" },
    ],
    footer: STOP_FOOTER,
  },
  playbook_stuck: {
    name: "boss_playbook_stuck",
    category: "MARKETING",
    body:
      "🤝 *Let's figure it out together, {{1}}*\n\n" +
      "Day {{2}} of your {{3}} is still open, and that's okay. Usually one small thing is in the way.\n\n" +
      "What is it for you?",
    params: (c) => {
      const s = stepFor(c);
      return [first(c), String(s.index + 1), lowerFirst(s.playbook.title)];
    },
    example: ["Ana", "2", "launch program"],
    quickReplies: [
      { title: "⏰ No time", payload: "stuck:time" },
      { title: "🤔 Not sure how", payload: "stuck:how" },
      { title: "💭 Does it work?", payload: "stuck:doubt" },
    ],
    footer: STOP_FOOTER,
  },
  playbook_paused: {
    name: "boss_playbook_paused",
    category: "MARKETING",
    body:
      "💛 *I'm here when you're ready, {{1}}*\n\n" +
      "I'll stop the daily steps for now so I don't flood you. *{{2}}* is waiting for you, right where you left it.\n\n" +
      "Write me anything and we pick up together.",
    params: (c) => [first(c), brand(c)],
    example: ["Ana", "Ana Arena"],
    quickReplies: [
      { title: "▶️ Let's continue", payload: "play:today" },
      { title: "🙋 Talk to a person", payload: "handoff:start" },
    ],
    footer: STOP_FOOTER,
  },
  plan_checkin: {
    name: "boss_plan_checkin",
    category: "MARKETING",
    body:
      "🌙 *Quick check, {{1}}*\n\n" +
      "Did you get to today's step: *{{2}}*?\n\n" +
      "Busy day? The 2-minute version counts too: {{3}}.",
    params: (c) => {
      const s = stepFor(c);
      return [first(c), s.step.title, s.small];
    },
    example: ["Ana", "Open your Instagram", "create the account with your brand name, the rest can wait"],
    quickReplies: [
      { title: "✅ Done", payload: "mission:done" },
      { title: "😕 I'm stuck", payload: "stuck:menu" },
    ],
    footer: STOP_FOOTER,
  },
  playbook_done: {
    name: "boss_playbook_done",
    category: "UTILITY",
    body:
      "🏁 *{{1}} complete, {{2}}!*\n\n" +
      "{{3}} days of real work on *{{4}}*. That's how brands get built.\n\n" +
      "Next: your goal for the month, from your own numbers. Tap below and we set it.",
    params: (c) => {
      const pb = getPlaybook(c.coach?.state.playbook?.id ?? "launch") ?? getPlaybook("launch")!;
      return [pb.title, first(c), num(pb.steps.length), brand(c)];
    },
    example: ["Launch program", "Ana", "10", "Ana Arena"],
    quickReplies: [
      { title: "🎯 Set my goal", payload: "goal:new" },
      { title: "📣 Next campaign", payload: "play:menu" },
    ],
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
      "{{2}} new players joined today. Your best day so far. Your marketing is working.\n\n" +
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
