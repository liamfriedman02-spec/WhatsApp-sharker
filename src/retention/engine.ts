import { bossSummary, type SupportDesk } from "../bot/handoff.js";
import { bossAddress, channelOf } from "../channels.js";
import { CoachService } from "../coach/service.js";
import type { CoachIntensity } from "../coach/types.js";
import type { Config } from "../config.js";
import { contentCtx, type ContentCtx } from "../content/context.js";
import type { NudgeTemplate } from "../content/nudges.js";
import type { Logger } from "../logger.js";
import type { BossProfile, PlatformEvent, SharkerPlatform } from "../platform/types.js";
import type { BossState, Store } from "../store/store.js";
import { DAY, HOUR, inQuietHours, localTime } from "../util/time.js";
import type { ChannelName, Messenger } from "../whatsapp/types.js";
import { renderNudge, type Channel } from "./render.js";
import { TRIGGERS, seriesLength, type Trigger, type TriggerInput } from "./triggers.js";

export interface Candidate {
  trigger: Trigger;
  step: number;
  template: NudgeTemplate;
}

export interface Decision {
  bossId: string;
  /** Eligible nudges, highest priority first. */
  candidates: { trigger: string; step: number; template: string }[];
  /** Why nothing was sent (when nothing was). */
  blocked?: string;
  sent?: {
    trigger: string;
    step: number;
    template: string;
    /** session = interactive message; template = approved WhatsApp template (outside the 24h window). */
    channel: Channel;
    /** The app the message went out on. */
    via: ChannelName;
    messageId: string | null;
  };
}

export interface RetentionDeps {
  platform: SharkerPlatform;
  store: Store;
  messenger: Messenger;
  config: Config;
  logger: Logger;
  coach?: CoachService;
  /** Told when a Boss goes quiet mid-plan, so a person can reach out. */
  supportDesk?: SupportDesk;
  telegramEnabled?: boolean;
  now?: () => Date;
}

/** A Boss chatting right now shouldn't be interrupted by a reminder. */
const ACTIVE_CONVERSATION_MS = 1 * HOUR;
/** Minimum spacing between any two proactive messages. */
const MIN_GAP_BETWEEN_NUDGES_MS = 3 * HOUR;
/** Minimum spacing between two reminders/summaries (no evening + next-morning double). */
const MIN_GAP_BETWEEN_REMINDERS_MS = 12 * HOUR;
/** Reminders/summaries per rolling 7 days, by coaching intensity (celebrations and requested check-ins excluded). */
const WEEKLY_REMINDER_CAP: Record<CoachIntensity, number> = { light: 2, standard: 4, intense: 7 };
/** The Boss asked for these (check-ins, a plan they started), so they don't use the weekly budget. */
const REQUESTED_TRIGGERS = new Set(["follow_up", "playbook_step", "plan_checkin"]);
/**
 * A plan the Boss started is accompanied closely: its morning step and evening check-in may
 * share a day (only the daily total, the 3h gap and "not mid-chat" apply).
 */
const PLAN_TRIGGERS = new Set(["playbook_step", "plan_checkin"]);
/** Stay safely inside WhatsApp's 24h customer-service window for free-form messages. */
const SESSION_WINDOW_MS = 24 * HOUR - 15 * 60_000;

export class RetentionEngine {
  private sweeping = false;
  private readonly coach: CoachService;

  constructor(private readonly deps: RetentionDeps) {
    this.coach = deps.coach ?? new CoachService({ store: deps.store, platform: deps.platform, logger: deps.logger });
  }

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  /** Decide (and, unless dryRun, send) the single best nudge for this Boss right now. */
  async runForBoss(boss: BossProfile, opts: { dryRun?: boolean } = {}): Promise<Decision> {
    const { store, config } = this.deps;
    const now = this.now();
    const ctx = contentCtx(boss, { now, hubUrl: config.sharker.bossHubUrl, defaultTimezone: config.retention.defaultTimezone });
    const state = await store.getState(boss.id, boss.phone);
    const local = localTime(now, ctx.timezone);
    const lastSentIso = await store.lastSentByTrigger(boss.id);
    // Loading the coach view also records today's stats snapshot (not in previews).
    const coach = await this.coach.view(ctx, { readOnly: !!opts.dryRun });
    ctx.coach = coach;
    const input: TriggerInput = {
      ctx,
      state,
      local,
      coach,
      lastSent: (id) => (lastSentIso[id] ? new Date(lastSentIso[id]) : null),
    };

    const candidates = await this.candidates(input, !!opts.dryRun);
    const decision: Decision = {
      bossId: boss.id,
      candidates: candidates.map((c) => ({ trigger: c.trigger.id, step: c.step, template: c.template.name })),
    };
    if (candidates.length === 0) return { ...decision, blocked: "nothing_due" };

    const to = bossAddress(state, boss.phone, !!this.deps.telegramEnabled);
    const via = channelOf(to);
    const blocked = this.globalBlock(boss, state, local.hour, via);
    if (blocked) return { ...decision, blocked };

    const chosen = await this.applyCaps(candidates, state, now, boss.id, ctx.timezone, coach.state.intensity);
    if ("blocked" in chosen) return { ...decision, blocked: chosen.blocked };

    // Telegram has no messaging window: always the interactive version. WhatsApp needs an
    // approved template unless the Boss wrote on WhatsApp in the last 24h.
    const waOpen = !!state.waLastInboundAt && now.getTime() - new Date(state.waLastInboundAt).getTime() < SESSION_WINDOW_MS;
    const channel: Channel = via === "telegram" || waOpen ? "session" : "template";
    const sent = { trigger: chosen.trigger.id, step: chosen.step, template: chosen.template.name, channel, via };

    if (opts.dryRun) return { ...decision, sent: { ...sent, messageId: null } };
    const alert = chosen.trigger.alertTeam?.(input) ?? null;
    const messageId = await this.deliver(chosen, ctx, to, channel, now);
    await chosen.trigger.onSent?.(input, this.coach);
    if (alert) {
      this.deps.logger.warn("retention: Boss at risk, team alerted", { bossId: boss.id, reason: alert });
      await this.deps.supportDesk?.notify({ event: "boss.at_risk", boss: bossSummary(boss), reason: alert });
    }
    return { ...decision, sent: { ...sent, messageId } };
  }

  /** Periodic sweep over every Boss. */
  async sweep(): Promise<{ checked: number; sent: number; blocked: Record<string, number>; errors: number }> {
    const summary = { checked: 0, sent: 0, blocked: {} as Record<string, number>, errors: 0 };
    if (this.sweeping) return summary;
    this.sweeping = true;
    try {
      for await (const boss of this.deps.platform.listBosses()) {
        summary.checked++;
        try {
          const d = await this.runForBoss(boss);
          if (d.sent) summary.sent++;
          else if (d.blocked) summary.blocked[d.blocked] = (summary.blocked[d.blocked] ?? 0) + 1;
        } catch (err) {
          summary.errors++;
          this.deps.logger.error("retention: boss failed", { bossId: boss.id, err });
        }
      }
      this.deps.logger.info("retention sweep done", summary);
      return summary;
    } finally {
      this.sweeping = false;
    }
  }

  /** Real-time path: a platform event (first player, Agent connected…) re-evaluates that Boss immediately. */
  async handleEvent(event: PlatformEvent): Promise<Decision | null> {
    const { store, platform, logger } = this.deps;
    if (!(await store.markProcessed("event", event.id))) return null;
    platform.invalidate?.({ id: event.bossId });
    const boss = await platform.getBoss(event.bossId);
    if (!boss) {
      logger.warn("retention: event for unknown boss", { eventId: event.id, bossId: event.bossId });
      return null;
    }
    const decision = await this.runForBoss(boss);
    logger.info("retention: event handled", { eventId: event.id, type: event.type, bossId: boss.id, sent: decision.sent?.trigger, blocked: decision.blocked });
    return decision;
  }

  private async candidates(input: TriggerInput, dryRun: boolean): Promise<Candidate[]> {
    const { store } = this.deps;
    const { ctx } = input;
    const out: Candidate[] = [];
    for (const trigger of TRIGGERS) {
      const due = trigger.when(input);
      switch (trigger.schedule.type) {
        case "once":
          if (due && !input.lastSent(trigger.id)) out.push({ trigger, step: 0, template: trigger.template(input, 0) });
          break;
        case "recurring":
          if (due) out.push({ trigger, step: 0, template: trigger.template(input, 0) });
          break;
        case "series": {
          const series = await store.getSeries(ctx.boss.id, trigger.id);
          if (!due) {
            // Condition resolved (e.g. Agent activated) → close the series so a future episode starts fresh.
            if (series && !dryRun) await store.resetSeries(ctx.boss.id, trigger.id);
            break;
          }
          if (!series) {
            out.push({ trigger, step: 0, template: trigger.template(input, 0) });
            break;
          }
          if (series.count >= seriesLength(trigger)) break; // series exhausted — never nag beyond the max
          const gapDays = trigger.schedule.gapsDays[series.count - 1] ?? Infinity;
          if (ctx.now.getTime() - new Date(series.lastSentAt).getTime() >= gapDays * DAY) {
            out.push({ trigger, step: series.count, template: trigger.template(input, series.count) });
          }
          break;
        }
      }
    }
    return out.sort((a, b) => b.trigger.priority - a.trigger.priority);
  }

  private globalBlock(boss: BossProfile, state: BossState, localHour: number, via: ChannelName): string | null {
    const r = this.deps.config.retention;
    // WhatsApp requires explicit opt-in; on Telegram the Boss started the bot and linked it themselves.
    if (via === "whatsapp" && !boss.whatsappOptIn) return "no_whatsapp_opt_in";
    if (state.optedOut) return "opted_out";
    if (state.mode !== "bot") return "human_handoff_active";
    if (inQuietHours(localHour, r.quietHoursStart, r.quietHoursEnd)) return "quiet_hours";
    return null;
  }

  /**
   * Frequency rules, per the Boss's local calendar day (so daily messages keep a stable time):
   * at most `maxNudgesPerDay` messages and `maxRemindersPerDay` reminders/summaries per day,
   * a weekly reminder budget set by coaching intensity, reminders at least 12h apart,
   * anything at least 3h apart, and no reminders mid-chat.
   * Milestones (celebrations) only respect the daily total.
   */
  private async applyCaps(
    candidates: Candidate[],
    state: BossState,
    now: Date,
    bossId: string,
    timezone: string,
    intensity: CoachIntensity,
  ): Promise<Candidate | { blocked: string }> {
    const r = this.deps.config.retention;
    // 2h tolerance keeps a weekly rhythm from drifting an hour later every week.
    const week = await this.deps.store.nudgesSince(bossId, new Date(now.getTime() - 7 * DAY + 2 * HOUR));
    const recent = week.filter((n) => now.getTime() - new Date(n.sentAt).getTime() <= 36 * HOUR);
    const weeklyReminders = week.filter((n) => n.category !== "milestone" && !REQUESTED_TRIGGERS.has(n.trigger)).length;
    const today = localTime(now, timezone).date;
    const sentToday = recent.filter((n) => localTime(new Date(n.sentAt), timezone).date === today);
    if (sentToday.length >= r.maxNudgesPerDay) return { blocked: "daily_cap" };

    const since = (iso: string | undefined) => (iso ? now.getTime() - new Date(iso).getTime() : Infinity);
    const tooSoon = since(recent.at(-1)?.sentAt) < MIN_GAP_BETWEEN_NUDGES_MS;
    const reminderTooSoon = since(recent.filter((n) => n.category !== "milestone").at(-1)?.sentAt) < MIN_GAP_BETWEEN_REMINDERS_MS;
    const remindersToday = sentToday.filter((n) => n.category !== "milestone").length;
    const chatting = since(state.lastInboundAt ?? undefined) < ACTIVE_CONVERSATION_MS;

    let reason = "reminder_cap";
    for (const c of candidates) {
      if (c.trigger.category === "milestone") return c; // celebrations are time-sensitive: only the daily cap applies
      if (tooSoon) {
        reason = "min_gap";
        continue;
      }
      if (chatting) {
        reason = "conversation_active";
        continue;
      }
      if (PLAN_TRIGGERS.has(c.trigger.id)) return c;
      // Reminders and summaries share one daily slot so the Boss never gets both on the same day.
      if (remindersToday >= r.maxRemindersPerDay || reminderTooSoon) continue;
      if (!REQUESTED_TRIGGERS.has(c.trigger.id) && weeklyReminders >= WEEKLY_REMINDER_CAP[intensity]) {
        reason = "weekly_cap";
        continue;
      }
      return c;
    }
    return { blocked: reason };
  }

  private async deliver(c: Candidate, ctx: ContentCtx, to: string, channel: Channel, now: Date): Promise<string | null> {
    const { store, messenger, config, logger } = this.deps;
    const { message, text } = renderNudge(c.template, ctx, channel, config.whatsapp.templateLanguage);
    const { messageId } = await messenger.send(to, message);
    await store.recordNudge({
      bossId: ctx.boss.id,
      trigger: c.trigger.id,
      category: c.trigger.category,
      channel,
      step: c.step,
      messageId,
      sentAt: now.toISOString(),
    });
    if (c.trigger.schedule.type === "series") await store.bumpSeries(ctx.boss.id, c.trigger.id, now);
    await store.logMessage(ctx.boss.id, "out", text, `nudge:${c.trigger.id}`, now);
    logger.info("retention: nudge sent", { bossId: ctx.boss.id, trigger: c.trigger.id, step: c.step, channel, template: c.template.name });
    return messageId;
  }
}
