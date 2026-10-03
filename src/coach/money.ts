/**
 * Earnings math — turns "I want to earn X a month" into a number of players and a plan,
 * from the Boss's own numbers only. Everything is an estimate ("about"); when there isn't
 * enough data yet, it says so instead of guessing.
 */
import type { ContentCtx } from "../content/context.js";
import { money, num } from "../util/format.js";
import type { Insights } from "./insights.js";
import type { GoalProposal } from "./types.js";

const WEEKS_PER_MONTH = 4.33;

export type MoneyMath =
  | {
      kind: "estimate";
      targetMonthly: number;
      /** What one active player brought the Boss, per month (from this week × 4.33). */
      perActiveMonthly: number;
      currentMonthly: number;
      activeNeeded: number;
      activeNow: number;
      /** Players to bring so that enough of them stay active (uses the Boss's own activation rate). */
      playersToBring: number;
      alreadyThere: boolean;
    }
  | { kind: "no_data"; targetMonthly: number; activeNow: number };

export function moneyMath(ctx: ContentCtx, insights: Insights, targetMonthly: number): MoneyMath {
  const s = ctx.boss.stats;
  const perActiveWeekly = insights.earningsPerActive;
  if (perActiveWeekly === null || perActiveWeekly <= 0) return { kind: "no_data", targetMonthly, activeNow: s.activePlayers7d };
  const perActiveMonthly = perActiveWeekly * WEEKS_PER_MONTH;
  const activeNeeded = Math.ceil(targetMonthly / perActiveMonthly);
  const activeRate = Math.min(1, Math.max(0.2, insights.activationRate ?? 0.5));
  const moreActive = Math.max(0, activeNeeded - s.activePlayers7d);
  return {
    kind: "estimate",
    targetMonthly,
    perActiveMonthly,
    currentMonthly: s.earnings7d * WEEKS_PER_MONTH,
    activeNeeded,
    activeNow: s.activePlayers7d,
    playersToBring: Math.ceil(moreActive / activeRate),
    alreadyThere: moreActive === 0,
  };
}

/** The goal that matches the math: earnings when we can estimate, otherwise the first players. */
export function moneyGoal(m: MoneyMath, now: Date): GoalProposal {
  if (m.kind === "estimate" && !m.alreadyThere) return { metric: "earnings", target: m.targetMonthly, days: 30, proposedAt: now.toISOString() };
  if (m.kind === "estimate") return { metric: "earnings", target: Math.round(m.targetMonthly * 1.5), days: 30, proposedAt: now.toISOString() };
  return { metric: "players", target: 5, days: 14, proposedAt: now.toISOString() };
}

/** "300", "$1,000", "1k", "2.5k" → number; null when there's no amount. */
export function parseAmount(text: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(k)?/i.exec(text.replace(/,(?=\d{3}\b)/g, ""));
  if (!m) return null;
  const n = Number(m[1]!.replace(",", ".")) * (m[2] ? 1000 : 1);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** The explanation the Boss reads. */
export function moneyExplanation(ctx: ContentCtx, m: MoneyMath): string {
  const cur = ctx.boss.stats.currency;
  const target = money(m.targetMonthly, cur, { whole: true });
  if (m.kind === "no_data") {
    return (
      `💰 *${target} a month from ${ctx.boss.brandName}*\n\n` +
      `I can't put a number on it yet: I need your first 3 active players to see what each one brings you. That's the point of your first week. ` +
      `after it I'll tell you exactly how many players ${target} takes.\n\n👉 The plan until then is simple: *your first 5 players*.`
    );
  }
  const per = money(m.perActiveMonthly, cur);
  const now = money(m.currentMonthly, cur, { whole: true });
  if (m.alreadyThere) {
    return (
      `💰 *${target} a month from ${ctx.boss.brandName}*\n\n` +
      `You're already there: about *${now} a month* at your current pace, with ${num(m.activeNow)} active players (each brings you about ${per} a month).\n\n` +
      `👉 Let's aim higher: *${money(m.targetMonthly * 1.5, cur, { whole: true })}*. Same math, more players.`
    );
  }
  return (
    `💰 *${target} a month from ${ctx.boss.brandName}*\n\n` +
    `Each active player brings you about *${per} a month*. So ${target} takes about *${num(m.activeNeeded)} active players*. You have ${num(m.activeNow)} now (about ${now} a month).\n\n` +
    `Not every player you bring stays active, so the plan is: *bring about ${num(m.playersToBring)} more players* and keep them playing.\n\n` +
    `👉 That's the goal. Lock it in and I'll push you toward it every day.`
  );
}
