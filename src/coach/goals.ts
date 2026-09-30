/**
 * Personal goals: proposed from the Boss's own pace, tracked daily, celebrated when reached.
 */
import type { BossProfile } from "../platform/types.js";
import { money, num, shortDate } from "../util/format.js";
import { DAY } from "../util/time.js";
import type { Insights } from "./insights.js";
import type { Goal, GoalMetric, GoalProposal } from "./types.js";

export interface GoalView {
  goal: Goal;
  progress: number;
  pct: number;
  daysLeft: number;
  status: "ahead" | "on_track" | "behind" | "achieved" | "expired";
  /** Needed per day from now to hit the target. */
  neededPerDay: number;
  /** Achieved per day so far. */
  currentPerDay: number;
  /** "18/40 new players" or "$220/$500 earned" */
  label: string;
}

export function currentValue(metric: GoalMetric, boss: BossProfile): number {
  return metric === "players" ? boss.stats.totalPlayers : boss.stats.earningsTotal;
}

export function formatAmount(metric: GoalMetric, amount: number, currency: string): string {
  if (metric === "players") return `${num(Math.round(amount))} new players`;
  return money(amount, currency, { whole: Number.isInteger(amount) && amount >= 10 });
}

export function goalView(goal: Goal, boss: BossProfile, now: Date): GoalView {
  const progress = Math.max(0, currentValue(goal.metric, boss) - goal.startValue);
  const start = new Date(goal.startAt).getTime();
  const end = new Date(goal.deadline).getTime();
  const elapsedDays = Math.max((now.getTime() - start) / DAY, 0);
  const totalDays = Math.max((end - start) / DAY, 1);
  const daysLeft = Math.max(Math.ceil((end - now.getTime()) / DAY), 0);
  const pct = Math.min(100, Math.round((progress / goal.target) * 100));
  const expected = goal.target * Math.min(elapsedDays / totalDays, 1);

  let status: GoalView["status"];
  if (goal.status === "achieved" || progress >= goal.target) status = "achieved";
  else if (goal.status === "expired" || now.getTime() > end) status = "expired";
  else if (elapsedDays < 1) status = "on_track";
  else if (progress >= expected * 1.1) status = "ahead";
  else if (progress >= expected * 0.85) status = "on_track";
  else status = "behind";

  const cur = boss.stats.currency;
  const label =
    goal.metric === "players"
      ? `${num(Math.round(progress))}/${num(goal.target)} new players`
      : `${money(progress, cur)}/${money(goal.target, cur)} earned`;

  return {
    goal,
    progress,
    pct,
    daysLeft,
    status,
    neededPerDay: daysLeft > 0 ? Math.max(goal.target - progress, 0) / daysLeft : 0,
    currentPerDay: elapsedDays >= 1 ? progress / elapsedDays : progress,
    label,
  };
}

/** One-line status for templates, e.g. "18/40 new players · on track". */
export function goalStatusLine(view: GoalView | null): string {
  if (!view) return "not set yet";
  const status = { ahead: "ahead of pace 🚀", on_track: "on track ✅", behind: "behind pace ⚠️", achieved: "reached 🏆", expired: "ended" }[view.status];
  return `${view.label} · ${status}`;
}

/** Rounds to a target that feels intentional (7, 25, 40, 150, 1,200…). */
export function roundNice(n: number): number {
  if (n < 20) return Math.max(1, Math.round(n));
  if (n < 100) return Math.round(n / 5) * 5;
  if (n < 1000) return Math.round(n / 10) * 10;
  return Math.round(n / 100) * 100;
}

/** A stretching-but-reachable goal based on the Boss's own recent pace. */
export function proposeGoal(boss: BossProfile, insights: Insights, now: Date, previous?: Goal | null): GoalProposal {
  const s = boss.stats;
  const usePlayers = s.totalPlayers < 20 || s.earnings7d <= 0;
  const metric: GoalMetric = usePlayers ? "players" : "earnings";
  let target: number;
  let days = 28;

  if (metric === "players") {
    if (s.totalPlayers === 0) {
      target = 5;
      days = 14;
    } else {
      const weekly = Math.max(insights.newPlayers.current, 1);
      target = roundNice(Math.max(5, weekly * 4 * 1.3));
    }
  } else {
    target = roundNice(s.earnings7d * 4 * 1.25);
  }

  // After a win, the next goal is always bigger than the last one of the same kind.
  if (previous?.status === "achieved" && previous.metric === metric) {
    target = Math.max(target, roundNice(previous.target * 1.2));
  }
  return { metric, target, days, proposedAt: now.toISOString() };
}

export function adjustProposal(p: GoalProposal, factor: number): GoalProposal {
  return { ...p, target: Math.max(1, roundNice(p.target * factor)) };
}

export function startGoal(boss: BossProfile, metric: GoalMetric, target: number, days: number, now: Date): Goal {
  return {
    metric,
    target,
    startValue: currentValue(metric, boss),
    startAt: now.toISOString(),
    deadline: new Date(now.getTime() + days * DAY).toISOString(),
    status: "active",
  };
}

/** "40 new players by Oct 28" */
export function describeProposal(p: GoalProposal, boss: BossProfile, now: Date, timeZone: string): string {
  return `${formatAmount(p.metric, p.target, boss.stats.currency)} by ${shortDate(new Date(now.getTime() + p.days * DAY).toISOString(), timeZone).replace(/, \d{4}$/, "")}`;
}
