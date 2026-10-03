/**
 * Daily missions — one concrete action per day that moves the Boss's numbers.
 *
 * The picker scores every mission against the Boss's stage, insights and goal, so the
 * mission is always the most valuable thing to do *today* (activate the Agent first,
 * then bring players, then bring players back…). Missions with `verify` are checked
 * against the live account; the rest are self-reported.
 *
 * `task` and `why` must stay single-line (they're WhatsApp template variables).
 */
import type { GoalMetric, MissionRecord } from "../coach/types.js";
import type { Insights } from "../coach/insights.js";
import { agentStage, type BossProfile } from "../platform/types.js";
import { DAY, daysBetween } from "../util/time.js";
import type { ChannelId } from "./channels.js";
import type { ContentCtx } from "./context.js";
import type { GuideId } from "./guides.js";
import type { CtaId } from "./links.js";

export interface MissionInput {
  ctx: ContentCtx;
  insights: Insights;
  goalMetric: GoalMetric | null;
  /** Missions from the last ~60 days. */
  history: MissionRecord[];
}

export interface MissionDef {
  id: string;
  /** Short name, e.g. "Share your link in 3 groups" (≤ 60 chars). */
  title: string;
  task: string;
  why: string;
  cta?: CtaId;
  guide?: GuideId;
  points: number;
  verify?: (boss: BossProfile, now: Date) => boolean;
  /** 0 = not relevant now; higher = more valuable today. */
  score: (m: MissionInput) => number;
  /** Days before the same mission can be given again (default 3). */
  cooldownDays?: number;
  /** Only ever completed once (e.g. adding the link to a bio). */
  once?: boolean;
  /** Completing it means this marketing channel is in use. */
  channel?: ChannelId;
}

const goalIs = (m: MissionInput, metric: GoalMetric) => (m.goalMetric === metric ? 1 : 0);
const launchedDays = (m: MissionInput) => daysBetween(m.ctx.boss.brandLaunchedAt, m.ctx.now) ?? 99;

export const MISSIONS: MissionDef[] = [
  {
    id: "activate_agent",
    title: "Activate your AI Marketing Agent",
    task: "Activate your AI Marketing Agent in your Boss Hub (it takes about a minute).",
    why: "From then on your brand gets marketing every day without you lifting a finger.",
    cta: "agent_activate",
    guide: "activate_agent",
    points: 50,
    verify: (b) => b.aiAgent.activated,
    score: (m) => (m.ctx.stage === "not_activated" ? 100 : 0),
    cooldownDays: 1,
  },
  {
    id: "connect_socials",
    title: "Connect your socials to your AI Agent",
    task: "Connect at least one social account (Instagram, TikTok…) to your AI Agent.",
    why: "It's the last step before your Agent starts promoting your brand automatically.",
    cta: "agent_socials",
    guide: "connect_socials",
    points: 50,
    verify: (b) => agentStage(b) === "live",
    score: (m) => (m.ctx.stage === "needs_socials" ? 98 : 0),
    cooldownDays: 1,
  },
  {
    id: "setup_payouts",
    title: "Set up your payouts",
    task: "Add your payout method in Boss Hub → Payouts.",
    why: "You're already earning — make sure your earnings can reach you.",
    cta: "payouts",
    guide: "setup_payouts",
    points: 30,
    verify: (b) => b.payouts.methodConfigured,
    score: (m) => (m.ctx.boss.stats.earningsTotal > 0 && !m.ctx.boss.payouts.methodConfigured ? 90 : 0),
    cooldownDays: 2,
  },
  {
    id: "check_dashboard",
    title: "Check your numbers",
    task: "Open your Boss Hub dashboard and look at this week's players and earnings.",
    why: "Knowing your numbers shows you exactly where to push next.",
    cta: "dashboard",
    points: 10,
    verify: (b, now) => !!b.lastActiveAt && now.getTime() - new Date(b.lastActiveAt).getTime() < DAY,
    score: (m) => {
      const last = m.ctx.boss.lastActiveAt;
      const days = last ? (m.ctx.now.getTime() - new Date(last).getTime()) / DAY : 99;
      return days >= 3 ? 60 : 0;
    },
    cooldownDays: 5,
  },
  {
    id: "bio_link",
    title: "Put your link in your bio",
    task: "Add your brand link to your Instagram and TikTok bio.",
    why: "Every profile visit becomes a chance to bring a player — forever.",
    cta: "brand_link",
    points: 15,
    // Most valuable early on; established Bosses usually have it already.
    score: (m) => (m.ctx.boss.stats.totalPlayers < 50 ? 52 : 25),
    once: true,
  },
  {
    id: "share_groups",
    title: "Share your link in 3 groups",
    task: "Send your brand link to 3 WhatsApp groups where people know you.",
    why: "People who already know you are the most likely to join your brand.",
    cta: "brand_link",
    guide: "share_link",
    points: 15,
    channel: "whatsapp_groups",
    score: (m) => 46 + 15 * goalIs(m, "players") + (m.ctx.boss.stats.totalPlayers < 10 ? 10 : 0),
  },
  {
    id: "share_status",
    title: "Post your link on your status",
    task: "Post your brand link on your WhatsApp status today.",
    why: "Everyone who has your number sees it — your easiest free reach.",
    cta: "brand_link",
    points: 10,
    channel: "whatsapp_status",
    score: (m) => 42 + 15 * goalIs(m, "players") + (m.ctx.boss.stats.totalPlayers < 10 ? 10 : 0),
    cooldownDays: 2,
  },
  {
    id: "invite_friends",
    title: "Invite 5 friends personally",
    task: "Send a personal message with your brand link to 5 friends.",
    why: "A personal invite is the most direct way to bring a new player.",
    cta: "brand_link",
    points: 20,
    score: (m) => (m.ctx.boss.stats.totalPlayers < 50 ? 44 + 15 * goalIs(m, "players") : 20),
  },
  {
    id: "reengage_players",
    title: "Bring 5 players back",
    task: "Message 5 of your players who weren't active this week and invite them back.",
    why: "Players who come back bring activity — and activity is your earnings.",
    cta: "players",
    points: 20,
    score: (m) =>
      m.insights.inactivePlayers >= 5
        ? 40 + 20 * goalIs(m, "earnings") + ((m.insights.activationRate ?? 1) < 0.35 ? 12 : 0) + (m.insights.inactivePlayers >= 20 ? 15 : 0)
        : 0,
  },
  {
    id: "post_story",
    title: "Post a story about your brand",
    task: "Post one story about your brand on Instagram or TikTok, with your link.",
    why: "Stories keep your brand in front of your followers every day.",
    cta: "brand_link",
    points: 10,
    score: (m) => (m.ctx.stage === "live" ? 18 : 36),
  },
  {
    id: "share_agent_post",
    title: "Boost your AI Agent's best post",
    task: "Pick your favorite post your AI Agent published this week and share it on your WhatsApp status.",
    why: "Your Agent creates the content — you multiply its reach.",
    cta: "agent_view",
    points: 10,
    score: (m) => (m.ctx.stage === "live" && m.ctx.boss.aiAgent.postsPublished7d > 0 ? 34 : 0),
  },
  {
    id: "welcome_players",
    title: "Welcome your new players",
    task: "Send a personal welcome message to every player who joined this week.",
    why: "A player who feels welcome plays — and activity is your earnings.",
    cta: "players",
    points: 10,
    score: (m) => (m.ctx.boss.stats.newPlayers7d > 0 && m.ctx.boss.stats.totalPlayers <= 30 ? 38 : 0),
  },
  {
    id: "second_touch",
    title: "Follow up with the people you invited",
    task: "Message the people you invited who haven't joined yet — one friendly reminder, no pressure.",
    why: "Most people join on the second message, not the first.",
    cta: "brand_link",
    points: 15,
    score: (m) => (launchedDays(m) <= 30 && m.ctx.boss.stats.totalPlayers < 20 ? 32 : 0),
    cooldownDays: 4,
  },
  {
    id: "ask_referral",
    title: "Ask 3 players to bring a friend",
    task: "Ask 3 of your players to bring one friend each, with your brand link ready to forward.",
    why: "A player's friend is your cheapest new player — and friends keep each other playing.",
    cta: "players",
    points: 20,
    score: (m) => (m.ctx.boss.stats.activePlayers7d >= 2 ? 30 + 10 * goalIs(m, "players") : 0),
    cooldownDays: 5,
  },
  {
    id: "open_channel",
    title: "Open your next marketing channel",
    task: "Open your next marketing channel for your brand and put your brand link in its bio.",
    why: "Every new channel is a new door for players to find your brand.",
    cta: "brand_link",
    points: 25,
    score: (m) => (m.ctx.boss.stats.totalPlayers < 50 ? 28 : 12),
    cooldownDays: 7,
  },
  {
    id: "plan_month",
    title: "Set your plan for the month",
    task: "Review your numbers from this week with me and set your goal for the next 3 weeks.",
    why: "A brand with a target grows on purpose, not by luck.",
    cta: "dashboard",
    points: 20,
    // Only given as the last day of a playbook (never by the daily picker).
    score: () => 0,
  },
];

export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

/**
 * Chooses the most valuable mission for today, skipping missions on cooldown, one-time
 * missions already done, and anything in `exclude` (e.g. today's already-finished mission).
 */
export function pickMission(input: MissionInput, exclude: string[] = []): MissionDef {
  const today = input.ctx.now.getTime();
  const lastGiven = new Map<string, number>();
  const everDone = new Set<string>();
  for (const r of input.history) {
    lastGiven.set(r.missionId, Math.max(lastGiven.get(r.missionId) ?? 0, new Date(r.assignedAt).getTime()));
    if (r.status === "done") everDone.add(r.missionId);
  }
  const ranked = MISSIONS.map((m) => ({ m, score: m.score(input) }))
    .filter(({ m, score }) => score > 0 && !exclude.includes(m.id) && !(m.once && everDone.has(m.id)))
    .sort((a, b) => b.score - a.score);

  const fresh = ranked.find(({ m }) => {
    const last = lastGiven.get(m.id);
    return !last || today - last >= (m.cooldownDays ?? 3) * DAY;
  });
  return (fresh ?? ranked[0])?.m ?? MISSIONS.find((m) => m.id === "share_status")!;
}
