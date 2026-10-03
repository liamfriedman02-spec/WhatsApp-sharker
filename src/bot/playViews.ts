/**
 * Screens for the parts of the coach that lead: playbooks (launch sprint, campaigns),
 * ready-to-send texts, marketing channels and the earnings math. Tone: the coach decides,
 * states the plan, and leaves the Boss one obvious tap.
 */
import { moneyExplanation, type MoneyMath } from "../coach/money.js";
import type { CoachView, OpenedStep } from "../coach/service.js";
import type { CoachState } from "../coach/types.js";
import { channelLines, nextChannel } from "../content/channels.js";
import type { ContentCtx } from "../content/context.js";
import { AUDIENCES, comebackText, followUpText, referralText, welcomeText, withLink, type Audience } from "../content/invites.js";
import { availablePlaybooks, getPlaybook, type Playbook } from "../content/playbooks.js";
import { money, plural } from "../util/format.js";
import type { Button, OutboundMessage } from "../whatsapp/types.js";
import { streakLine } from "./coachViews.js";

const MENU: Button = { id: "menu:main", title: "🏠 Menu" };
const MISSION: Button = { id: "mission:today", title: "🎯 Today's mission" };
const DONE: Button = { id: "mission:done", title: "✅ Done" };

// ── Playbooks ───────────────────────────────────────────────────────────────

export function playbookOfferMessage(ctx: ContentCtx, pb: Playbook): OutboundMessage {
  return {
    kind: "buttons",
    body: `${pb.emoji} *${pb.title}*\n\n${pb.intro(ctx)}\n\n${pb.steps.length} days · 10 minutes a day. I prepare everything, you press send.`,
    buttons: [{ id: `play:start:${pb.id}`, title: "🚀 Let's go" }, { id: "mission:today", title: "🎯 Just today" }, MENU],
  };
}

/** The plans this Boss can run now; the active one first. */
export function playbookMenu(ctx: ContentCtx, state: CoachState): OutboundMessage {
  const active = state.playbook?.status === "active" ? getPlaybook(state.playbook.id) : undefined;
  const available = availablePlaybooks(ctx, state);
  if (!active && available.length === 0) {
    return {
      kind: "buttons",
      body: `📣 *Campaigns*\n\nNo campaign fits *${ctx.boss.brandName}* right now. Today's mission is the move. Campaigns unlock as your players grow.`,
      buttons: [MISSION, { id: "texts:menu", title: "💌 Texts for me" }, MENU],
    };
  }
  const rows = [
    ...(active && state.playbook
      ? [{ id: "play:today", title: `${active.emoji} Today's step`, description: `${active.title} · day ${state.playbook.step + 1} of ${active.steps.length}` }]
      : []),
    ...available.map((p) => ({ id: `play:start:${p.id}`, title: `${p.emoji} ${p.title}`, description: p.description })),
  ];
  return {
    kind: "list",
    body: active
      ? `📣 *Campaigns*\n\nYou're in the middle of *${active.title}*. Finish it first. Or switch, your call.`
      : `📣 *Campaigns*\n\nA campaign is a few days with one clear push, everything prepared by me. The first one is the one I'd run for *${ctx.boss.brandName}* now.`,
    buttonLabel: "See campaigns",
    sections: [{ title: "Plans", rows }],
  };
}

/** Today's step: the coach's brief, the mission, the ready texts, and the buttons. */
export function stepMessages(ctx: ContentCtx, opened: OpenedStep, coach: CoachView): OutboundMessage[] {
  const { playbook: pb, index, step, mission } = opened;
  const state = coach.state;
  const day = `Day ${index + 1} of ${pb.steps.length}`;
  const header = `${pb.emoji} *${pb.title}* · ${day}`;
  if (mission.record.status === "done") {
    return [
      {
        kind: "buttons",
        body: `${header}\n\n✅ Today's step is done: *${mission.def.title}*. That's how it's done.\n\n${streakLine(coach)}\n\nTomorrow morning I bring day ${index + 2}. Want it now?`,
        buttons: index + 1 < pb.steps.length ? [{ id: "play:next", title: "⏭️ Next day now" }, { id: "mission:bonus", title: "🎯 Bonus mission" }, MENU] : [{ id: "play:next", title: "🏁 Finish the plan" }, { id: "coach:progress", title: "🏆 My progress" }, MENU],
      },
    ];
  }
  const brief = step.brief(ctx, state);
  const out: OutboundMessage[] = [];
  if (step.ask === "audience") {
    out.push({ kind: "text", text: `${header}\n\n${brief}\n\n🎯 *Today:* ${mission.def.task}` });
    out.push(audienceQuestion());
    return out;
  }
  const texts = (step.texts?.(ctx, state) ?? []).map((t) => withLink(t, ctx));
  out.push({
    kind: "text",
    text: `${header}\n\n${brief}\n\n🎯 *Today:* ${mission.def.task}\n💡 ${mission.def.why}${texts.length ? "\n\n👇 Your texts are below. Forward them, then tap ✅ Done." : ""}`,
  });
  for (const t of texts) out.push({ kind: "text", text: t });
  const extra: Button =
    step.button?.(ctx, state) ?? (mission.def.guide ? { id: `guide:${mission.def.guide}`, title: "🧭 Guide me" } : { id: "texts:menu", title: "💌 Other texts" });
  out.push({
    kind: "buttons",
    body: `${streakLine(coach)}\n\nDone with today's step? Tell me, or tap below.`,
    buttons: [DONE, extra, { id: "play:next", title: "⏭️ Next day" }],
  });
  return out;
}

export function playbookDoneMessage(ctx: ContentCtx, pb: Playbook, coach: CoachView): OutboundMessage {
  return {
    kind: "buttons",
    body: `${pb.success(ctx)}\n\n${streakLine(coach)}\n\n👉 Next: your goal for the month, from your own numbers.`,
    buttons: [{ id: "goal:new", title: "🎯 Set my goal" }, { id: "play:menu", title: "📣 Next campaign" }, MENU],
  };
}

export function playbookStoppedMessage(): OutboundMessage {
  return {
    kind: "buttons",
    body: "Plan paused. No problem. One mission a day keeps you moving, and you can start a campaign anytime.",
    buttons: [MISSION, { id: "play:menu", title: "📣 Campaigns" }, MENU],
  };
}

// ── Texts: invites, welcome, referral… ──────────────────────────────────────

export function audienceQuestion(): OutboundMessage {
  return {
    kind: "list",
    body: "👥 *Who's around you?*\n\nPick a group and I write the invite in your voice. Pick as many as you like. Or just type who you know (\"my football group, a few cousins\").",
    footer: "Or type who you know",
    buttonLabel: "Pick a group",
    sections: [{ title: "Your people", rows: AUDIENCES.map((a) => ({ id: `invite:${a.id}`, title: a.title, description: a.description })) }],
  };
}

export interface Invite {
  /** Who it's for ("👨‍👩‍👧 Family", or what the Boss typed). */
  title: string;
  text: string;
}

export const inviteFor = (ctx: ContentCtx, a: Audience): Invite => ({ title: a.title, text: a.invite(ctx) });

/** The invite(s), each as its own forwardable message. */
export function inviteMessages(ctx: ContentCtx, invites: Invite[]): OutboundMessage[] {
  const intro =
    invites.length === 1
      ? `💌 *Your invite for ${invites[0]!.title.replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase()}*\n\nForward it to 5 people today. One by one. Personal, not broadcast.`
      : `💌 *Your invites*. One per group. Forward each to 5 people today, one by one.`;
  const out: OutboundMessage[] = [{ kind: "text", text: intro }];
  for (const i of invites) out.push({ kind: "text", text: withLink(i.text, ctx) });
  out.push({
    kind: "buttons",
    body: "Sent them? Tell me how many, or tap below.",
    buttons: [{ id: "mission:done", title: "✅ Sent it" }, { id: "texts:menu", title: "💌 More texts" }, MENU],
  });
  return out;
}

export function textsMenu(ctx: ContentCtx): OutboundMessage {
  return {
    kind: "list",
    body: `💌 *Texts for ${ctx.boss.brandName}*\n\nEverything ready to copy and send. Pick what you need right now.`,
    footer: "Or tell me who it's for and I'll write it",
    buttonLabel: "Pick a text",
    sections: [
      { title: "Invite people you know", rows: AUDIENCES.map((a) => ({ id: `invite:${a.id}`, title: a.title, description: a.description })) },
      {
        title: "Your players",
        rows: [
          { id: "invite:welcome", title: "👋 Welcome a new player", description: "Turns a sign-up into a player who plays" },
          { id: "invite:referral", title: "🤝 Ask for a friend", description: "Your players bring the next players" },
          { id: "invite:followup", title: "🔁 Friendly follow-up", description: "For people who didn't answer your invite" },
          { id: "invite:comeback", title: "👀 Bring a player back", description: "For players who didn't play this week" },
        ],
      },
      { title: "Social media", rows: [{ id: "post:write", title: "✍️ Posts for socials", description: "Status, Instagram and TikTok texts" }] },
    ],
  };
}

const PLAYER_TEXTS: Record<string, { title: string; text: (ctx: ContentCtx) => string; tip: string }> = {
  welcome: { title: "👋 *Welcome text for a new player*", text: welcomeText, tip: "Send it the day they join. A welcomed player plays." },
  referral: { title: "🤝 *Ask a player to bring a friend*", text: referralText, tip: "Send it to your 3 most active players, one by one." },
  followup: { title: "🔁 *Friendly follow-up*", text: followUpText, tip: "For anyone who got your invite 2 or 3 days ago and didn't answer." },
  comeback: { title: "👀 *Comeback message*", text: comebackText, tip: "For players who didn't play this week. Short and warm." },
};

export function playerTextMessages(ctx: ContentCtx, kind: string): OutboundMessage[] | null {
  const t = PLAYER_TEXTS[kind];
  if (!t) return null;
  return [
    { kind: "text", text: `${t.title}\n\n${t.tip}` },
    { kind: "text", text: withLink(t.text(ctx), ctx) },
    { kind: "buttons", body: "Sent it? Tap below, or tell me.", buttons: [{ id: "mission:done", title: "✅ Sent it" }, { id: "texts:menu", title: "💌 More texts" }, MENU] },
  ];
}

// ── Channels ────────────────────────────────────────────────────────────────

export function channelsMessage(ctx: ContentCtx, state: CoachState): OutboundMessage {
  const lines = channelLines(ctx, state).join("\n");
  const next = nextChannel(ctx, state);
  if (!next) {
    return {
      kind: "buttons",
      body: `📣 *Your channels for ${ctx.boss.brandName}*\n\n${lines}\n\nEvery door is open. Now we feed them: your link and one post a day.`,
      buttons: [MISSION, { id: "post:write", title: "✍️ Write me a post" }, MENU],
    };
  }
  return {
    kind: "buttons",
    body: `📣 *Your channels for ${ctx.boss.brandName}*\n\n${lines}\n\n👉 *Next: ${next.emoji} ${next.name}.* ${next.why}\n\nI'll walk you through it. 10 minutes, let's open it now.`,
    buttons: [{ id: `guide:${next.guide}`, title: "🧭 Open it now" }, { id: "menu:ai_agent", title: "🤖 Autopilot" }, MENU],
  };
}

// ── Earnings math ───────────────────────────────────────────────────────────

export const MONEY_PRESETS = [100, 300, 1000];

export function moneyMenu(ctx: ContentCtx): OutboundMessage {
  const cur = ctx.boss.stats.currency;
  return {
    kind: "buttons",
    body: `💰 *How much do you want ${ctx.boss.brandName} to earn a month?*\n\nPick one, or type any amount (like 500). I turn it into a number of players and a plan. From your own numbers, no promises.`,
    buttons: MONEY_PRESETS.map((n) => ({ id: `money:${n}`, title: money(n, cur, { whole: true }) })),
  };
}

export function moneyAnswerMessage(ctx: ContentCtx, m: MoneyMath, state: CoachState): OutboundMessage {
  const plan: Button =
    state.playbook?.status === "active" ? { id: "play:today", title: "🚀 My plan today" } : m.kind === "no_data" ? { id: "play:start:launch", title: "🚀 Start the sprint" } : MISSION;
  return {
    kind: "buttons",
    body: moneyExplanation(ctx, m).slice(0, 1024),
    buttons: [{ id: "goal:accept", title: "🎯 Make it my goal" }, plan, MENU],
  };
}

export function moneyAskMessage(): OutboundMessage {
  return { kind: "text", text: "Type the amount you want to earn a month. Just the number, like *300*." };
}

/** Short line for the main menu: where the Boss is in their plan. */
export function planLine(state: CoachState): string | null {
  if (state.playbook?.status !== "active") return null;
  const pb = getPlaybook(state.playbook.id);
  return pb ? `${pb.emoji} ${pb.title} · day ${state.playbook.step + 1} of ${pb.steps.length}` : null;
}

export function pointsLine(coach: CoachView): string {
  return `🏅 ${plural(coach.state.points, "point", "points")}`;
}
