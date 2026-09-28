import type { Assistant, AssistantAnswer } from "../ai/assistant.js";
import type { Config } from "../config.js";
import { contentCtx, type ContentCtx } from "../content/context.js";
import { getFaq, type FaqCategoryId, FAQ_CATEGORIES } from "../content/faq.js";
import { getGuide, type Guide } from "../content/guides.js";
import { ctaLink } from "../content/links.js";
import { nextBestAction } from "../content/nextBestAction.js";
import { getTopic } from "../content/topics.js";
import type { Logger } from "../logger.js";
import type { BossProfile, SharkerPlatform } from "../platform/types.js";
import type { BossState, Handoff, Store } from "../store/store.js";
import { HOUR } from "../util/time.js";
import { renderMessage } from "../whatsapp/consoleMessenger.js";
import { LIMITS, type InboundMessage, type Messenger, type OutboundMessage } from "../whatsapp/types.js";
import { bossSummary, type SupportDesk } from "./handoff.js";
import { isAffirmative, matchCommand, searchKnowledge } from "./intents.js";
import {
  BTN,
  aiAgentMessages,
  businessSnapshot,
  faqCategoryMenu,
  faqMessages,
  guideStepMessage,
  helpMenu,
  learnMenu,
  mainMenu,
  nextActionMessage,
  notABossMessage,
  settingsMenu,
  topicMessages,
  unsupportedMessage,
} from "./views.js";

export interface RouterDeps {
  platform: SharkerPlatform;
  store: Store;
  messenger: Messenger;
  assistant: Assistant | null;
  supportDesk: SupportDesk;
  config: Config;
  logger: Logger;
  now?: () => Date;
}

/** Per-message conversation context. */
interface Turn {
  boss: BossProfile;
  state: BossState;
  ctx: ContentCtx;
  outbox: { message: OutboundMessage; source: string }[];
}

const AI_ANSWERS_PER_HOUR = 30;

/**
 * Handles every inbound WhatsApp message: menus and button taps (deterministic, instant),
 * step-by-step guides, human handoff, and free text (Claude, with keyword search fallback).
 */
export class BotRouter {
  private readonly aiUsage = new Map<string, number[]>();

  constructor(private readonly deps: RouterDeps) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  async handleInbound(msg: InboundMessage): Promise<void> {
    const { store, platform, messenger, logger, config } = this.deps;
    if (!(await store.markProcessed("message", msg.messageId))) return; // webhook retry
    void messenger.markRead(msg.messageId);

    const boss = await platform.getBossByPhone(msg.from);
    if (!boss) {
      logger.info("inbound from unknown number", { from: maskPhone(msg.from) });
      await messenger.send(msg.from, notABossMessage());
      return;
    }

    const now = this.now();
    const state = await store.getState(boss.id, boss.phone);
    state.phone = boss.phone;
    state.lastInboundAt = now.toISOString();
    const turn: Turn = {
      boss,
      state,
      ctx: contentCtx(boss, { now, hubUrl: config.sharker.bossHubUrl, defaultTimezone: config.retention.defaultTimezone }),
      outbox: [],
    };

    await store.logMessage(boss.id, "in", describeInbound(msg), "boss", now);
    try {
      await this.dispatch(turn, msg);
    } catch (err) {
      logger.error("router: failed to handle message", { bossId: boss.id, err });
      turn.outbox = [];
      this.push(turn, {
        kind: "buttons",
        body: "😕 Sorry, something went wrong on my side. Please try again in a moment.",
        buttons: [BTN.menu, BTN.human],
      });
    }
    await store.saveState(state);
    await this.flush(turn);
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  private async dispatch(t: Turn, msg: InboundMessage): Promise<void> {
    await this.expireStaleHandoff(t);

    if (msg.type === "unsupported") {
      if (t.state.mode === "human") return this.forwardToHuman(t, `[Boss sent a ${msg.rawType ?? "non-text"} message]`);
      return this.push(t, unsupportedMessage());
    }
    if (msg.type === "reply") {
      const id = msg.replyId ?? "";
      // Navigating away while we waited for a handoff description cancels the request.
      if (t.state.mode === "awaiting_handoff" && !id.startsWith("handoff:")) t.state.mode = "bot";
      // Leaving a guide for another screen ends it (a later "ok" must not resume it by surprise).
      if (!id.startsWith("guide")) t.state.flow = null;
      return this.onReply(t, id);
    }

    const text = (msg.text ?? "").trim();
    const cmd = matchCommand(text);

    if (cmd === "stop") return this.setOptOut(t, true);
    if (cmd === "start") return this.setOptOut(t, false);

    if (t.state.mode === "awaiting_handoff") {
      if (cmd === "menu") {
        t.state.mode = "bot";
        return this.push(t, mainMenu(t.ctx));
      }
      return this.openHandoff(t, text);
    }
    if (t.state.mode === "human") {
      if (cmd === "menu") return this.push(t, mainMenu(t.ctx));
      return this.forwardToHuman(t, text);
    }

    if (t.state.flow && isAffirmative(text)) return this.guideDone(t);
    if (cmd) t.state.flow = null;

    switch (cmd) {
      case "menu":
        return this.push(t, mainMenu(t.ctx));
      case "help":
        return this.push(t, helpMenu());
      case "human":
        return this.askForHandoff(t);
      case "settings":
        return this.push(t, settingsMenu(t.state));
      case "business":
        return this.push(t, businessSnapshot(t.ctx));
      case "agent":
        return this.pushAll(t, aiAgentMessages(t.ctx));
      case "learn":
        return this.push(t, learnMenu());
      default:
        return this.answerFreeText(t, text);
    }
  }

  private async onReply(t: Turn, id: string): Promise<void> {
    const [kind, arg, extra] = id.split(":");
    switch (kind) {
      case "menu":
        return this.onMenu(t, arg);
      case "nba": {
        const nba = nextBestAction(t.ctx);
        if (nba.guide) return this.startGuide(t, nba.guide);
        return this.push(t, nextActionMessage(t.ctx));
      }
      case "learn": {
        const topic = getTopic(arg ?? "");
        return topic ? this.pushAll(t, topicMessages(topic, t.ctx)) : this.push(t, learnMenu());
      }
      case "help":
        return FAQ_CATEGORIES.some((c) => c.id === arg)
          ? this.push(t, faqCategoryMenu(arg as FaqCategoryId))
          : this.push(t, helpMenu());
      case "faq": {
        const faq = getFaq(arg ?? "");
        return faq ? this.pushAll(t, faqMessages(faq, t.ctx)) : this.push(t, helpMenu());
      }
      case "feedback":
        return this.onFeedback(t, arg === "solved", extra ?? "");
      case "guide":
        return this.startGuide(t, arg ?? "");
      case "guide_step":
        if (arg === "done" || arg === "check") return this.guideDone(t, arg === "check");
        if (arg === "stuck") return this.guideStuck(t);
        t.state.flow = null;
        return this.push(t, mainMenu(t.ctx));
      case "handoff":
        if (arg === "start") return this.askForHandoff(t);
        if (arg === "cancel") {
          t.state.mode = "bot";
          return this.push(t, { kind: "buttons", body: "No problem — I'm here if you need me.", buttons: [BTN.menu, BTN.help] });
        }
        if (arg === "close") return this.closeHandoffByBoss(t);
        return this.push(t, mainMenu(t.ctx));
      case "settings":
        return this.onSettings(t, arg ?? "", extra);
      case "ask":
        return this.push(t, {
          kind: "text",
          text: "✍️ Sure! Type your question in your own words and I'll help you right away.",
        });
      default:
        this.deps.logger.warn("router: unknown reply id", { id });
        return this.push(t, mainMenu(t.ctx));
    }
  }

  private onMenu(t: Turn, which: string | undefined): void {
    switch (which) {
      case "learn":
        return this.push(t, learnMenu());
      case "help":
        return this.push(t, helpMenu());
      case "business":
        return this.push(t, businessSnapshot(t.ctx));
      case "ai_agent":
        return this.pushAll(t, aiAgentMessages(t.ctx));
      case "settings":
        return this.push(t, settingsMenu(t.state));
      default:
        return this.push(t, mainMenu(t.ctx));
    }
  }

  private onFeedback(t: Turn, solved: boolean, faqId: string): void {
    this.deps.logger.info("faq feedback", { bossId: t.boss.id, faqId, solved });
    if (solved) {
      return this.push(t, {
        kind: "buttons",
        body: `🙌 Great! Anything else I can do for *${t.boss.brandName}*?`,
        buttons: [BTN.menu, BTN.business, BTN.agent],
      });
    }
    return this.push(t, {
      kind: "buttons",
      body: "Sorry about that. Tell me more in your own words and I'll try again — or talk to a person from our team.",
      buttons: [BTN.human, BTN.menu],
    });
  }

  private onSettings(t: Turn, setting: string, value: string | undefined): void {
    if (setting === "digest" && (value === "daily" || value === "weekly" || value === "off")) {
      t.state.digest = value;
      const text =
        value === "off"
          ? "🔕 Performance summaries are off. You can turn them back on anytime in Notifications."
          : value === "daily"
            ? "📅 Done! You'll get a summary each evening when there's news on your brand."
            : "🗓️ Done! You'll get your weekly summary every Monday morning.";
      return this.push(t, { kind: "buttons", body: text, buttons: [BTN.menu] });
    }
    if (setting === "pause") return this.setOptOut(t, true);
    if (setting === "resume") return this.setOptOut(t, false);
    return this.push(t, settingsMenu(t.state));
  }

  private setOptOut(t: Turn, optedOut: boolean): void {
    t.state.optedOut = optedOut;
    if (optedOut) {
      return this.push(t, {
        kind: "buttons",
        body:
          "⏸️ Done — I've paused tips and reminders.\n\nI'm still here whenever you need help: just type *MENU*. Reply *START* to turn tips back on.",
        buttons: [BTN.menu],
      });
    }
    this.push(t, { kind: "text", text: "▶️ Tips are back on! I'll keep you posted on your brand." });
    this.push(t, mainMenu(t.ctx));
  }

  // ── Guides ────────────────────────────────────────────────────────────────

  private startGuide(t: Turn, guideId: string): void {
    const requested = getGuide(guideId);
    if (!requested) return this.push(t, mainMenu(t.ctx));

    // Skip guides the Boss already completed and continue with the next one in the chain.
    let guide: Guide | undefined = requested;
    while (guide?.alreadyDone?.(t.boss)) guide = guide.next ? getGuide(guide.next) : undefined;

    if (!guide) {
      t.state.flow = null;
      return this.push(t, {
        kind: "buttons",
        body: `✅ You've already done this: *${requested.title}*.\n\n👉 Your next step: ${nextBestAction(t.ctx).text}.`,
        buttons: [{ id: "nba", title: "👉 My next step" }, BTN.menu],
      });
    }
    if (guide !== requested) {
      this.push(t, { kind: "text", text: `✅ You've already done this: *${requested.title}*. Let's do the next step!` });
    }
    t.state.flow = { type: "guide", guideId: guide.id, step: 0 };
    this.push(t, { kind: "text", text: guide.intro });
    this.push(t, guideStepMessage(guide, 0, t.ctx));
  }

  private async guideDone(t: Turn, recheck = false): Promise<void> {
    const flow = t.state.flow;
    const guide = flow ? getGuide(flow.guideId) : undefined;
    if (!flow || !guide) {
      t.state.flow = null;
      return this.push(t, mainMenu(t.ctx));
    }
    if (!recheck && flow.step + 1 < guide.steps.length) {
      flow.step += 1;
      return this.push(t, guideStepMessage(guide, flow.step, t.ctx));
    }
    if (guide.verify) {
      // Check the Boss's live data before celebrating.
      this.deps.platform.invalidate?.({ id: t.boss.id, phone: t.boss.phone });
      const fresh = (await this.deps.platform.getBoss(t.boss.id)) ?? t.boss;
      if (!guide.verify(fresh)) {
        return this.push(t, {
          kind: "buttons",
          body: "🤔 Hmm, I don't see it on your account yet. It can take a minute to update.\n\nWant me to check again?",
          buttons: [
            { id: "guide_step:check", title: "🔁 Check again" },
            { id: "guide_step:stuck", title: "😕 I'm stuck" },
            BTN.menu,
          ],
        });
      }
      t.boss = fresh;
      t.ctx = contentCtx(fresh, { now: t.ctx.now, hubUrl: t.ctx.hubUrl, defaultTimezone: t.ctx.timezone });
    }
    return this.finishGuide(t, guide);
  }

  private finishGuide(t: Turn, guide: Guide): void {
    t.state.flow = null;
    this.deps.logger.info("guide completed", { bossId: t.boss.id, guide: guide.id });
    if (guide.next && !getGuide(guide.next)?.alreadyDone?.(t.boss)) {
      return this.push(t, {
        kind: "buttons",
        body: guide.success,
        buttons: [{ id: `guide:${guide.next}`, title: "➡️ Next step" }, BTN.menu],
      });
    }
    return this.push(t, {
      kind: "buttons",
      body: `${guide.success}\n\n👉 Your next step: ${nextBestAction(t.ctx).text}.`,
      buttons: [{ id: "nba", title: "👉 My next step" }, BTN.menu],
    });
  }

  private guideStuck(t: Turn): void {
    return this.push(t, {
      kind: "buttons",
      body: "No problem — tell me what's happening in your own words and I'll help you. Or talk to a person from our team.",
      buttons: [BTN.human, { id: "guide_step:exit", title: "✖️ Exit guide" }],
    });
  }

  // ── Free text ─────────────────────────────────────────────────────────────

  private async answerFreeText(t: Turn, text: string): Promise<void> {
    const { assistant, store } = this.deps;
    if (assistant && this.deps.config.ai.enabled && this.allowAi(t.boss.id)) {
      const history = (await store.recentMessages(t.boss.id, 13)).slice(0, -1); // drop the message being answered
      const answer = await assistant.answer({ ctx: t.ctx, question: text, history, flow: t.state.flow });
      if (answer) return this.pushAnswer(t, answer);
    }

    const match = searchKnowledge(text);
    if (match?.type === "faq") return this.pushAll(t, faqMessages(match.faq, t.ctx));
    if (match?.type === "topic") return this.pushAll(t, topicMessages(match.topic, t.ctx));
    return this.push(t, {
      kind: "buttons",
      body: "🤔 I'm not sure I understood. Pick an option below, or try asking in a different way.",
      buttons: [BTN.help, BTN.human, BTN.menu],
    });
  }

  private pushAnswer(t: Turn, a: AssistantAnswer): void {
    const source = "ai";
    if (a.escalate) {
      return this.push(t, { kind: "buttons", body: fit(a.reply), buttons: [BTN.human, BTN.menu] }, source);
    }
    if (a.cta) {
      const cta = ctaLink(a.cta, t.ctx.hubUrl, "assistant");
      if (a.reply.length <= LIMITS.interactiveBody) this.push(t, { kind: "cta", body: a.reply, cta }, source);
      else {
        this.push(t, { kind: "text", text: a.reply }, source);
        this.push(t, { kind: "cta", body: "👇 Do it now:", cta }, source);
      }
      if (a.guide) {
        this.push(t, {
          kind: "buttons",
          body: "Want me to walk you through it step by step?",
          buttons: [{ id: `guide:${a.guide}`, title: "🧭 Guide me" }, BTN.menu],
        });
      }
      return;
    }
    if (a.guide) {
      return this.push(t, { kind: "buttons", body: fit(a.reply), buttons: [{ id: `guide:${a.guide}`, title: "🧭 Guide me" }, BTN.menu] }, source);
    }
    return this.push(t, { kind: "text", text: a.reply }, source);
  }

  private allowAi(bossId: string): boolean {
    const now = this.now().getTime();
    const recent = (this.aiUsage.get(bossId) ?? []).filter((ts) => now - ts < HOUR);
    if (recent.length >= AI_ANSWERS_PER_HOUR) {
      this.deps.logger.warn("assistant: per-boss hourly limit reached", { bossId });
      this.aiUsage.set(bossId, recent);
      return false;
    }
    recent.push(now);
    this.aiUsage.set(bossId, recent);
    return true;
  }

  // ── Human handoff ─────────────────────────────────────────────────────────

  private askForHandoff(t: Turn): void {
    if (t.state.mode === "human" && t.state.handoffId) {
      return this.push(t, {
        kind: "buttons",
        body: `🙋 Your request #${t.state.handoffId} is already with our support team. Just write here — they'll see it.`,
        buttons: [{ id: "handoff:close", title: "✖️ Close request" }, BTN.menu],
      });
    }
    t.state.mode = "awaiting_handoff";
    return this.push(t, {
      kind: "buttons",
      body:
        "🙋 *Talk to a human*\n\n" +
        "Tell me in one message what you need help with, and a Sharker support specialist will reply right here.\n\n" +
        `🕘 Support hours: ${this.deps.config.support.hours}`,
      buttons: [{ id: "handoff:cancel", title: "↩️ Cancel" }],
    });
  }

  private async openHandoff(t: Turn, description: string): Promise<void> {
    const { store, supportDesk } = this.deps;
    const handoff = await store.createHandoff(t.boss.id, t.boss.phone, null, description);
    t.state.mode = "human";
    t.state.handoffId = handoff.id;
    t.state.flow = null;
    const transcript = await store.recentMessages(t.boss.id, 20);
    await supportDesk.notify({ event: "handoff.opened", handoff, boss: bossSummary(t.boss), message: description, transcript });
    this.deps.logger.info("handoff opened", { bossId: t.boss.id, handoffId: handoff.id });
    return this.push(t, {
      kind: "buttons",
      body:
        `✅ Got it, ${t.boss.firstName}! Your request *#${handoff.id}* is with our support team. They'll reply here as soon as possible.\n\n` +
        "Anything you write now goes straight to them.",
      buttons: [{ id: "handoff:close", title: "✖️ Close request" }, BTN.menu],
    });
  }

  private async forwardToHuman(t: Turn, text: string): Promise<void> {
    const handoff = t.state.handoffId ? await this.deps.store.getHandoff(t.state.handoffId) : null;
    if (!handoff || handoff.status !== "open") {
      t.state.mode = "bot";
      t.state.handoffId = null;
      return this.answerFreeText(t, text);
    }
    await this.deps.supportDesk.notify({ event: "handoff.message", handoff, boss: bossSummary(t.boss), message: text });
  }

  private async closeHandoffByBoss(t: Turn): Promise<void> {
    const { store, supportDesk } = this.deps;
    if (t.state.handoffId) {
      await store.updateHandoff(t.state.handoffId, { status: "resolved" });
      const handoff = await store.getHandoff(t.state.handoffId);
      if (handoff) await supportDesk.notify({ event: "handoff.closed", handoff, boss: bossSummary(t.boss), reason: "closed_by_boss" });
    }
    t.state.mode = "bot";
    t.state.handoffId = null;
    return this.push(t, { kind: "buttons", body: "✅ Request closed. I'm here if you need anything else.", buttons: [BTN.menu, BTN.help] });
  }

  private async expireStaleHandoff(t: Turn): Promise<void> {
    if (t.state.mode === "bot") return;
    const hours = this.deps.config.support.handoffTimeoutHours;
    const last = new Date(t.state.updatedAt).getTime();
    if (this.now().getTime() - last < hours * HOUR) return;
    if (t.state.handoffId) {
      await this.deps.store.updateHandoff(t.state.handoffId, { status: "resolved" });
      const handoff = await this.deps.store.getHandoff(t.state.handoffId);
      if (handoff) {
        await this.deps.supportDesk.notify({ event: "handoff.closed", handoff, boss: bossSummary(t.boss), reason: "expired" });
      }
    }
    t.state.mode = "bot";
    t.state.handoffId = null;
  }

  // ── Admin (support agents) ────────────────────────────────────────────────

  /** A support specialist replies to the Boss through the bot's WhatsApp number. */
  async agentReply(handoffId: number, text: string, agentName?: string): Promise<Handoff> {
    const { store, messenger } = this.deps;
    const handoff = await store.getHandoff(handoffId);
    if (!handoff || handoff.status !== "open") throw new Error(`Handoff ${handoffId} is not open`);
    const body = agentName ? `*${agentName} (Sharker Support):*\n${text}` : `*Sharker Support:*\n${text}`;
    await messenger.send(handoff.phone, { kind: "text", text: body });
    await store.logMessage(handoff.bossId, "out", body, "human_agent", this.now());
    const state = await store.getState(handoff.bossId, handoff.phone);
    state.mode = "human";
    state.handoffId = handoff.id;
    await store.saveState(state); // refreshes updatedAt → keeps the handoff alive
    return handoff;
  }

  async resolveHandoff(handoffId: number): Promise<Handoff> {
    const { store, messenger, supportDesk, platform } = this.deps;
    const handoff = await store.getHandoff(handoffId);
    if (!handoff) throw new Error(`Handoff ${handoffId} not found`);
    await store.updateHandoff(handoffId, { status: "resolved" });
    const state = await store.getState(handoff.bossId, handoff.phone);
    if (state.handoffId === handoffId) {
      state.mode = "bot";
      state.handoffId = null;
      await store.saveState(state);
    }
    const body = `✅ Your support request *#${handoffId}* is closed. Anything else? Reply *MENU* anytime.`;
    await messenger.send(handoff.phone, { kind: "text", text: body });
    await store.logMessage(handoff.bossId, "out", body, "bot", this.now());
    const boss = await platform.getBoss(handoff.bossId);
    const resolved = (await store.getHandoff(handoffId))!;
    if (boss) await supportDesk.notify({ event: "handoff.closed", handoff: resolved, boss: bossSummary(boss), reason: "resolved_by_agent" });
    return resolved;
  }

  // ── Outbox ────────────────────────────────────────────────────────────────

  private push(t: Turn, message: OutboundMessage, source = "bot"): void {
    t.outbox.push({ message, source });
  }

  private pushAll(t: Turn, messages: OutboundMessage[]): void {
    for (const m of messages) this.push(t, m);
  }

  private async flush(t: Turn): Promise<void> {
    for (const { message, source } of t.outbox) {
      try {
        await this.deps.messenger.send(t.boss.phone, message);
        await this.deps.store.logMessage(t.boss.id, "out", renderMessage(message).slice(0, 1000), source, this.now());
      } catch (err) {
        this.deps.logger.error("router: send failed", { bossId: t.boss.id, err });
        return; // keep ordering: don't send later messages if an earlier one failed
      }
    }
  }
}

function describeInbound(msg: InboundMessage): string {
  if (msg.type === "text") return msg.text ?? "";
  if (msg.type === "reply") return `[tapped] ${msg.replyTitle ?? msg.replyId}`;
  return `[${msg.rawType ?? "unsupported"} message]`;
}

function fit(text: string): string {
  return text.length <= LIMITS.interactiveBody ? text : text.slice(0, LIMITS.interactiveBody - 1) + "…";
}

function maskPhone(p: string): string {
  return p.length > 4 ? `${"*".repeat(p.length - 4)}${p.slice(-4)}` : p;
}
