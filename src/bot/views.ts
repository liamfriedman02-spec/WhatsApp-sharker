/**
 * Builders for every screen the Boss can see. Pure functions of (content, Boss data) →
 * outbound messages, so they're easy to test and to preview in the simulator.
 */
import { agentChecklist, agentStatusMessage } from "../content/agent.js";
import type { ContentCtx } from "../content/context.js";
import { FAQ_CATEGORIES, faqByCategory, type FaqCategoryId, type FaqEntry } from "../content/faq.js";
import type { Guide } from "../content/guides.js";
import { ctaLink, type CtaId } from "../content/links.js";
import { nextBestAction } from "../content/nextBestAction.js";
import { TOPICS, nextTopic, type Topic } from "../content/topics.js";
import type { BossState } from "../store/store.js";
import { money, num, plural } from "../util/format.js";
import type { Button, OutboundMessage } from "../whatsapp/types.js";

export const BTN = {
  menu: { id: "menu:main", title: "🏠 Menu" },
  learn: { id: "menu:learn", title: "📚 All topics" },
  help: { id: "menu:help", title: "💬 Get help" },
  human: { id: "handoff:start", title: "🙋 Talk to a human" },
  business: { id: "menu:business", title: "📊 My business" },
  agent: { id: "menu:ai_agent", title: "🤖 My AI Agent" },
} satisfies Record<string, Button>;

export function mainMenu(ctx: ContentCtx): OutboundMessage {
  const { boss } = ctx;
  const nba = nextBestAction(ctx);
  const agentRow =
    ctx.stage === "live"
      ? "Live ✅ See what it's doing for you"
      : ctx.stage === "needs_socials"
        ? "Almost there — connect your socials"
        : "Not active yet — let AI market for you";
  return {
    kind: "list",
    header: "Your Boss Assistant",
    body: `Hi ${boss.firstName}! 👋 What do you want to do for *${boss.brandName}* today?\n\n👉 Your next step: ${nba.text}.`,
    footer: "Tip: you can also just type your question",
    buttonLabel: "Open menu",
    sections: [
      {
        title: "Your business",
        rows: [
          { id: "nba", title: "👉 My next step", description: truncate(capitalizeFirst(nba.text), 72) },
          { id: "menu:business", title: "📊 My business", description: "Your players, earnings and GCOIN" },
          { id: "menu:ai_agent", title: "🤖 My AI Agent", description: agentRow },
        ],
      },
      {
        title: "Learn & help",
        rows: [
          { id: "menu:learn", title: "🎓 Learn", description: "How your business works, step by step" },
          { id: "menu:help", title: "💬 Get help", description: "FAQ and step-by-step support" },
          { id: "handoff:start", title: "🙋 Talk to a human", description: "Our support team, right here" },
        ],
      },
      {
        title: "Settings",
        rows: [{ id: "menu:settings", title: "🔔 Notifications", description: "Choose the updates you get" }],
      },
    ],
  };
}

export function learnMenu(): OutboundMessage {
  return {
    kind: "list",
    body: "🎓 *Learn your business*\n\nPick a topic — each one takes less than a minute.",
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
    body: "💬 *How can I help?*\n\nPick a topic — or just type your question in your own words.",
    buttonLabel: "Choose a topic",
    sections: [
      {
        title: "Help topics",
        rows: FAQ_CATEGORIES.map((c) => ({ id: `help:${c.id}`, title: c.title, description: c.description })),
      },
      {
        title: "Still stuck?",
        rows: [
          { id: "ask:ai", title: "✍️ Ask a question", description: "Type it in your own words" },
          { id: "handoff:start", title: "🙋 Talk to a human", description: "Our support team, right here" },
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
  const agentLine =
    ctx.stage === "live"
      ? boss.aiAgent.postsPublished7d > 0
        ? `${plural(boss.aiAgent.postsPublished7d, "post", "posts")} this week ✅`
        : "live ✅"
      : ctx.stage === "needs_socials"
        ? "active — connect your socials"
        : "not active yet";
  const lines = [
    `📊 *${boss.brandName} — your business*`,
    "",
    `👥 *Your players:* ${num(s.totalPlayers)} (+${num(s.newPlayersToday)} today, +${num(s.newPlayers7d)} this week)`,
    `🔥 Active this week: ${num(s.activePlayers7d)}`,
    `💰 *Your earnings:* ${money(s.earningsToday, s.currency)} today · ${money(s.earnings7d, s.currency)} this week`,
    `🏦 Total earned: ${money(s.earningsTotal, s.currency)}`,
    `🪙 *Your GCOIN:* ${num(s.gcoinBalance)}`,
    `🤖 *Your AI Agent:* ${agentLine}`,
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

export function settingsMenu(state: BossState): OutboundMessage {
  const digest = { daily: "daily", weekly: "weekly", off: "off" }[state.digest];
  return {
    kind: "list",
    body:
      "🔔 *Your notifications*\n\n" +
      `📊 Performance summary: *${digest}*\n` +
      `💡 Tips & reminders: *${state.optedOut ? "paused" : "on"}*\n\n` +
      "What would you like?",
    buttonLabel: "Change",
    sections: [
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
