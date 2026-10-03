import type { Assistant, AssistantAnswer, CoachActions } from "../ai/assistant.js";
import { formatAmount } from "../coach/goals.js";
import type { CoachService, CoachView, OpenedStep } from "../coach/service.js";
import type { CoachIntensity } from "../coach/types.js";
import { bossAddress, telegramAddress } from "../channels.js";
import { personaId, type DemoPlatform } from "../platform/demoPlatform.js";
import type { Config } from "../config.js";
import { contentCtx, type ContentCtx } from "../content/context.js";
import { moneyGoal, moneyMath, parseAmount } from "../coach/money.js";
import { lowerFirst, plannedStep, smallStep } from "../coach/plan.js";
import { getFaq, type FaqCategoryId, FAQ_CATEGORIES } from "../content/faq.js";
import { getGuide, type Guide } from "../content/guides.js";
import { getAudience, matchAudiences, type Audience } from "../content/invites.js";
import { ctaLink } from "../content/links.js";
import { nextBestAction } from "../content/nextBestAction.js";
import { getPlaybook, proposePlaybook } from "../content/playbooks.js";
import { QUICK_BUTTONS, isQuickButton, type QuickButtonId } from "../content/quickButtons.js";
import { getTopic } from "../content/topics.js";
import type { Logger } from "../logger.js";
import type { BossProfile, SharkerPlatform } from "../platform/types.js";
import type { BossState, Handoff, Store } from "../store/store.js";
import { humanize, shortDate } from "../util/format.js";
import { HOUR } from "../util/time.js";
import { renderMessage } from "../whatsapp/consoleMessenger.js";
import { LIMITS, type Button, type InboundMessage, type Messenger, type OutboundMessage } from "../whatsapp/types.js";
import {
  coachSessionMessage,
  fallbackPosts,
  goalProposalMessage,
  goalSetMessage,
  missionAlreadyDoneMessage,
  missionDoneMessage,
  missionMessage,
  missionNotVerifiedMessage,
  postsMessages,
  progressMessage,
  streakLine,
} from "./coachViews.js";
import { bossSummary, type SupportDesk } from "./handoff.js";
import { isAffirmative, isDoneReport, matchCommand, searchKnowledge } from "./intents.js";
import {
  channelsMessage,
  inviteFor,
  inviteMessages,
  moneyAnswerMessage,
  moneyMenu,
  playbookDoneMessage,
  playbookMenu,
  playbookOfferMessage,
  playbookStoppedMessage,
  onboardingHourQuestion,
  onboardingMessages,
  onboardingSocialsQuestion,
  planOverviewMessage,
  playerTextMessages,
  stepDoneMessage,
  stepMessages,
  stuckDoubtMessage,
  stuckHowMessage,
  stuckMenu,
  stuckTimeMessage,
  textsMenu,
  welcomeBackMessage,
  type Invite,
} from "./playViews.js";
import {
  BTN,
  aiAgentMessages,
  businessSnapshot,
  faqCategoryMenu,
  faqMessages,
  guideStepMessage,
  helpMenu,
  learnMenu,
  homeMessage,
  mainMenu,
  notABossMessage,
  settingsMenu,
  demoMenu,
  telegramLinkRequest,
  telegramLinkedMessage,
  telegramNotABossMessage,
  topicMessages,
  unsupportedMessage,
} from "./views.js";

export interface RouterDeps {
  platform: SharkerPlatform;
  store: Store;
  messenger: Messenger;
  assistant: Assistant | null;
  supportDesk: SupportDesk;
  coach: CoachService;
  config: Config;
  logger: Logger;
  /** Whether Telegram is configured (replies to support agents etc. may go there). */
  telegramEnabled?: boolean;
  /** Set in demo mode: lets testers switch between demo Boss profiles. */
  demo?: DemoPlatform;
  now?: () => Date;
}

/** Per-message conversation context. */
interface Turn {
  boss: BossProfile;
  state: BossState;
  ctx: ContentCtx;
  coach: CoachView;
  /** Where replies go: the address the message came from (WhatsApp number or "tg:<chat>"). */
  address: string;
  outbox: { message: OutboundMessage; source: string }[];
}

const AI_ANSWERS_PER_HOUR = 30;

/**
 * Handles every inbound message (WhatsApp or Telegram): menus and button taps (deterministic, instant),
 * coaching (missions, goals, progress, posts), step-by-step guides, human handoff, and free
 * text (the Claude coach, with keyword search fallback).
 */
export class BotRouter {
  private readonly aiUsage = new Map<string, number[]>();

  constructor(private readonly deps: RouterDeps) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  async handleInbound(msg: InboundMessage): Promise<void> {
    const { store, messenger, logger, config } = this.deps;
    if (!(await store.markProcessed("message", msg.messageId))) return; // webhook retry
    const channel = msg.channel ?? "whatsapp";
    const address = channel === "telegram" ? telegramAddress(msg.from) : msg.from;
    void messenger.markRead(msg.messageId, address);

    const now = this.now();
    const found = channel === "telegram" ? await this.telegramBoss(msg, address, now) : await this.whatsappBoss(msg);
    if (!found) return;
    const { boss, justLinked } = found;

    const state = await store.getState(boss.id, boss.phone);
    state.phone = boss.phone;
    state.lastInboundAt = now.toISOString();
    state.channel = channel; // proactive messages follow the Boss to the channel they use
    if (channel === "telegram") state.telegramChatId = msg.from;
    else state.waLastInboundAt = now.toISOString();
    const ctx = contentCtx(boss, { now, hubUrl: config.sharker.bossHubUrl, defaultTimezone: config.retention.defaultTimezone });
    ctx.demo = !!this.deps.demo;
    // Loading the coach view also records today's stats snapshot for week-over-week insights.
    const coach = await this.deps.coach.view(ctx);
    ctx.coach = coach;
    const turn: Turn = { boss, state, ctx, coach, address, outbox: [] };

    await store.logMessage(boss.id, "in", describeInbound(msg), "boss", now);
    try {
      if (justLinked) {
        this.push(turn, telegramLinkedMessage(boss, !!this.deps.demo));
        this.push(turn, homeMessage(ctx));
      } else {
        await this.dispatch(turn, msg);
      }
    } catch (err) {
      logger.error("router: failed to handle message", { bossId: boss.id, err });
      turn.outbox = [];
      this.push(turn, {
        kind: "buttons",
        body: "😕 Sorry, something went wrong on my side. Please try again in a moment.",
        buttons: [BTN.menu, BTN.human],
      });
    }
    turn.state.updatedAt = now.toISOString();
    await store.saveState(turn.state);
    await this.flush(turn);
  }

  // ── Who is writing? ───────────────────────────────────────────────────────

  private async whatsappBoss(msg: InboundMessage): Promise<{ boss: BossProfile; justLinked: boolean } | null> {
    const boss = await this.deps.platform.getBossByPhone(msg.from);
    if (boss) return { boss, justLinked: false };
    this.deps.logger.info("inbound from unknown number", { from: maskPhone(msg.from) });
    await this.deps.messenger.send(msg.from, notABossMessage());
    return null;
  }

  /**
   * Telegram doesn't reveal phone numbers, so the first time a Boss writes we ask them to
   * share theirs (Telegram's "share my phone number" button, verified to be their own) and
   * link the chat to the Boss with that number.
   */
  private async telegramBoss(msg: InboundMessage, address: string, now: Date): Promise<{ boss: BossProfile; justLinked: boolean } | null> {
    const { store, platform, messenger, logger } = this.deps;
    const link = await store.getTelegramLink(msg.from);
    if (link) {
      const boss = (await platform.getBossByPhone(link.phone)) ?? (await platform.getBoss(link.bossId));
      if (boss) return { boss, justLinked: false };
    }
    if (msg.type === "contact" && msg.contactPhone) {
      const boss = await platform.getBossByPhone(msg.contactPhone);
      if (!boss) {
        logger.info("telegram: no Boss for shared number", { phone: maskPhone(msg.contactPhone) });
        await messenger.send(address, telegramNotABossMessage());
        return null;
      }
      await store.saveTelegramLink({ chatId: msg.from, bossId: boss.id, phone: boss.phone, linkedAt: now.toISOString() });
      logger.info("telegram: chat linked to Boss", { bossId: boss.id });
      return { boss, justLinked: true };
    }
    await messenger.send(address, telegramLinkRequest(msg.profileName, msg.type === "contact"));
    return null;
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  private async dispatch(t: Turn, msg: InboundMessage): Promise<void> {
    await this.expireStaleHandoff(t);
    // The Boss is here: the plan's rescue ladder starts over.
    await this.deps.coach.engaged(t.boss.id, t.coach);

    if (msg.type === "contact") return this.push(t, homeMessage(t.ctx)); // already linked

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
    // Writing to the coach after a pause picks the plan up again.
    if (t.coach.state.playbook?.status === "paused" && t.state.mode === "bot") {
      const pb = await this.deps.coach.resumePlaybook(t.ctx, t.coach);
      if (pb) this.push(t, welcomeBackMessage(t.ctx, pb, t.coach.state.playbook?.step ?? 0));
    }
    if (cmd === "demo" && this.deps.demo) {
      t.state.flow = null;
      return this.push(t, demoMenu(this.deps.demo.personaOf(t.boss)?.title));
    }

    if (t.state.mode === "awaiting_handoff") {
      if (cmd === "menu") {
        t.state.mode = "bot";
        return this.push(t, homeMessage(t.ctx));
      }
      return this.openHandoff(t, text);
    }
    if (t.state.mode === "human") {
      if (cmd === "menu") return this.push(t, homeMessage(t.ctx));
      return this.forwardToHuman(t, text);
    }

    if (t.state.flow?.type === "guide" && isAffirmative(text)) return this.guideDone(t);
    if (cmd) t.state.flow = null;

    switch (cmd) {
      case "menu":
        return this.push(t, homeMessage(t.ctx));
      case "greet":
        // "hi" is a conversation, not a request for a menu: the AI coach answers like a person would.
        return this.deps.assistant && this.deps.config.ai.enabled ? this.answerFreeText(t, text) : this.push(t, homeMessage(t.ctx));
      case "help":
        return this.push(t, helpMenu());
      case "human":
        return this.askForHandoff(t);
      case "settings":
        return this.push(t, settingsMenu(t.state, t.coach.state.intensity));
      case "business":
        return this.push(t, businessSnapshot(t.ctx));
      case "agent":
        return this.pushAll(t, aiAgentMessages(t.ctx));
      case "learn":
        return this.push(t, learnMenu());
      case "mission":
        return this.showMission(t);
      case "progress":
        return this.showProgress(t);
      case "post":
        return this.writePosts(t);
      case "plan":
        return this.showPlan(t);
      case "texts":
        return this.push(t, textsMenu(t.ctx));
      case "money":
        return this.askMoney(t);
      case "channels":
        return this.push(t, channelsMessage(t.ctx, t.coach.state));
      default:
        // The bot asked something (who to invite, how much to earn): this message answers it.
        if (t.state.flow?.type === "ask") return this.answerAsk(t, text);
        // "sent it" / "done" completes today's mission without a tap.
        if (isDoneReport(text) && t.coach.todayMission?.record.status === "open") return this.onMission(t, "done");
        return this.answerFreeText(t, text);
    }
  }

  private async onReply(t: Turn, id: string): Promise<void> {
    const [kind, arg, extra] = id.split(":");
    switch (kind) {
      case "menu":
        return this.onMenu(t, arg);
      case "nba":
        return this.showMission(t);
      case "mission":
        return this.onMission(t, arg);
      case "goal":
        return this.onGoal(t, arg);
      case "coach":
        return arg === "session" ? this.showCoachSession(t) : this.showProgress(t);
      case "post":
        return this.writePosts(t);
      case "followup":
        return this.onFollowUpReply(t, arg === "done");
      case "play":
        return this.onPlay(t, arg ?? "", extra);
      case "onb":
        return this.onOnboarding(t, arg ?? "", extra ?? "");
      case "stuck":
        return this.onStuck(t, arg ?? "");
      case "invite":
        return this.onInvite(t, arg ?? "");
      case "texts":
        return this.push(t, textsMenu(t.ctx));
      case "money":
        return this.onMoney(t, arg ?? "");
      case "channels":
        return this.push(t, channelsMessage(t.ctx, t.coach.state));
      case "demo":
        return this.switchDemo(t, arg ?? "");
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
        return this.push(t, homeMessage(t.ctx));
      case "handoff":
        if (arg === "start") return this.askForHandoff(t);
        if (arg === "cancel") {
          t.state.mode = "bot";
          return this.push(t, { kind: "buttons", body: "No problem. I'm here if you need me.", buttons: [BTN.menu, BTN.help] });
        }
        if (arg === "close") return this.closeHandoffByBoss(t);
        return this.push(t, homeMessage(t.ctx));
      case "settings":
        return this.onSettings(t, arg ?? "", extra);
      case "ask":
        return this.push(t, {
          kind: "text",
          text: "✍️ Sure! Type your question in your own words and I'll help you right away.",
        });
      default:
        this.deps.logger.warn("router: unknown reply id", { id });
        return this.push(t, homeMessage(t.ctx));
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
        return this.push(t, settingsMenu(t.state, t.coach.state.intensity));
      case "more":
        return this.push(t, mainMenu(t.ctx));
      default:
        return this.push(t, homeMessage(t.ctx));
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
      body: "Sorry about that. Tell me more in your own words and I'll try again. Or talk to a person from our team.",
      buttons: [BTN.human, BTN.menu],
    });
  }

  private async onSettings(t: Turn, setting: string, value: string | undefined): Promise<void> {
    if (setting === "coach" && (value === "light" || value === "standard" || value === "intense")) {
      await this.deps.coach.setIntensity(t.boss.id, t.coach, value);
      const text: Record<CoachIntensity, string> = {
        intense: "🔥 *Push mode on!* Daily missions, check-ins and goals. Let's grow *" + t.boss.brandName + "* fast.",
        standard: "💪 *Standard coaching.* Missions twice a week plus your weekly coaching session.",
        light: "🌿 *Light touch.* Just your weekly coaching session. I'm here whenever you need me.",
      };
      return this.push(t, { kind: "buttons", body: text[value], buttons: [{ id: "mission:today", title: "🎯 Today's mission" }, BTN.menu] });
    }
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
    return this.push(t, settingsMenu(t.state, t.coach.state.intensity));
  }

  private setOptOut(t: Turn, optedOut: boolean): void {
    t.state.optedOut = optedOut;
    if (optedOut) {
      return this.push(t, {
        kind: "buttons",
        body:
          "⏸️ Done. I've paused tips and reminders.\n\nI'm still here whenever you need help: just type *MENU*. Reply *START* to turn tips back on.",
        buttons: [BTN.menu],
      });
    }
    this.push(t, { kind: "text", text: "▶️ Tips are back on! I'll keep you posted on your brand." });
    this.push(t, homeMessage(t.ctx));
  }

  // ── Guides ────────────────────────────────────────────────────────────────

  private startGuide(t: Turn, guideId: string): void {
    const requested = getGuide(guideId);
    if (!requested) return this.push(t, homeMessage(t.ctx));

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
    const flow = t.state.flow?.type === "guide" ? t.state.flow : null;
    const guide = flow ? getGuide(flow.guideId) : undefined;
    if (!flow || !guide) {
      t.state.flow = null;
      return this.push(t, homeMessage(t.ctx));
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

  private async finishGuide(t: Turn, guide: Guide): Promise<void> {
    t.state.flow = null;
    this.deps.logger.info("guide completed", { bossId: t.boss.id, guide: guide.id });
    // Opening a marketing channel is remembered, so the coach moves on to the next one.
    if (guide.channel) await this.deps.coach.markChannel(t.boss.id, t.coach, guide.channel, t.ctx.now);
    // Finishing the guide for today's mission completes the mission too.
    const m = t.coach.todayMission;
    if (m && m.record.status === "open" && m.def.guide === guide.id) {
      const r = await this.deps.coach.completeMission(t.ctx, t.coach, m);
      if (r.status === "done") this.push(t, { kind: "text", text: `✅ Today's mission done too! +${r.points} points\n${streakLine(t.coach)}` });
    }
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
      body: "No problem. Tell me what's happening in your own words and I'll help you. Or talk to a person from our team.",
      buttons: [BTN.human, { id: "guide_step:exit", title: "✖️ Exit guide" }],
    });
  }

  // ── Demo mode ─────────────────────────────────────────────────────────────

  /** Turns this number into another demo Boss profile and shows its menu. */
  private async switchDemo(t: Turn, value: string): Promise<void> {
    const demo = this.deps.demo;
    const persona = personaId(value);
    if (!demo || !persona) return this.push(t, demo ? demoMenu() : homeMessage(t.ctx));
    const { store, config, coach } = this.deps;
    const boss = await demo.assign(t.boss.phone, persona);
    const state = await store.getState(boss.id, boss.phone);
    // The new profile is reached on the same channel as the old one.
    state.channel = t.state.channel;
    state.telegramChatId = t.state.telegramChatId;
    state.lastInboundAt = t.state.lastInboundAt;
    state.waLastInboundAt = t.state.waLastInboundAt;
    await store.saveState({ ...t.state, flow: null });
    t.boss = boss;
    t.state = state;
    t.ctx = contentCtx(boss, { now: t.ctx.now, hubUrl: config.sharker.bossHubUrl, defaultTimezone: config.retention.defaultTimezone });
    t.ctx.demo = true;
    t.coach = await coach.view(t.ctx);
    t.ctx.coach = t.coach;
    const p = demo.personaOf(boss)!;
    this.deps.logger.info("demo profile switched", { bossId: boss.id });
    this.push(t, { kind: "text", text: `🧪 You're now testing as *${boss.firstName}* (*${boss.brandName}*).\n${p.description}` });
    this.push(t, homeMessage(t.ctx));
  }

  // ── Plans: launch program & campaigns ──────────────────────────────────────

  /** Today's step of the active plan; otherwise the plan the coach would start now. */
  private async showPlan(t: Turn): Promise<void> {
    const state = t.coach.state;
    if (state.playbook?.status === "active") return this.openStep(t);
    const proposed = proposePlaybook(t.ctx, state);
    if (proposed) return this.push(t, playbookOfferMessage(t.ctx, proposed));
    return this.push(t, playbookMenu(t.ctx, state));
  }

  private async onPlay(t: Turn, action: string, id?: string): Promise<void> {
    const coach = this.deps.coach;
    switch (action) {
      case "start": {
        const pb = getPlaybook(id ?? "");
        const opened = pb ? await coach.startPlaybook(t.ctx, t.coach, pb.id) : null;
        if (!pb || !opened) return this.push(t, playbookMenu(t.ctx, t.coach.state));
        this.deps.logger.info("playbook started", { bossId: t.boss.id, playbook: pb.id });
        // The launch program starts with a short chat: how the money works, then three questions.
        if (pb.id === "launch" && !t.coach.state.prefs.onboardedAt) {
          t.state.flow = { type: "ask", ask: "onb_time" };
          return this.pushAll(t, onboardingMessages(t.ctx, pb));
        }
        this.push(t, { kind: "text", text: `${pb.emoji} *${pb.title}* starts now. ${pb.steps.length} days. I lead, you send. Let's go.` });
        return this.showStep(t, opened);
      }
      case "today":
        if (t.coach.state.playbook?.status === "paused") return this.resumePlan(t);
        return this.openStep(t);
      case "next":
        return this.openStep(t, true);
      case "stop":
        await coach.finishPlaybook(t.boss.id, t.coach, "stopped");
        return this.push(t, playbookStoppedMessage());
      default:
        return this.push(t, playbookMenu(t.ctx, t.coach.state));
    }
  }

  private async openStep(t: Turn, advance = false): Promise<void> {
    const r = await this.deps.coach.openStep(t.ctx, t.coach, { advance, byBoss: true });
    if (r === null || "paused" in r) return this.push(t, playbookMenu(t.ctx, t.coach.state));
    if ("finished" in r) return this.push(t, playbookDoneMessage(t.ctx, r.finished, t.coach));
    return this.showStep(t, r);
  }

  private showStep(t: Turn, r: OpenedStep): void {
    if (r.step.ask === "audience" && r.mission.record.status !== "done") t.state.flow = { type: "ask", ask: "audience" };
    return this.pushAll(t, stepMessages(t.ctx, r, t.coach));
  }

  /** The Boss came back to a paused plan: pick up where they stopped, warmly. */
  private async resumePlan(t: Turn): Promise<void> {
    const pb = await this.deps.coach.resumePlaybook(t.ctx, t.coach);
    if (!pb) return this.openStep(t);
    this.push(t, welcomeBackMessage(t.ctx, pb, t.coach.state.playbook?.step ?? 0));
    return this.openStep(t);
  }

  // ── Launch program onboarding: three questions, then the plan ─────────────

  private async onOnboarding(t: Turn, question: string, value: string): Promise<void> {
    const coach = this.deps.coach;
    if (question === "time") {
      await coach.setPrefs(t.boss.id, t.coach, { minutesPerDay: Number(value) || 10 });
      t.state.flow = { type: "ask", ask: "onb_social" };
      return this.push(t, onboardingSocialsQuestion());
    }
    if (question === "social") {
      const socials = value === "both" ? ["instagram", "tiktok"] : value === "none" ? [] : [value].filter((v) => ["instagram", "tiktok", "facebook"].includes(v));
      await coach.setPrefs(t.boss.id, t.coach, { socials });
      for (const network of socials) await coach.markChannel(t.boss.id, t.coach, network, t.ctx.now);
      t.state.flow = { type: "ask", ask: "onb_hour" };
      return this.push(t, onboardingHourQuestion());
    }
    if (question === "hour") {
      await coach.setPrefs(t.boss.id, t.coach, { preferredHour: [9, 13, 18].includes(Number(value)) ? Number(value) : 9, onboardedAt: t.ctx.now.toISOString() });
      t.state.flow = null;
      this.deps.logger.info("onboarding done", { bossId: t.boss.id, prefs: t.coach.state.prefs });
      const pb = getPlaybook(t.coach.state.playbook?.id ?? "launch")!;
      this.push(t, planOverviewMessage(pb, t.coach.state));
      return this.openStep(t);
    }
    return this.openStep(t);
  }

  /** Free-text answers to the onboarding questions ("half an hour", "only insta", "evenings"). */
  private onboardingAnswer(ask: "onb_time" | "onb_social" | "onb_hour", text: string): string {
    const n = text.toLowerCase();
    if (ask === "onb_time") {
      if (/half|חצי|media|meia/.test(n)) return "30";
      if (/hour|שעה|hora/.test(n)) return "60";
      const minutes = parseAmount(n);
      return minutes ? String(minutes >= 45 ? 60 : minutes >= 20 ? 30 : 10) : "10";
    }
    if (ask === "onb_social") {
      const insta = /insta|אינסטגרם|אינסטה/.test(n);
      const tiktok = /tik ?tok|טיקטוק/.test(n);
      if (insta && tiktok) return "both";
      if (insta) return "instagram";
      if (tiktok) return "tiktok";
      if (/facebook|פייסבוק/.test(n)) return "facebook";
      return "none";
    }
    if (/even|night|ערב|לילה|noite|noche/.test(n)) return "18";
    if (/after|noon|צהריים|tarde/.test(n)) return "13";
    return "9";
  }

  // ── "I'm stuck": the Boss says what's in the way, the coach makes it easier ─

  private async onStuck(t: Turn, reason: string): Promise<void> {
    const coach = this.deps.coach;
    await coach.engaged(t.boss.id, t.coach);
    const withView = { ...t.ctx, coach: t.coach };
    const planned = plannedStep(withView);
    const small = planned && planned !== "finished" ? smallStep(withView, planned) : lowerFirst((await coach.ensureTodayMission(t.ctx, t.coach)).def.title);
    this.deps.logger.info("boss stuck", { bossId: t.boss.id, reason });
    switch (reason) {
      case "time":
        await coach.setPrefs(t.boss.id, t.coach, { minutesPerDay: 5 });
        return this.push(t, stuckTimeMessage(small));
      case "how": {
        const r = await coach.openStep(t.ctx, t.coach, { byBoss: true });
        const mission = r && "mission" in r ? r.mission : await coach.ensureTodayMission(t.ctx, t.coach);
        const guide = r && "step" in r ? r.step.button?.(t.ctx, t.coach.state)?.id.replace(/^guide:/, "") : undefined;
        const guideId = guide && getGuide(guide) ? guide : mission.def.guide;
        if (guideId) {
          this.push(t, { kind: "text", text: "🤝 No problem, we do it together. One small step at a time, right here." });
          return this.startGuide(t, guideId);
        }
        if (r && "step" in r) this.pushAll(t, stepMessages(t.ctx, r, t.coach).slice(0, -1));
        return this.push(t, stuckHowMessage());
      }
      case "doubt":
        return this.push(t, stuckDoubtMessage(t.ctx, t.coach, small));
      case "skip":
        return this.openStep(t, true);
      default:
        return this.push(t, stuckMenu());
    }
  }

  // ── Texts: invites, welcome, follow-ups ───────────────────────────────────

  private async onInvite(t: Turn, which: string): Promise<void> {
    const audience = getAudience(which);
    if (audience) {
      await this.deps.coach.addAudiences(t.boss.id, t.coach, [audience.id]);
      return this.pushAll(t, await this.invitesFor(t, [audience]));
    }
    const player = playerTextMessages(t.ctx, which);
    return player ? this.pushAll(t, player) : this.push(t, textsMenu(t.ctx));
  }

  /** Built-in invites, or Claude's version in the Boss's voice when it's available (one audience at a time). */
  private async invitesFor(t: Turn, audiences: Audience[]): Promise<OutboundMessage[]> {
    const invites: Invite[] = [];
    for (const a of audiences) {
      const ai = audiences.length === 1 ? await this.aiInvite(t, a.description) : null;
      invites.push(ai ? { title: a.title, text: ai } : inviteFor(t.ctx, a));
    }
    return inviteMessages(t.ctx, invites);
  }

  private async aiInvite(t: Turn, audience: string): Promise<string | null> {
    const { assistant, config } = this.deps;
    if (!assistant?.writeInvite || !config.ai.enabled || !this.allowAi(t.boss.id)) return null;
    const text = await assistant.writeInvite({ ctx: t.ctx, audience });
    return text ? humanize(text) : null;
  }

  /** The Boss answered a question the bot asked in free text. */
  private async answerAsk(t: Turn, text: string): Promise<void> {
    const ask = t.state.flow?.type === "ask" ? t.state.flow.ask : null;
    t.state.flow = null;
    if (ask === "onb_time" || ask === "onb_social" || ask === "onb_hour") {
      return this.onOnboarding(t, ask.slice(4), this.onboardingAnswer(ask, text));
    }
    if (ask === "audience") {
      const found = matchAudiences(text);
      if (found.length > 0) {
        await this.deps.coach.addAudiences(t.boss.id, t.coach, found.map((a) => a.id));
        return this.pushAll(t, await this.invitesFor(t, found.slice(0, 3)));
      }
      // Their own words ("my yoga class") → remember it and write for it.
      const who = text.slice(0, 60);
      await this.deps.coach.addAudiences(t.boss.id, t.coach, [who]);
      const ai = await this.aiInvite(t, text);
      if (ai) return this.pushAll(t, inviteMessages(t.ctx, [{ title: who, text: ai }]));
      const friends = getAudience("friends")!;
      this.push(t, { kind: "text", text: `Got it: ${who}. Here's an invite that works for people who know you. Change a word if you like, then send it to 5 of them.` });
      return this.pushAll(t, inviteMessages(t.ctx, [inviteFor(t.ctx, friends)]));
    }
    if (ask === "money") {
      const amount = parseAmount(text);
      if (amount) return this.answerMoney(t, amount);
    }
    return this.answerFreeText(t, text);
  }

  // ── Earnings math ─────────────────────────────────────────────────────────

  private askMoney(t: Turn): void {
    t.state.flow = { type: "ask", ask: "money" };
    return this.push(t, moneyMenu(t.ctx));
  }

  private async onMoney(t: Turn, arg: string): Promise<void> {
    const amount = parseAmount(arg);
    return amount ? this.answerMoney(t, amount) : this.askMoney(t);
  }

  /** Target per month → players needed, from the Boss's own numbers; becomes the proposed goal. */
  private async answerMoney(t: Turn, amount: number): Promise<void> {
    const m = moneyMath(t.ctx, t.coach.insights, amount);
    t.coach.state.pendingGoal = moneyGoal(m, t.ctx.now);
    await this.deps.coach.save(t.boss.id, t.coach.state);
    this.deps.logger.info("earnings math", { bossId: t.boss.id, target: amount, kind: m.kind });
    return this.push(t, moneyAnswerMessage(t.ctx, m, t.coach.state));
  }

  // ── Coaching ──────────────────────────────────────────────────────────────

  private async showMission(t: Turn): Promise<void> {
    const m = await this.deps.coach.ensureTodayMission(t.ctx, t.coach);
    if (m.record.status === "done") return this.push(t, missionAlreadyDoneMessage(t.coach));
    if (m.record.status === "skipped") {
      const next = await this.deps.coach.bonusMission(t.ctx, t.coach);
      return this.push(t, missionMessage(t.ctx, next.def, t.coach));
    }
    return this.push(t, missionMessage(t.ctx, m.def, t.coach));
  }

  private async onMission(t: Turn, action: string | undefined): Promise<void> {
    const coach = this.deps.coach;
    switch (action) {
      case "done": {
        const m = await coach.ensureTodayMission(t.ctx, t.coach);
        if (m.record.status === "done") return this.push(t, missionAlreadyDoneMessage(t.coach));
        const r = await coach.completeMission(t.ctx, t.coach, m);
        if (r.status === "not_verified") return this.push(t, missionNotVerifiedMessage(m.def));
        this.deps.logger.info("mission completed", { bossId: t.boss.id, mission: m.def.id, streak: r.streak });
        // On a plan day, finishing the mission finishes the day: say what tomorrow brings.
        const pb = t.coach.state.playbook;
        const plan = pb?.status === "active" && pb.stepDate === t.coach.today ? getPlaybook(pb.id) : undefined;
        if (plan && pb) this.push(t, stepDoneMessage(t.ctx, plan, pb.step, t.coach, r.points));
        else this.push(t, missionDoneMessage(r, t.coach));
        return this.celebrateGoalIfReached(t);
      }
      case "skip": {
        const m = t.coach.todayMission;
        if (m && m.record.status === "open") await coach.skipMission(t.boss.id, t.coach, m);
        const next = await coach.bonusMission(t.ctx, t.coach);
        return this.push(t, missionMessage(t.ctx, next.def, t.coach, "🔄 *No problem. Try this one instead*"));
      }
      case "bonus": {
        const next = await coach.bonusMission(t.ctx, t.coach);
        return this.push(t, missionMessage(t.ctx, next.def, t.coach, "🎯 *Bonus mission*"));
      }
      case "help": {
        const m = await coach.ensureTodayMission(t.ctx, t.coach);
        if (m.def.guide) return this.startGuide(t, m.def.guide);
        if (this.deps.assistant && this.deps.config.ai.enabled) {
          return this.answerFreeText(t, `Help me do today's mission step by step: ${m.def.task}`);
        }
        return this.push(t, {
          kind: "buttons",
          body: `🙋 *How to do it*\n\n${m.def.task}\n\n💡 ${m.def.why}\n\nStart small. One message, one group, one post. You've got this! 💪`,
          buttons: [{ id: "mission:done", title: "✅ Done" }, { id: "mission:skip", title: "🔄 Another one" }, BTN.human],
        });
      }
      default:
        return this.showMission(t);
    }
  }

  private async onGoal(t: Turn, action: string | undefined): Promise<void> {
    const coach = this.deps.coach;
    switch (action) {
      case "accept":
        await coach.acceptPendingGoal(t.ctx, t.coach);
        return this.push(t, goalSetMessage(t.ctx, t.coach));
      case "higher":
        return this.push(t, goalProposalMessage(t.ctx, await coach.adjustPendingGoal(t.ctx, t.coach, 1.5), t.coach, "📈 *Let's aim higher*"));
      case "lower":
        return this.push(t, goalProposalMessage(t.ctx, await coach.adjustPendingGoal(t.ctx, t.coach, 0.7), t.coach, "📉 *A smaller first step*"));
      default:
        return this.push(t, goalProposalMessage(t.ctx, await coach.proposeGoal(t.ctx, t.coach), t.coach));
    }
  }

  private async showProgress(t: Turn): Promise<void> {
    await this.celebrateGoalIfReached(t);
    return this.push(t, progressMessage(t.ctx, t.coach));
  }

  private async showCoachSession(t: Turn): Promise<void> {
    const m = await this.deps.coach.ensureTodayMission(t.ctx, t.coach);
    return this.push(t, coachSessionMessage(t.ctx, t.coach, m.def));
  }

  /** Celebrates in the conversation when the goal was reached (and stops the proactive one). */
  private async celebrateGoalIfReached(t: Turn): Promise<void> {
    const goal = t.coach.state.goal;
    if (goal?.status !== "active" || t.coach.goal?.status !== "achieved") return;
    await this.deps.coach.markGoalAchieved(t.boss.id, t.coach, t.ctx.now);
    this.push(t, {
      kind: "buttons",
      body: `🏆 *Goal reached, ${t.boss.firstName}!*\n\n*${t.boss.brandName}* hit ${formatAmount(goal.metric, goal.target, t.boss.stats.currency)}. That's your business growing because you pushed it.\n\nReady for a bigger one?`,
      buttons: [{ id: "goal:new", title: "🎯 New goal" }, BTN.menu],
    });
  }

  private async writePosts(t: Turn, request?: string): Promise<void> {
    const { assistant, config } = this.deps;
    let posts: string[] | null = null;
    if (assistant && config.ai.enabled && this.allowAi(t.boss.id)) posts = (await assistant.writePosts({ ctx: t.ctx, request }))?.map(humanize) ?? null;
    return this.pushAll(t, postsMessages(t.ctx, posts ?? fallbackPosts(t.ctx)));
  }

  private onFollowUpReply(t: Turn, done: boolean): void {
    if (done) {
      return this.push(t, {
        kind: "buttons",
        body: `🙌 Love it, ${t.boss.firstName}! That's exactly how *${t.boss.brandName}* grows.\n\n${streakLine(t.coach)}\n\nWhat's next?`,
        buttons: [{ id: "mission:today", title: "🎯 Today's mission" }, { id: "coach:progress", title: "🏆 My progress" }, BTN.menu],
      });
    }
    return this.push(t, {
      kind: "buttons",
      body: "No stress. What's getting in the way? Tell me in a few words and we'll make it easier. Or let me write the post for you.",
      buttons: [{ id: "post:write", title: "✍️ Write me a post" }, { id: "mission:today", title: "🎯 Today's mission" }, BTN.menu],
    });
  }

  /** Applies what the AI coach decided (goal, memory, follow-up, mission) and confirms it. */
  private async applyActions(t: Turn, actions: CoachActions): Promise<void> {
    const coach = this.deps.coach;
    const now = t.ctx.now;
    const confirmations: string[] = [];
    if (actions.remember.length > 0) await coach.remember(t.boss.id, t.coach, actions.remember, now);
    if (actions.setGoal) {
      const g = await coach.setGoal(t.ctx, t.coach, actions.setGoal.metric, actions.setGoal.target, actions.setGoal.days);
      const deadline = shortDate(g.deadline, t.ctx.timezone).replace(/, \d{4}$/, "");
      confirmations.push(`🎯 Goal saved: *${formatAmount(g.metric, g.target, t.boss.stats.currency)} by ${deadline}*. I'll track it for you.`);
    }
    if (actions.missionDone) {
      const m = t.coach.todayMission;
      if (m && m.record.status === "open") {
        const r = await coach.completeMission(t.ctx, t.coach, m);
        if (r.status === "done") confirmations.push(`✅ Mission done: +${r.points} points · 🔥 ${r.streak} in a row`);
      }
    }
    if (actions.followUp) {
      const f = await coach.scheduleFollowUp(t.boss.id, t.coach, actions.followUp.hours, actions.followUp.reason, now);
      const when = actions.followUp.hours <= 12 ? "later today" : actions.followUp.hours <= 36 ? "tomorrow" : `on ${shortDate(f.dueAt, t.ctx.timezone).replace(/, \d{4}$/, "")}`;
      confirmations.push(`⏰ I'll check in with you ${when}.`);
    }
    if (confirmations.length > 0) this.push(t, { kind: "text", text: confirmations.join("\n") });
  }

  // ── Free text ─────────────────────────────────────────────────────────────

  private async answerFreeText(t: Turn, text: string): Promise<void> {
    const { assistant, store } = this.deps;
    if (assistant && this.deps.config.ai.enabled && this.allowAi(t.boss.id)) {
      const history = (await store.recentMessages(t.boss.id, 13)).slice(0, -1); // drop the message being answered
      const answer = await assistant.answer({ ctx: t.ctx, question: text, history, flow: t.state.flow });
      if (answer) {
        this.pushAnswer(t, answer);
        return this.applyActions(t, answer.actions);
      }
    }

    // "I want to earn 500 a month" → the earnings math, not the FAQ about earnings.
    const amount = /\b(earn|make|money|month|target)\b/i.test(text) ? parseAmount(text) : null;
    if (amount) return this.answerMoney(t, amount);
    const match = searchKnowledge(text);
    if (match?.type === "faq") return this.pushAll(t, faqMessages(match.faq, t.ctx));
    if (match?.type === "topic") return this.pushAll(t, topicMessages(match.topic, t.ctx));
    // Someone they could invite, named in passing ("my gym buddies") → write the invite.
    const audiences = matchAudiences(text);
    if (audiences.length > 0) {
      await this.deps.coach.addAudiences(t.boss.id, t.coach, audiences.map((a) => a.id));
      return this.pushAll(t, await this.invitesFor(t, audiences.slice(0, 2)));
    }
    return this.push(t, {
      kind: "buttons",
      body: "🤔 I didn't catch that. Here's what I can do right now. Or ask me in a different way.",
      buttons: [this.coachButton(t), BTN.help, BTN.human],
    });
  }

  private coachButton(t: Turn): Button {
    const id = this.defaultButtons(t)[0]!;
    return { id, title: QUICK_BUTTONS[id] };
  }

  /** Every AI reply ends with buttons: the Boss can tap the next step or keep typing. */
  private pushAnswer(t: Turn, a: AssistantAnswer): void {
    const source = "ai";
    const picked: Button[] = (a.buttons.length > 0 ? a.buttons : this.defaultButtons(t)).slice(0, LIMITS.maxButtons).map((id) => ({ id, title: QUICK_BUTTONS[id] }));
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
          body: "I'll walk you through it step by step.",
          buttons: [{ id: `guide:${a.guide}`, title: "🧭 Guide me" }, BTN.menu],
        });
      }
      return;
    }
    if (a.guide) {
      const other = picked.find((b) => !b.id.startsWith("guide") && b.id !== "menu:main");
      return this.push(t, { kind: "buttons", body: fit(a.reply), buttons: [{ id: `guide:${a.guide}`, title: "🧭 Guide me" }, ...(other ? [other] : []), BTN.menu] }, source);
    }
    if (a.reply.length <= LIMITS.interactiveBody) return this.push(t, { kind: "buttons", body: a.reply, buttons: picked }, source);
    this.push(t, { kind: "text", text: a.reply }, source);
    this.push(t, { kind: "buttons", body: "👇 Next:", buttons: picked }, source);
  }

  /** When the model didn't pick buttons: today's plan or mission, and the menu. */
  private defaultButtons(t: Turn): QuickButtonId[] {
    return [t.coach.state.playbook?.status === "active" ? "play:today" : "mission:today", "menu:main"];
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
        body: `🙋 Your request #${t.state.handoffId} is already with our support team. Just write here. They'll see it.`,
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
    const state = await store.getState(handoff.bossId, handoff.phone);
    await messenger.send(bossAddress(state, handoff.phone, !!this.deps.telegramEnabled), { kind: "text", text: body });
    await store.logMessage(handoff.bossId, "out", body, "human_agent", this.now());
    state.mode = "human";
    state.handoffId = handoff.id;
    state.updatedAt = this.now().toISOString(); // keeps the handoff alive
    await store.saveState(state);
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
      state.updatedAt = this.now().toISOString();
      await store.saveState(state);
    }
    const body = `✅ Your support request *#${handoffId}* is closed. Anything else? Reply *MENU* anytime.`;
    await messenger.send(bossAddress(state, handoff.phone, !!this.deps.telegramEnabled), { kind: "text", text: body });
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
        await this.deps.messenger.send(t.address, message);
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
