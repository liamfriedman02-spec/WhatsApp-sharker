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
 *   recurring – digests; the condition itself encodes timing
 */
import type { ContentCtx } from "../content/context.js";
import { NUDGES, type NudgeTemplate } from "../content/nudges.js";
import type { BossState, NudgeCategory } from "../store/store.js";
import { daysBetween, type LocalTime } from "../util/time.js";

export interface TriggerInput {
  ctx: ContentCtx;
  state: BossState;
  local: LocalTime;
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
}

const launchedDaysAgo = ({ ctx }: TriggerInput) => daysBetween(ctx.boss.brandLaunchedAt, ctx.now);

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
    id: "no_players",
    category: "reminder",
    priority: 72,
    schedule: { type: "series", gapsDays: [3, 5] },
    when: (i) => i.ctx.boss.stats.totalPlayers === 0 && (launchedDaysAgo(i) ?? -1) >= 2,
    template: (_, step) => [NUDGES.no_players_1, NUDGES.no_players_2, NUDGES.no_players_3][step]!,
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
    id: "weekly_summary",
    category: "digest",
    priority: 30,
    schedule: { type: "recurring" },
    // Monday morning; slides to Tue/Wed when a higher-priority message took Monday's slot.
    when: (i) => {
      const { state, local, lastSent, ctx } = i;
      if (state.digest === "off" || local.weekday < 1 || local.weekday > 3 || local.hour < 10) return false;
      if ((launchedDaysAgo(i) ?? 0) < 7) return false;
      const last = lastSent("weekly_summary");
      return !last || daysBetween(last.toISOString(), ctx.now)! >= 6;
    },
    template: () => NUDGES.weekly_summary,
  },
];

export function seriesLength(trigger: Trigger): number {
  return trigger.schedule.type === "series" ? trigger.schedule.gapsDays.length + 1 : 1;
}
