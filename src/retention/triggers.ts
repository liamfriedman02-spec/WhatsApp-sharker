/**
 * Retention & activation triggers.
 *
 * Every trigger is a pure function of the Boss's live data (+ what we already sent), so
 * the periodic sweep and real-time platform events reach the same decision, and a missed
 * webhook is caught by the next sweep.
 *
 * Schedules:
 *   once      – milestone, sent at most once per Boss ever
 *   series    – reminder series with growing gaps and a hard maximum; the series resets
 *               when its condition stops being true (e.g. the Boss activated the Agent)
 *   recurring – digests & coaching; the condition itself encodes timing
 *
 * Coaching triggers (missions, goals, levels, momentum, follow-ups) read the coach view and
 * persist what they sent through `onSent` (e.g. the mission becomes today's mission).
 */
import { plannedMission, plannedProposal } from "../coach/plan.js";
import type { CoachService, CoachView } from "../coach/service.js";
import type { ContentCtx } from "../content/context.js";
import { NUDGES, type NudgeTemplate } from "../content/nudges.js";
import type { BossState, NudgeCategory } from "../store/store.js";
import { HOUR, daysBetween, type LocalTime } from "../util/time.js";

export interface TriggerInput {
  ctx: ContentCtx;
  state: BossState;
  local: LocalTime;
  coach: CoachView;
  lastSent(triggerId: string): Date | null;
}

export type Schedule =
  | { type: "once" }
  /** gapsDays[i] = minimum days between reminder i and reminder i+1; max reminders = variants. */
  | { type: "series"; gapsDays: number[] }
  | { type: "recurring" };

export interface Trigger {
  id: string;
  category: NudgeCategory;
  /** Higher wins when several triggers are eligible at once. */
  priority: number;
  schedule: Schedule;
  when(input: TriggerInput): boolean;
  /** Copy for reminder number `step` (0-based). */
  template(input: TriggerInput, step: number): NudgeTemplate;
  /** Persists coaching side effects after the message went out. */
  onSent?(input: TriggerInput, coach: CoachService): Promise<void>;
}

const launchedDaysAgo = ({ ctx }: TriggerInput) => daysBetween(ctx.boss.brandLaunchedAt, ctx.now);
const hoursSince = (d: Date | null, now: Date) => (d ? (now.getTime() - d.getTime()) / HOUR : Infinity);

/** Mission days per intensity (0 = Sunday). Monday is covered by the weekly coaching. */
const MISSION_DAYS = { light: [], standard: [2, 4], intense: [0, 2, 3, 4, 5, 6] } as const;

/** The mission named in the message becomes today's mission (so "✅ Done" knows what to check). */
async function assignPlannedMission({ ctx, coach }: TriggerInput, svc: CoachService): Promise<void> {
  if (coach.todayMission?.record.status === "open") return;
  await svc.assign(ctx, coach, plannedMission(ctx));
}

export const TRIGGERS: Trigger[] = [
  {
    id: "welcome",
    category: "milestone",
    priority: 100,
    schedule: { type: "once" },
    when: ({ ctx }) => ctx.boss.brandLaunchedAt !== null,
    template: () => NUDGES.welcome,
  },
  {
    id: "first_earnings",
    category: "milestone",
    priority: 95,
    schedule: { type: "once" },
    // All earnings happened in the last 7 days → these are the Boss's first earnings.
    when: ({ ctx }) => ctx.boss.stats.earningsTotal > 0 && ctx.boss.stats.earnings7d >= ctx.boss.stats.earningsTotal,
    template: ({ ctx }) => (ctx.boss.payouts.methodConfigured ? NUDGES.first_earnings : NUDGES.first_earnings_payouts),
  },
  {
    id: "goal_achieved",
    category: "milestone",
    priority: 93,
    schedule: { type: "recurring" },
    when: ({ coach }) => coach.state.goal?.status === "active" && coach.goal?.status === "achieved",
    template: () => NUDGES.goal_achieved,
    onSent: async ({ ctx, coach }, svc) => svc.markGoalAchieved(ctx.boss.id, coach, ctx.now),
  },
  {
    id: "first_player",
    category: "milestone",
    priority: 90,
    schedule: { type: "once" },
    // Every player joined this week and there are only a few → the first player just arrived.
    when: ({ ctx }) => {
      const s = ctx.boss.stats;
      return s.totalPlayers >= 1 && s.totalPlayers <= 10 && s.newPlayers7d >= s.totalPlayers;
    },
    template: () => NUDGES.first_player,
  },
  {
    id: "level_up",
    category: "milestone",
    priority: 88,
    schedule: { type: "recurring" },
    when: ({ coach }) => coach.state.level !== undefined && (coach.level.current?.level ?? 0) > coach.state.level,
    template: () => NUDGES.level_up,
    onSent: async ({ ctx, coach }, svc) => svc.setLevel(ctx.boss.id, coach, coach.level.current?.level ?? 0),
  },
  {
    id: "best_day",
    category: "milestone",
    priority: 87,
    schedule: { type: "recurring" },
    // A new daily record (after at least a week of history, so day one isn't "best ever").
    when: ({ ctx, coach, lastSent }) =>
      coach.insights.historyDays >= 7 &&
      ctx.boss.stats.newPlayersToday >= 5 &&
      ctx.boss.stats.newPlayersToday > coach.insights.bestDayRecord &&
      hoursSince(lastSent("best_day"), ctx.now) >= 20,
    template: () => NUDGES.best_day,
  },
  {
    id: "agent_live",
    category: "milestone",
    priority: 85,
    schedule: { type: "once" },
    // Only celebrate a Boss who *just* went live, not Bosses live long before the bot existed.
    when: ({ ctx }) => ctx.stage === "live" && ctx.boss.aiAgent.postsPublishedTotal <= 3,
    template: () => NUDGES.agent_live,
  },
  {
    id: "agent_first_post",
    category: "milestone",
    priority: 84,
    schedule: { type: "once" },
    when: ({ ctx, lastSent }) =>
      ctx.stage === "live" &&
      ctx.boss.aiAgent.postsPublishedTotal >= 1 &&
      ctx.boss.aiAgent.postsPublishedTotal <= 3 &&
      lastSent("agent_live") !== null,
    template: () => NUDGES.agent_first_post,
  },
  {
    id: "follow_up",
    category: "reminder",
    priority: 89,
    schedule: { type: "recurring" },
    // The Boss told the coach they'd do something — check in when it's due.
    when: ({ ctx, coach }) => coach.state.followUps.some((f) => f.status === "pending" && new Date(f.dueAt) <= ctx.now),
    template: () => NUDGES.follow_up,
    onSent: async ({ ctx, coach }, svc) => {
      const due = coach.state.followUps.find((f) => f.status === "pending" && new Date(f.dueAt) <= ctx.now);
      if (due) await svc.markFollowUp(ctx.boss.id, coach, due.id, "sent");
    },
  },
  {
    id: "agent_connect_socials",
    category: "reminder",
    priority: 80,
    schedule: { type: "series", gapsDays: [2, 4] },
    when: ({ ctx }) => ctx.stage === "needs_socials" && ctx.boss.brandLaunchedAt !== null,
    template: (_, step) => [NUDGES.agent_socials_1, NUDGES.agent_socials_2, NUDGES.agent_socials_3][step]!,
  },
  {
    id: "agent_activate",
    category: "reminder",
    priority: 78,
    schedule: { type: "series", gapsDays: [3, 7] },
    // Give a brand-new Boss one day to settle in (they get the welcome first).
    when: (i) => i.ctx.stage === "not_activated" && (launchedDaysAgo(i) ?? -1) >= 1,
    template: (_, step) => [NUDGES.agent_activate_1, NUDGES.agent_activate_2, NUDGES.agent_activate_3][step]!,
  },
  {
    id: "goal_proposal",
    category: "reminder",
    priority: 55,
    schedule: { type: "recurring" },
    // For engaged Bosses only (inactive ones get "come back" first); at most once a week.
    when: (i) => {
      const { coach, ctx, lastSent, state, local } = i;
      if (coach.state.intensity === "light") return false;
      if (local.weekday !== 3 && local.weekday !== 5) return false; // Wed/Fri: Monday is for weekly coaching
      if (coach.state.goal?.status === "active" || (launchedDaysAgo(i) ?? 0) < 3) return false;
      const lastSeen = Math.max(
        ctx.boss.lastActiveAt ? new Date(ctx.boss.lastActiveAt).getTime() : 0,
        state.lastInboundAt ? new Date(state.lastInboundAt).getTime() : 0,
      );
      if (ctx.now.getTime() - lastSeen > 7 * 24 * HOUR) return false;
      const achievedAt = coach.state.goal?.achievedAt ? new Date(coach.state.goal.achievedAt) : null;
      if (hoursSince(achievedAt, ctx.now) < 48) return false; // let the win sink in first
      return hoursSince(lastSent("goal_proposal"), ctx.now) >= 7 * 24;
    },
    template: () => NUDGES.goal_proposal,
    onSent: async ({ ctx, coach }, svc) => {
      coach.state.pendingGoal = plannedProposal(ctx);
      await svc.save(ctx.boss.id, coach.state);
    },
  },
  {
    id: "no_players",
    category: "reminder",
    priority: 72,
    schedule: { type: "series", gapsDays: [3, 5] },
    when: (i) => i.ctx.boss.stats.totalPlayers === 0 && (launchedDaysAgo(i) ?? -1) >= 2,
    template: (_, step) => [NUDGES.no_players_1, NUDGES.no_players_2, NUDGES.no_players_3][step]!,
  },
  {
    id: "momentum_drop",
    category: "reminder",
    priority: 70,
    // One alert per drop; the series resets once new players recover.
    schedule: { type: "series", gapsDays: [] },
    when: ({ coach }) =>
      coach.state.intensity !== "light" &&
      (coach.insights.newPlayers.previous ?? 0) >= 5 &&
      (coach.insights.newPlayers.changePct ?? 0) <= -30,
    template: () => NUDGES.momentum_drop,
    onSent: assignPlannedMission,
  },
  {
    id: "weekly_coaching",
    category: "digest",
    priority: 58,
    schedule: { type: "recurring" },
    // Monday morning; slides to Tue/Wed when a higher-priority message took Monday's slot.
    when: (i) => {
      const { state, local, lastSent, ctx } = i;
      if (state.digest === "off" || local.weekday < 1 || local.weekday > 3 || local.hour < 9) return false;
      if ((launchedDaysAgo(i) ?? 0) < 7) return false;
      return hoursSince(lastSent("weekly_coaching"), ctx.now) >= 6 * 24;
    },
    template: () => NUDGES.weekly_coaching,
    onSent: assignPlannedMission,
  },
  {
    id: "inactive",
    category: "reminder",
    priority: 60,
    schedule: { type: "series", gapsDays: [7, 9] },
    when: ({ ctx }) =>
      ctx.boss.brandLaunchedAt !== null && (daysBetween(ctx.boss.lastActiveAt, ctx.now) ?? 0) >= 7,
    template: (_, step) => [NUDGES.inactive_1, NUDGES.inactive_2, NUDGES.inactive_3][step]!,
  },
  {
    id: "daily_summary",
    category: "digest",
    priority: 40,
    schedule: { type: "recurring" },
    when: ({ ctx, state, local, lastSent }) => {
      if (state.digest !== "daily" || local.hour < 18) return false;
      const s = ctx.boss.stats;
      if (s.newPlayersToday === 0 && s.earningsToday === 0) return false; // only when there's news
      const last = lastSent("daily_summary");
      return !last || (ctx.now.getTime() - last.getTime()) / 3_600_000 >= 20;
    },
    template: () => NUDGES.daily_summary,
  },
  {
    id: "daily_mission",
    category: "reminder",
    priority: 50,
    schedule: { type: "recurring" },
    when: ({ coach, local, ctx, lastSent }) => {
      const days: readonly number[] = MISSION_DAYS[coach.state.intensity];
      if (!days.includes(local.weekday) || local.hour < 9 || local.hour >= 20) return false;
      if (!ctx.boss.brandLaunchedAt || coach.todayMission) return false;
      return hoursSince(lastSent("daily_mission"), ctx.now) >= 20;
    },
    template: () => NUDGES.daily_mission,
    onSent: assignPlannedMission,
  },
];

export function seriesLength(trigger: Trigger): number {
  return trigger.schedule.type === "series" ? trigger.schedule.gapsDays.length + 1 : 1;
}
