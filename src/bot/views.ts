/**
 * Builders for every screen the Boss can see. Pure functions of (content, Boss data) →
 * outbound messages, so they're easy to test and to preview in the simulator.
 */
import { formatChange } from "../coach/insights.js";
import { DEMO_PERSONAS } from "../platform/demoPlatform.js";
import type { CoachIntensity } from "../coach/types.js";
import { agentChecklist, agentStatusMessage } from "../content/agent.js";
import type { ContentCtx } from "../content/context.js";
import { FAQ_CATEGORIES, faqByCategory, type FaqCategoryId, type FaqEntry } from "../content/faq.js";
import type { Guide } from "../content/guides.js";
import { ctaLink, type CtaId } from "../content/links.js";
import { nextBestAction } from "../content/nextBestAction.js";
import { getPlaybook, proposePlaybook } from "../content/playbooks.js";
import { TOPICS, nextTopic, type Topic } from "../content/topics.js";
import type { BossState } from "../store/store.js";
import { money, num, plural } from "../util/format.js";
import type { Button, ListRow, OutboundMessage } from "../whatsapp/types.js";

export const BTN = {
  menu: { id: "menu:main", title: "🏠 Menu" },
  learn: { id: "menu:learn", title: "📚 All topics" },
  help: { id: "menu:help", title: "💬 Get help" },
  human: { id: "handoff:start", title: "🙋 Talk to a human" },
  business: { id: "menu:business", title: "📊 My business" },
  agent: { id: "menu:ai_agent", title: "🤖 My AI Agent" },
} satisfies Record<string, Button>;

/**
 * The home screen: the coach states the one thing to do today and offers three taps —
 * do it, see the numbers, or "More" for everything else. Short on purpose: on Telegram every
 * row is a button, and a wall of buttons is the opposite of a coach who leads.
 */
export function homeMessage(ctx: ContentCtx): OutboundMessage {
  const { boss, coach } = ctx;
  const state = coach?.state;
  const active = state?.playbook?.status === "active" ? getPlaybook(state.playbook.id) : undefined;
  const proposed = coach && state && !active && state.playbook?.status !== "paused" ? proposePlaybook(ctx, state) : null;
  const streak = coach && coach.state.streak > 0 ? `\n🔥 ${plural(coach.state.streak, "mission", "missions")} in a row. Keep it going!` : "";

  let lead: string;
  let primary: Button;
  const paused = state?.playbook?.status === "paused" ? getPlaybook(state.playbook.id) : undefined;
  if (paused && state?.playbook) {
    lead = `${paused.emoji} Your ${paused.title.toLowerCase()} is waiting for you at day ${state.playbook.step + 1}: *${paused.steps[state.playbook.step]?.title ?? ""}*.\n👉 Ready to pick it up? I kept your place.`;
    primary = { id: "play:today", title: "▶️ Let's continue" };
  } else if (active && state?.playbook) {
    const step = active.steps[state.playbook.step];
    const done = coach?.todayMission?.record.status === "done";
    lead = `${active.emoji} ${active.title} · day ${state.playbook.step + 1} of ${active.steps.length}\n👉 ${done ? "Today's step is done ✅ Tomorrow I bring the next one." : `*${step?.title ?? "Today's step"}*. 10 minutes, everything's prepared.`}`;
    primary = { id: "play:today", title: done ? "⏭️ Next day now" : "▶️ Today's step" };
  } else if (proposed) {
    lead = `${proposed.emoji} *${proposed.title}*. ${proposed.steps.length} days, 10 minutes a day.\n👉 Day 1: *${proposed.steps[0]?.title ?? ""}*. I prepare everything, you press send.`;
    primary = { id: `play:start:${proposed.id}`, title: "🚀 Start day 1" };
  } else {
    const done = coach?.todayMission?.record.status === "done";
    lead = `👉 ${done ? "Today's mission is done ✅ Want a bonus one?" : `*${capitalizeFirst(nextBestAction(ctx).text)}*.`}`;
    primary = done ? { id: "mission:bonus", title: "🎯 Bonus mission" } : { id: "mission:today", title: "🎯 Do it now" };
  }
  return {
    kind: "buttons",
    header: "Your Boss Coach",
    body: `Hi ${boss.firstName}! 👋 Here's the plan for *${boss.brandName}* today:\n${lead}${streak}\n\nTap below, or just tell me what you need.`,
    footer: ctx.demo ? "🧪 Demo · type DEMO to switch Boss profile" : "You can also just type to me",
    buttons: [primary, BTN.business, { id: "menu:more", title: "☰ More" }],
  };
}

/** Everything the coach can do, one row each (behind "More" on the home screen). */
export function mainMenu(ctx: ContentCtx): OutboundMessage {
  const { boss, coach } = ctx;
  const nba = nextBestAction(ctx);
  const agentRow =
    ctx.stage === "live"
      ? "Live ✅ See what it's doing for you"
      : ctx.stage === "needs_socials"
        ? "Almost there. Connect your socials"
        : "Not active yet. Let AI market for you";
  const missionRow =
    coach?.todayMission?.record.status === "done" ? "Done today ✅ Want a bonus one?" : truncate(capitalizeFirst(nba.text), 72);
  const goalRow =
    coach?.state.goal?.status === "active" && coach.goal
      ? truncate(`${coach.goal.label} · level ${coach.level.current?.name ?? "Starter"}`, 72)
      : `Level ${coach?.level.current?.name ?? "Starter"} · set your goal`;
  const streak = coach && coach.state.streak > 0 ? `\n🔥 ${plural(coach.state.streak, "mission", "missions")} in a row. Keep it going!` : "";

  // The plan row: today's step of the active plan, or the plan the coach would start now.
  const state = coach?.state;
  const active = state?.playbook?.status === "active" ? getPlaybook(state.playbook.id) : undefined;
  const proposed = coach && state && !active ? proposePlaybook(ctx, state) : null;
  const planRow: ListRow | null = active && state?.playbook
    ? { id: "play:today", title: `${active.emoji} My plan today`, description: truncate(`${active.title} · day ${state.playbook.step + 1} of ${active.steps.length}: ${active.steps[state.playbook.step]?.title ?? ""}`, 72) }
    : proposed
      ? { id: `play:start:${proposed.id}`, title: `${proposed.emoji} ${proposed.title}`, description: proposed.description }
      : null;
  const planLead = active && state?.playbook ? `\n${active.emoji} ${active.title} · day ${state.playbook.step + 1} of ${active.steps.length}` : "";

  return {
    kind: "list",
    header: "Everything I can do",
    body: `For *${boss.brandName}*:${planLead}\n👉 First: ${nba.text}.\n\nPick what you need. Or just type.${streak}`,
    footer: ctx.demo ? "🧪 Demo · type DEMO to switch Boss profile" : "You can also just type to me",
    buttonLabel: "Open menu",
    sections: [
      {
        title: "Today",
        rows: [
          ...(planRow ? [planRow] : []),
          { id: "mission:today", title: "🎯 Today's mission", description: missionRow },
          { id: "coach:progress", title: "🏆 My goal & level", description: goalRow },
        ],
      },
      {
        title: "Grow your business",
        rows: [
          { id: "menu:business", title: "📊 My business", description: "Your players, earnings and trends" },
          { id: "menu:ai_agent", title: "🤖 My AI Agent", description: agentRow },
          { id: "channels:menu", title: "📣 My channels", description: "Open the next door for players, step by step" },
          { id: "texts:menu", title: "💌 Texts for me", description: "Invites, welcomes and posts, ready to send" },
          { id: "money:menu", title: "💰 Earnings math", description: "How many players your target takes" },
        ],
      },
      {
        title: "Learn & help",
        rows: [
          { id: "menu:learn", title: "🎓 Learn", description: "How your business works, step by step" },
          { id: "menu:help", title: "💬 Get help", description: "FAQ, support team and settings" },
        ],
      },
    ],
  };
}

export function learnMenu(): OutboundMessage {
  return {
    kind: "list",
    body: "🎓 *Learn your business*\n\nPick a topic. Each one takes less than a minute.",
    footer: "Start with “What is a Boss?”",
    buttonLabel: "See topics",
    sections: [{ title: "Topics", rows: TOPICS.map((t) => ({ id: `learn:${t.id}`, title: t.title, description: t.description })) }],
  };
}

export function topicMessages(topic: Topic, ctx: ContentCtx): OutboundMessage[] {
  const personal = topic.personal?.(ctx);
  const body = `${topic.body}${personal ? `\n\n${personal}` : ""}`;
  const out: OutboundMessage[] = [{ kind: "cta", body, cta: ctaLink(topic.cta(ctx), ctx.hubUrl, `learn_${topic.id}`) }];

  const next = nextTopic(topic.id);
  const buttons: Button[] = [];
  if (next) buttons.push({ id: `learn:${next.id}`, title: "➡️ Next topic" });
  if (topic.guide) buttons.push({ id: `guide:${topic.guide}`, title: "🧭 Guide me" });
  else buttons.push(BTN.learn);
  buttons.push(BTN.menu);

  out.push({
    kind: "buttons",
    body: next
      ? `Next up: *${next.title}*`
      : `🎓 You finished the Boss basics! 🎉\n\n👉 Your next step: ${nextBestAction(ctx).text}.`,
    buttons: next ? buttons : [{ id: "nba", title: "👉 My next step" }, BTN.learn, BTN.menu],
  });
  return out;
}

export function helpMenu(): OutboundMessage {
  return {
    kind: "list",
    body: "💬 *How can I help?*\n\nPick a topic. Or just type your question in your own words.",
    buttonLabel: "Choose a topic",
    sections: [
      {
        title: "Help topics",
        rows: FAQ_CATEGORIES.map((c) => ({ id: `help:${c.id}`, title: c.title, description: c.description })),
      },
      {
        title: "More",
        rows: [
          { id: "ask:ai", title: "✍️ Ask a question", description: "Type it in your own words" },
          { id: "handoff:start", title: "🙋 Talk to a human", description: "Our support team, right here" },
          { id: "menu:settings", title: "🔔 Coaching & alerts", description: "How hard I push you, summaries, pause" },
        ],
      },
    ],
  };
}

export function faqCategoryMenu(category: FaqCategoryId): OutboundMessage {
  const cat = FAQ_CATEGORIES.find((c) => c.id === category)!;
  return {
    kind: "list",
    body: `${cat.title}\n\nWhat do you need help with?`,
    buttonLabel: "See questions",
    sections: [
      {
        title: "Questions",
        rows: faqByCategory(category).map((f) => ({ id: `faq:${f.id}`, title: f.title, description: f.question })),
      },
    ],
  };
}

export function faqMessages(faq: FaqEntry, ctx: ContentCtx): OutboundMessage[] {
  const personal = faq.personal?.(ctx);
  const body = `*${faq.question}*\n\n${faq.answer}${personal ? `\n\n${personal}` : ""}`;
  const first: OutboundMessage = faq.cta
    ? { kind: "cta", body, cta: ctaLink(faq.cta(ctx), ctx.hubUrl, `faq_${faq.id}`) }
    : { kind: "text", text: body };
  const middle: Button = faq.guide ? { id: `guide:${faq.guide}`, title: "🧭 Guide me" } : BTN.human;
  return [
    first,
    {
      kind: "buttons",
      body: "Did this solve it?",
      buttons: [{ id: `feedback:solved:${faq.id}`, title: "✅ Yes, solved" }, middle, { id: `feedback:unsolved:${faq.id}`, title: "❌ Not yet" }],
    },
  ];
}

export function businessSnapshot(ctx: ContentCtx): OutboundMessage {
  const { boss } = ctx;
  const s = boss.stats;
  const nba = nextBestAction(ctx);
  const trends = ctx.coach && ctx.coach.insights.newPlayers.previous !== null ? ctx.coach.insights : null;
  const tip = ctx.coach?.insights.tips.find((t) => t.id !== "no_history" && t.id !== "agent_missing")?.text;
  const agentLine =
    ctx.stage === "live"
      ? boss.aiAgent.postsPublished7d > 0
        ? `${plural(boss.aiAgent.postsPublished7d, "post", "posts")} this week ✅`
        : "live ✅"
      : ctx.stage === "needs_socials"
        ? "active. Connect your socials"
        : "not active yet";
  const lines = [
    `📊 *${boss.brandName}: your business*`,
    "",
    `👥 *Your players:* ${num(s.totalPlayers)} (+${num(s.newPlayersToday)} today, +${num(s.newPlayers7d)} this week)`,
    ...(trends ? [`   ↳ new players ${formatChange(trends.newPlayers)}`] : []),
    `🔥 Active this week: ${num(s.activePlayers7d)}`,
    `💰 *Your earnings:* ${money(s.earningsToday, s.currency)} today · ${money(s.earnings7d, s.currency)} this week`,
    ...(trends ? [`   ↳ earnings ${formatChange(trends.earnings)}`] : []),
    `🏦 Total earned: ${money(s.earningsTotal, s.currency)}`,
    `🪙 *Your GCOIN:* ${num(s.gcoinBalance)}`,
    `🤖 *Your AI Agent:* ${agentLine}`,
    ...(tip ? ["", tip] : []),
    "",
    `👉 *Your next step:* ${nba.text}.`,
  ];
  const cta: CtaId = nba.id === "keep_growing" ? "dashboard" : nba.cta;
  return { kind: "cta", body: lines.join("\n"), footer: "Reply MENU for more", cta: ctaLink(cta, ctx.hubUrl, "business_snapshot") };
}

export function aiAgentMessages(ctx: ContentCtx): OutboundMessage[] {
  const agent = agentStatusMessage(ctx);
  const body = `*${agent.header}*\n\n${agent.body}\n\n${agentChecklist(ctx.stage)}`;
  const guideId = ctx.stage === "not_activated" ? "activate_agent" : ctx.stage === "needs_socials" ? "connect_socials" : null;
  const buttons: Button[] = guideId
    ? [{ id: `guide:${guideId}`, title: "🧭 Guide me" }, { id: "learn:ai_autopilot", title: "❓ How it works" }, BTN.menu]
    : [BTN.business, { id: "learn:marketing", title: "📣 Marketing tips" }, BTN.menu];
  return [
    { kind: "cta", body, cta: ctaLink(agent.cta, ctx.hubUrl, `agent_menu_${ctx.stage}`) },
    { kind: "buttons", body: guideId ? "Want me to walk you through it?" : "What's next?", buttons },
  ];
}

export function nextActionMessage(ctx: ContentCtx): OutboundMessage {
  const nba = nextBestAction(ctx);
  return {
    kind: "cta",
    body: `👉 *Your next step*\n\n${capitalizeFirst(nba.text)}.\n\nThis is the most important thing you can do for *${ctx.boss.brandName}* right now.`,
    cta: ctaLink(nba.cta, ctx.hubUrl, `nba_${nba.id}`),
  };
}

export function settingsMenu(state: BossState, intensity: CoachIntensity = "standard"): OutboundMessage {
  const digest = { daily: "daily", weekly: "weekly", off: "off" }[state.digest];
  const coaching = { light: "light touch", standard: "standard", intense: "push me hard 🔥" }[intensity];
  return {
    kind: "list",
    body:
      "🔔 *Coaching & alerts*\n\n" +
      `💪 Coaching: *${coaching}*\n` +
      `📊 Performance summary: *${digest}*\n` +
      `💡 Tips & reminders: *${state.optedOut ? "paused" : "on"}*\n\n` +
      "What would you like?",
    buttonLabel: "Change",
    sections: [
      {
        title: "How hard I push you",
        rows: [
          { id: "settings:coach:intense", title: "🔥 Push me hard", description: "Daily missions, check-ins and goals" },
          { id: "settings:coach:standard", title: "💪 Standard coaching", description: "Missions twice a week + weekly coaching" },
          { id: "settings:coach:light", title: "🌿 Light touch", description: "Weekly coaching only" },
        ],
      },
      {
        title: "Performance summary",
        rows: [
          { id: "settings:digest:daily", title: "📅 Daily summary", description: "Each evening, when there's news" },
          { id: "settings:digest:weekly", title: "🗓️ Weekly summary", description: "Every Monday morning" },
          { id: "settings:digest:off", title: "🔕 No summaries", description: "Turn performance summaries off" },
        ],
      },
      {
        title: "Tips & reminders",
        rows: [
          state.optedOut
            ? { id: "settings:resume", title: "▶️ Resume tips", description: "Get tips, milestones and reminders again" }
            : { id: "settings:pause", title: "⏸️ Pause tips", description: "Stop proactive tips and reminders" },
        ],
      },
    ],
  };
}

export function guideStepMessage(guide: Guide, step: number, ctx: ContentCtx): OutboundMessage {
  const s = guide.steps[step]!;
  const link = s.cta ? `\n\n🔗 ${ctaLink(s.cta, ctx.hubUrl, `guide_${guide.id}`).url}` : "";
  const progress = `(${step + 1}/${guide.steps.length})`;
  return {
    kind: "buttons",
    body: `🧭 *${guide.title}* ${progress}\n\n${s.text}${link}\n\nTap *Done* when you've finished this step.`,
    buttons: [
      { id: "guide_step:done", title: "✅ Done" },
      { id: "guide_step:stuck", title: "😕 I'm stuck" },
      { id: "guide_step:exit", title: "✖️ Exit guide" },
    ],
  };
}

export function unsupportedMessage(): OutboundMessage {
  return {
    kind: "buttons",
    body: "🙏 For now I can only read text messages and button taps. Type your question, or pick an option below.",
    buttons: [BTN.menu, BTN.help, BTN.human],
  };
}

export function notABossMessage(): OutboundMessage {
  return {
    kind: "text",
    text:
      "Hi! 👋 This is the *Sharker Boss Assistant*.\n\n" +
      "I couldn't find a Boss account linked to this WhatsApp number. If you're a Boss, make sure the phone number in your Boss Hub profile matches this one, then message me again.",
  };
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

export function telegramLinkRequest(name: string | undefined, retry = false): OutboundMessage {
  return {
    kind: "contact_request",
    body: retry
      ? "Please use the button below to share *your own* phone number (the one in your Boss Hub profile)."
      : `👋 Hi${name ? ` ${name}` : ""}! I'm the *Sharker Boss Coach*.\n\nTo connect you to your Boss account, tap the button below to share your phone number (the one in your Boss Hub profile).`,
    buttonLabel: "📱 Share my phone number",
  };
}

export function telegramLinkedMessage(boss: { firstName: string; brandName: string }, demo = false): OutboundMessage {
  const hint = demo ? `\n\n🧪 Demo mode: you're testing as *${boss.firstName}*. Type *demo* anytime to switch Boss profile.` : "";
  return { kind: "text", text: `✅ Connected! Welcome, ${boss.firstName}. I'm your coach for *${boss.brandName}*.${hint}` };
}

export function demoMenu(current?: string): OutboundMessage {
  return {
    kind: "list",
    body:
      "🧪 *Demo mode*\n\nPick a Boss profile to test. Each one is a different situation, and your progress in each profile is kept." +
      (current ? `\n\nYou're testing as: *${current}*` : ""),
    buttonLabel: "Pick a profile",
    sections: [{ title: "Boss profiles", rows: DEMO_PERSONAS.map((p) => ({ id: `demo:${p.id}`, title: p.title, description: p.description })) }],
  };
}

export function telegramNotABossMessage(): OutboundMessage {
  return {
    kind: "text",
    text: "I couldn't find a Boss account with that phone number. Make sure it's the number in your Boss Hub profile, or contact Sharker support.",
  };
}
