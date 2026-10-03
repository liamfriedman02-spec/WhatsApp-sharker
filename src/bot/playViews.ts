/**
 * Screens for the parts of the coach that lead: playbooks (launch program, campaigns),
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

/** Today's step: what the Boss learns today, what to do, the ready texts, and the buttons. */
export function stepMessages(ctx: ContentCtx, opened: OpenedStep, coach: CoachView): OutboundMessage[] {
  const { playbook: pb, index, step, mission } = opened;
  const state = coach.state;
  const header = `${pb.emoji} *${pb.title}* · Day ${index + 1} of ${pb.steps.length}\n*${step.title}*`;
  if (mission.record.status === "done") {
    return [stepDoneMessage(ctx, pb, index, coach)];
  }
  const lesson = step.lesson?.(ctx, state);
  const brief = step.brief(ctx, state).replace(/^Day \d+\.\s*/, "");
  const small = step.small?.(ctx, state);
  const waiting = opened.missed > 0 ? "👋 This step is still waiting from before. Let's finish it today.\n\n" : "";
  const intro = [header, `${waiting}${lesson ? `💡 ${lesson}` : ""}`.trim(), brief].filter(Boolean).join("\n\n");
  const out: OutboundMessage[] = [];
  if (step.ask === "audience") {
    out.push({ kind: "text", text: `${intro}\n\n🎯 *Today:* ${mission.def.task}` });
    out.push(audienceQuestion());
    return out;
  }
  const texts = (step.texts?.(ctx, state) ?? []).map((t) => withLink(t, ctx));
  out.push({
    kind: "text",
    text:
      `${intro}\n\n🎯 *Today:* ${mission.def.task}` +
      (lesson ? "" : `\n💡 ${mission.def.why}`) +
      (small ? `\n⏱️ Busy day? The 2-minute version counts too: ${small}.` : "") +
      (texts.length ? "\n\n👇 Your texts are below. Forward them, then tap ✅ Done." : ""),
  });
  for (const t of texts) out.push({ kind: "text", text: t });
  const extra: Button =
    step.button?.(ctx, state) ?? (mission.def.guide ? { id: `guide:${mission.def.guide}`, title: "🧭 Guide me" } : { id: "texts:menu", title: "💌 Other texts" });
  out.push({
    kind: "buttons",
    body: `${streakLine(coach)}\n\nDone? Tell me, or tap below. Stuck? Tell me that too, we'll solve it.`,
    buttons: [DONE, extra, STUCK],
  });
  return out;
}

/** Today's plan step is done: celebrate, and say what tomorrow brings. */
export function stepDoneMessage(ctx: ContentCtx, pb: Playbook, index: number, coach: CoachView, points?: number): OutboundMessage {
  const next = pb.steps[index + 1];
  const head = `✅ *Day ${index + 1} of ${pb.steps.length} done${points ? `! +${points} points` : "!"}*`;
  const tomorrow = next
    ? `Tomorrow I bring day ${index + 2}: *${next.title}*. Want it now?`
    : `That was the last day. Tomorrow we look at what you built and set your goal for the month.`;
  return {
    kind: "buttons",
    body: `${head}\n\n${streakLine(coach)}\n\n${tomorrow}`,
    buttons: next
      ? [{ id: "play:next", title: "⏭️ Next day now" }, { id: "coach:progress", title: "🏆 My progress" }, MENU]
      : [{ id: "play:next", title: "🏁 Finish the plan" }, { id: "coach:progress", title: "🏆 My progress" }, MENU],
  };
}

// ── Onboarding (day 0 of the launch program) ────────────────────────────────

/** Who the coach is, how the money works, and the first of three questions. */
export function onboardingMessages(ctx: ContentCtx, pb: Playbook): OutboundMessage[] {
  const b = ctx.boss;
  const earned = b.stats.earningsTotal > 0 ? `\n\nYou've already earned ${money(b.stats.earningsTotal, b.stats.currency)}. Now we grow it.` : "";
  return [
    {
      kind: "text",
      text:
        `${pb.emoji} *Welcome to your launch program, ${b.firstName}!*\n\n` +
        `For the next ${pb.steps.length} days I'm with you every day. Together we open your social pages, bring your first players and set up your earnings.\n\n` +
        `💡 *First, how you make money:*\nPeople join *${b.brandName}* through your link. They play, and you earn from their activity. So the whole game is more players, playing more. Everything we do in these ${pb.steps.length} days serves that.${earned}`,
    },
    {
      kind: "buttons",
      body: `Three quick questions, so the plan fits you.\n\n*1 of 3:* How much time can you give *${b.brandName}* a day?`,
      buttons: [
        { id: "onb:time:10", title: "10 minutes" },
        { id: "onb:time:30", title: "30 minutes" },
        { id: "onb:time:60", title: "1 hour or more" },
      ],
    },
  ];
}

export function onboardingSocialsQuestion(): OutboundMessage {
  return {
    kind: "list",
    body: "*2 of 3:* Which social pages do you already have for your brand?",
    footer: "Or just type it",
    buttonLabel: "Pick one",
    sections: [
      {
        title: "Your pages",
        rows: [
          { id: "onb:social:instagram", title: "📸 Instagram", description: "I have Instagram" },
          { id: "onb:social:tiktok", title: "🎵 TikTok", description: "I have TikTok" },
          { id: "onb:social:both", title: "📸🎵 Both", description: "Instagram and TikTok" },
          { id: "onb:social:none", title: "🌱 None yet", description: "We'll open them together" },
        ],
      },
    ],
  };
}

export function onboardingHourQuestion(): OutboundMessage {
  return {
    kind: "buttons",
    body: "*3 of 3:* When do you want me to bring you the day's step?",
    buttons: [
      { id: "onb:hour:9", title: "🌅 Morning" },
      { id: "onb:hour:13", title: "☀️ Afternoon" },
      { id: "onb:hour:18", title: "🌙 Evening" },
    ],
  };
}

const HOUR_NAMES: Record<number, string> = { 9: "morning", 13: "afternoon", 18: "evening" };

/** The whole plan at a glance, right before day 1. */
export function planOverviewMessage(pb: Playbook, state: CoachState): OutboundMessage {
  const when = HOUR_NAMES[state.prefs.preferredHour ?? 9] ?? "day";
  const minutes = state.prefs.minutesPerDay ?? 10;
  const pace = minutes >= 30 ? "about 10 to 20 minutes" : "about 10 minutes";
  const days = pb.steps.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
  return {
    kind: "text",
    text:
      `✅ *Your plan is ready.*\n\nEvery ${when} I bring you one step, ${pace}:\n${days}\n\n` +
      `Busy day? Every step has a 2-minute version. Stuck? Tap *I'm stuck* or just tell me, and we solve it together.\n\nDay 1 starts now 👇`,
  };
}

// ── Stuck: the Boss says what's in the way ──────────────────────────────────

const STUCK: Button = { id: "stuck:menu", title: "😕 I'm stuck" };

export function stuckMenu(): OutboundMessage {
  return {
    kind: "list",
    body: "No problem, that's what I'm here for. What's in the way? Pick one, or just tell me in your words.",
    buttonLabel: "What's in the way",
    sections: [
      {
        title: "What's in the way",
        rows: [
          { id: "stuck:time", title: "⏰ No time", description: "We make today's step a 2-minute thing" },
          { id: "stuck:how", title: "🤔 Not sure how", description: "I walk you through it, one small step at a time" },
          { id: "stuck:doubt", title: "💭 Does this work?", description: "I show you how the money works" },
          { id: "stuck:skip", title: "⏭️ Skip this step", description: "Move on to the next day" },
          { id: "handoff:start", title: "🙋 Talk to a person", description: "Someone from our team helps you" },
        ],
      },
    ],
  };
}

export function stuckTimeMessage(small: string): OutboundMessage {
  return {
    kind: "buttons",
    body: `⏰ *Then we make it tiny.*\n\nForget the full step today. Just this: *${small}*.\n\nTwo minutes. Small steps every day beat big steps once a week.`,
    buttons: [DONE, MENU],
  };
}

export function stuckDoubtMessage(ctx: ContentCtx, coach: CoachView, small: string): OutboundMessage {
  const b = ctx.boss;
  const per = coach.insights.earningsPerActive;
  const numbers =
    per !== null
      ? `Right now each active player brings you about ${money(per * 4.33, b.stats.currency)} a month.`
      : b.stats.earningsTotal > 0
        ? `You've already earned ${money(b.stats.earningsTotal, b.stats.currency)}.`
        : "Your first active players will show you your own numbers.";
  return {
    kind: "buttons",
    body:
      `💭 *Fair question. Here's how it works.*\n\n1. People join *${b.brandName}* through your link.\n2. They play.\n3. You earn from their activity, every time they play.\n\n${numbers}\n\n` +
      `The only way to see it for yourself is one small step: *${small}*.`,
    buttons: [{ id: "play:today", title: "✅ Let's try" }, { id: "money:menu", title: "💰 Earnings math" }, { id: "handoff:start", title: "🙋 Talk to a person" }],
  };
}

export function stuckHowMessage(): OutboundMessage {
  return {
    kind: "buttons",
    body: "🤝 Here's exactly what to do. If something on your screen doesn't match, write me what you see, or talk to a person from our team.",
    buttons: [DONE, { id: "handoff:start", title: "🙋 Talk to a person" }, MENU],
  };
}

export function welcomeBackMessage(ctx: ContentCtx, pb: Playbook, index: number): OutboundMessage {
  const step = pb.steps[index];
  return { kind: "text", text: `🙌 *Welcome back, ${ctx.boss.firstName}!* I kept your place: day ${index + 1} of your ${pb.title.toLowerCase()}${step ? `, *${step.title}*` : ""}. Let's go.` };
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
