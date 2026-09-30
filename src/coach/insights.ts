/**
 * Turns the Boss's live numbers + daily snapshots into coaching insights: week-over-week
 * trends, where the money is (earnings per active player), and what to fix first.
 * Every number is derived from the Boss's own data — nothing is invented.
 */
import type { ContentCtx } from "../content/context.js";
import { money, num } from "../util/format.js";
import type { StatSnapshot } from "./types.js";

export interface Trend {
  current: number;
  previous: number | null;
  /** Rounded % change vs previous week, null when there's no comparable week. */
  changePct: number | null;
}

export interface Insight {
  id: string;
  tone: "good" | "warn" | "info";
  text: string;
  priority: number;
}

export interface Insights {
  newPlayers: Trend;
  earnings: Trend;
  activePlayers: Trend;
  /** Earnings in the last 7 days divided by active players (null when too little data). */
  earningsPerActive: number | null;
  inactivePlayers: number;
  activationRate: number | null;
  /** Highest newPlayersToday on any previous day we have a snapshot for. */
  bestDayRecord: number;
  historyDays: number;
  tips: Insight[];
}

function trend(current: number, previous: number | null): Trend {
  if (previous === null) return { current, previous, changePct: null };
  if (previous === 0) return { current, previous, changePct: current > 0 ? 100 : 0 };
  return { current, previous, changePct: Math.round(((current - previous) / previous) * 100) };
}

export function formatChange(t: Trend): string {
  if (t.changePct === null) return "first week";
  if (t.changePct === 0) return "same as last week";
  return `${t.changePct > 0 ? "+" : ""}${t.changePct}% vs last week`;
}

/** The snapshot from ~7 days ago (tolerates a missing day or two). */
function weekAgo(snapshots: StatSnapshot[], today: string): StatSnapshot | null {
  const target = addDays(today, -7);
  const floor = addDays(today, -9);
  const candidates = snapshots.filter((s) => s.date <= target && s.date >= floor);
  return candidates.at(-1) ?? null;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeInsights(ctx: ContentCtx, snapshots: StatSnapshot[], today: string): Insights {
  const s = ctx.boss.stats;
  const prev = weekAgo(snapshots, today);
  const previousDays = snapshots.filter((x) => x.date < today);

  const newPlayers = trend(s.newPlayers7d, prev?.newPlayers7d ?? null);
  const earnings = trend(s.earnings7d, prev?.earnings7d ?? null);
  const activePlayers = trend(s.activePlayers7d, prev?.activePlayers7d ?? null);
  const earningsPerActive = s.activePlayers7d >= 3 && s.earnings7d > 0 ? s.earnings7d / s.activePlayers7d : null;
  const inactivePlayers = Math.max(0, s.totalPlayers - s.activePlayers7d);
  const activationRate = s.totalPlayers > 0 ? s.activePlayers7d / s.totalPlayers : null;
  const bestDayRecord = previousDays.reduce((m, x) => Math.max(m, x.newPlayersToday), 0);

  const tips: Insight[] = [];
  const cur = s.currency;

  if (newPlayers.changePct !== null && (newPlayers.previous ?? 0) >= 3 && newPlayers.changePct <= -20) {
    tips.push({ id: "players_down", tone: "warn", priority: 90, text: `👥 New players are down ${Math.abs(newPlayers.changePct)}% vs last week (${num(newPlayers.current)} vs ${num(newPlayers.previous!)}). Let's push your link this week.` });
  } else if (newPlayers.changePct !== null && newPlayers.current > 0 && newPlayers.changePct >= 10) {
    tips.push({ id: "players_up", tone: "good", priority: 60, text: `👥 ${num(newPlayers.current)} new players this week — up ${newPlayers.changePct}% vs last week. Keep the momentum!` });
  }

  if (earnings.changePct !== null && (earnings.previous ?? 0) > 0 && earnings.changePct <= -20) {
    tips.push({ id: "earnings_down", tone: "warn", priority: 85, text: `💰 Your earnings are down ${Math.abs(earnings.changePct)}% vs last week (${money(earnings.current, cur)} vs ${money(earnings.previous!, cur)}). Bringing players back is the fastest fix.` });
  } else if (earnings.changePct !== null && earnings.current > 0 && earnings.changePct >= 10) {
    tips.push({ id: "earnings_up", tone: "good", priority: 55, text: `💰 You earned ${money(earnings.current, cur)} this week — up ${earnings.changePct}% vs last week. 🚀` });
  }

  if (earningsPerActive !== null && inactivePlayers >= 5) {
    const comeback = Math.min(10, inactivePlayers);
    tips.push({
      id: "reactivation_value",
      tone: "info",
      priority: 80,
      text: `💡 Each active player brought you about ${money(earningsPerActive, cur)} this week. Bringing back ${comeback} of your ${num(inactivePlayers)} inactive players could mean about +${money(earningsPerActive * comeback, cur)} a week.`,
    });
  }

  if (activationRate !== null && s.totalPlayers >= 10 && activationRate < 0.35) {
    tips.push({ id: "low_activation", tone: "warn", priority: 75, text: `🔥 Only ${Math.round(activationRate * 100)}% of your players were active this week. Your players are your earnings — invite them back.` });
  }

  if (ctx.stage !== "live") {
    tips.push({ id: "agent_missing", tone: "info", priority: 70, text: "🤖 Your AI Agent isn't posting for you yet — that's daily marketing for your brand you're not getting." });
  } else if (ctx.boss.aiAgent.postsPublished7d > 0) {
    tips.push({ id: "agent_working", tone: "good", priority: 40, text: `🤖 Your AI Agent published ${num(ctx.boss.aiAgent.postsPublished7d)} posts for your brand this week.` });
  }

  if (s.totalPlayers === 0 && ctx.boss.brandLaunchedAt) {
    tips.push({ id: "no_players", tone: "warn", priority: 95, text: "👥 Your brand is live but has no players yet. Your first share is the most important one." });
  }

  if (!prev) {
    tips.push({ id: "no_history", tone: "info", priority: 10, text: "📈 From next week I'll compare your numbers week over week." });
  }

  tips.sort((a, b) => b.priority - a.priority);
  return {
    newPlayers,
    earnings,
    activePlayers,
    earningsPerActive,
    inactivePlayers,
    activationRate,
    bestDayRecord,
    historyDays: previousDays.length,
    tips,
  };
}
