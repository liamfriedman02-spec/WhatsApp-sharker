/**
 * Coaching screens: today's mission, progress (level + goal + streak), goal proposals,
 * the weekly coaching session and ready-to-post content.
 */
import { formatAmount, goalStatusLine, type GoalView } from "../coach/goals.js";
import { formatChange } from "../coach/insights.js";
import type { ActiveMission, CoachView, MissionResult } from "../coach/service.js";
import type { GoalProposal } from "../coach/types.js";
import type { ContentCtx } from "../content/context.js";
import { levelName, nextLevelNeeds } from "../content/levels.js";
import { ctaLink } from "../content/links.js";
import type { MissionDef } from "../content/missions.js";
import { num, plural, shortDate } from "../util/format.js";
import { DAY } from "../util/time.js";
import type { Button, OutboundMessage } from "../whatsapp/types.js";

const MENU: Button = { id: "menu:main", title: "🏠 Menu" };
const PROGRESS: Button = { id: "coach:progress", title: "🏆 My progress" };
const MISSION: Button = { id: "mission:today", title: "🎯 Today's mission" };

export function bar(pct: number): string {
  const filled = Math.round(Math.min(Math.max(pct, 0), 100) / 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled);
}

export function streakLine(coach: CoachView): string {
  const s = coach.state.streak;
  return `🔥 Streak: ${s > 0 ? `${plural(s, "mission", "missions")} in a row` : "start one today"} · 🏅 ${num(coach.state.points)} points`;
}

function perDay(n: number): string {
  return n >= 10 ? num(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}

export function missionMessage(ctx: ContentCtx, mission: MissionDef, coach: CoachView, intro = "🎯 *Today's mission*"): OutboundMessage {
  const link = mission.cta ? `\n🔗 ${ctaLink(mission.cta, ctx.hubUrl, `mission_${mission.id}`).url}` : "";
  return {
    kind: "buttons",
    body: `${intro}\n\n${mission.task}\n\n💡 ${mission.why}${link}\n\n${streakLine(coach)}`,
    buttons: [
      { id: "mission:done", title: "✅ Done" },
      mission.guide ? { id: `guide:${mission.guide}`, title: "🧭 Guide me" } : { id: "mission:help", title: "🙋 Help me" },
      { id: "mission:skip", title: "🔄 Another one" },
    ],
  };
}

export function missionDoneMessage(result: Extract<MissionResult, { status: "done" }>, coach: CoachView): OutboundMessage {
  const next = coach.level.next
    ? `\n\n${coach.level.next.emoji} Next level: *${coach.level.next.name}* — ${nextLevelNeeds(coach.level)}`
    : "\n\n👑 You're at the top level. Stay there!";
  const goal = coach.goal?.goal.status === "active" ? `\n🎯 Goal: ${goalStatusLine(coach.goal)}` : "";
  return {
    kind: "buttons",
    body: `✅ *Mission complete!* +${result.points} points\n\n${streakLine(coach)}${goal}${next}`,
    buttons: [{ id: "mission:bonus", title: "🎯 Bonus mission" }, PROGRESS, MENU],
  };
}

export function missionAlreadyDoneMessage(coach: CoachView): OutboundMessage {
  return {
    kind: "buttons",
    body: `✅ Today's mission is done — nice work!\n\n${streakLine(coach)}\n\nHungry for more?`,
    buttons: [{ id: "mission:bonus", title: "🎯 Bonus mission" }, PROGRESS, MENU],
  };
}

export function missionNotVerifiedMessage(mission: MissionDef): OutboundMessage {
  return {
    kind: "buttons",
    body: `🤔 I don't see *${mission.title.toLowerCase()}* on your account yet. It can take a minute to update.`,
    buttons: [
      { id: "mission:done", title: "🔁 Check again" },
      mission.guide ? { id: `guide:${mission.guide}`, title: "🧭 Guide me" } : { id: "mission:help", title: "🙋 Help me" },
      MENU,
    ],
  };
}

function goalBlock(goal: GoalView, ctx: ContentCtx): string {
  const deadline = shortDate(goal.goal.deadline, ctx.timezone).replace(/, \d{4}$/, "");
  const status = { ahead: "ahead of pace 🚀", on_track: "on track ✅", behind: "behind pace ⚠️", achieved: "reached 🏆", expired: "ended" }[goal.status];
  const pace =
    goal.status === "ahead" || goal.status === "on_track" || goal.status === "behind"
      ? `\nNeeded: ~${perDay(goal.neededPerDay)}/day · You: ~${perDay(goal.currentPerDay)}/day`
      : "";
  return `🎯 *Your goal:* ${goal.label} by ${deadline}\n${bar(goal.pct)} ${goal.pct}% · ${status}${pace}`;
}

export function progressMessage(ctx: ContentCtx, coach: CoachView): OutboundMessage {
  const lv = coach.level;
  const current = lv.current ? `${lv.current.emoji} Level ${lv.current.level}: *${lv.current.name}*` : "🌱 Level 0: *Getting started*";
  const next = lv.next
    ? `\nNext: ${lv.next.emoji} *${lv.next.name}*\n` +
      lv.nextRequirements.map((r) => `${r.current >= r.target ? "✅" : "⬜"} ${r.label}${r.target > 1 ? ` (${num(r.current)}/${num(r.target)})` : ""}`).join("\n")
    : "\n👑 You're at the top level!";
  const hasGoal = coach.goal && (coach.goal.goal.status === "active" || coach.goal.status === "achieved");
  const goal = hasGoal ? goalBlock(coach.goal!, ctx) : "🎯 *Your goal:* not set yet — a clear target makes you grow faster.";
  const tip = coach.insights.tips[0] ? `\n\n${coach.insights.tips[0].text}` : "";
  return {
    kind: "buttons",
    body: `🏆 *Your progress, ${ctx.boss.firstName}*\n\n${current}${next}\n\n${goal}\n\n${streakLine(coach)}${tip}`.slice(0, 1024),
    buttons: [MISSION, { id: "goal:new", title: coach.state.goal?.status === "active" ? "✏️ Change goal" : "🎯 Set a goal" }, MENU],
  };
}

export function goalProposalMessage(ctx: ContentCtx, p: GoalProposal, coach: CoachView, intro?: string): OutboundMessage {
  const deadline = shortDate(new Date(ctx.now.getTime() + p.days * DAY).toISOString(), ctx.timezone).replace(/, \d{4}$/, "");
  const basis =
    p.metric === "players"
      ? coach.insights.newPlayers.current > 0
        ? `Based on your pace (${plural(coach.insights.newPlayers.current, "new player", "new players")} this week), I suggest:`
        : "Every big brand starts with a first step. I suggest:"
      : `Based on your pace (${formatAmount("earnings", ctx.boss.stats.earnings7d, ctx.boss.stats.currency)} this week), I suggest:`;
  const daily = p.metric === "players" ? `about ${perDay(p.target / p.days)} new players a day` : `about ${formatAmount("earnings", p.target / p.days, ctx.boss.stats.currency)} a day`;
  return {
    kind: "buttons",
    body: `${intro ?? "🎯 *Let's set your goal*"}\n\n${basis}\n*${formatAmount(p.metric, p.target, ctx.boss.stats.currency)} by ${deadline}*\n\nThat's ${daily}. Doable — if you push every day. 💪`,
    buttons: [
      { id: "goal:accept", title: "✅ Let's do it" },
      { id: "goal:higher", title: "📈 Aim higher" },
      { id: "goal:lower", title: "📉 Smaller goal" },
    ],
  };
}

export function goalSetMessage(ctx: ContentCtx, coach: CoachView): OutboundMessage {
  const g = coach.goal!;
  const deadline = shortDate(g.goal.deadline, ctx.timezone).replace(/, \d{4}$/, "");
  const daily = g.goal.metric === "players" ? `${perDay(g.neededPerDay)} new players` : formatAmount("earnings", g.neededPerDay, ctx.boss.stats.currency);
  return {
    kind: "buttons",
    body:
      `🎯 *Goal locked in!*\n\n*${formatAmount(g.goal.metric, g.goal.target, ctx.boss.stats.currency)} by ${deadline}* for *${ctx.boss.brandName}*.\n\n` +
      `That's about ${daily} a day. I'll track it every day and push you when it matters. Let's go! 💪`,
    buttons: [MISSION, PROGRESS, MENU],
  };
}

export function coachSessionMessage(ctx: ContentCtx, coach: CoachView, mission: MissionDef): OutboundMessage {
  const s = ctx.boss.stats;
  const tips = coach.insights.tips.slice(0, 3).map((t) => t.text).join("\n\n");
  const hasGoal = coach.state.goal?.status === "active";
  const lines = [
    `📊 *Your coaching session, ${ctx.boss.firstName}*`,
    "",
    `👥 ${num(s.newPlayers7d)} new players (${formatChange(coach.insights.newPlayers)})`,
    `💰 ${formatAmount("earnings", s.earnings7d, s.currency)} earned (${formatChange(coach.insights.earnings)})`,
    "",
    tips,
    "",
    `🎯 Goal: ${hasGoal ? goalStatusLine(coach.goal) : "not set yet"}`,
    `🏆 Level: ${levelName(coach.level.current)} → next: ${nextLevelNeeds(coach.level)}`,
    "",
    `👉 *This week's focus:* ${mission.title}`,
  ];
  return {
    kind: "buttons",
    body: lines.join("\n").slice(0, 1024),
    buttons: [{ id: "mission:today", title: "🎯 Start mission" }, hasGoal ? PROGRESS : { id: "goal:new", title: "🎯 Set a goal" }, MENU],
  };
}

const LINK_PLACEHOLDER = "[your brand link]";

/** Ready-to-post texts when the AI writer is unavailable. */
export function fallbackPosts(ctx: ContentCtx): string[] {
  const b = ctx.boss.brandName;
  const tag = b.replace(/[^\p{L}\p{N}]/gu, "");
  return [
    `🔥 *${b}* is live! Come join me 👉 {link}`,
    `Big news: ${b} is officially live 🎉 I built it for us — come join me through the link in my bio. See you inside! #${tag}`,
    `POV: you finally launch your own brand 👑 ${b} is live — link in bio. Who's joining me first? 👇`,
  ];
}

export function postsMessages(ctx: ContentCtx, posts: string[]): OutboundMessage[] {
  const link = ctx.boss.brandUrl || LINK_PLACEHOLDER;
  const out: OutboundMessage[] = [
    { kind: "text", text: `✍️ *Ready-to-post texts for ${ctx.boss.brandName}*\n\nCopy, paste, publish 👇 (long-press a message to forward or copy it)` },
    ...posts.map((p): OutboundMessage => ({ kind: "text", text: p.replaceAll("{link}", link) })),
  ];
  const tip = ctx.boss.brandUrl ? "" : `\n\nTip: replace ${LINK_PLACEHOLDER} with your link from Boss Hub → My Brand.`;
  out.push({
    kind: "buttons",
    body: `Post one today and tell me when it's up! 🚀${tip}`,
    buttons: [{ id: "post:write", title: "🔄 New posts" }, MISSION, MENU],
  });
  return out;
}
