import type { ContentCtx } from "../content/context.js";
import { levelView, type LevelView } from "../content/levels.js";
import { getMission, pickMission, type MissionDef } from "../content/missions.js";
import { getPlaybook, type Playbook, type PlaybookStep } from "../content/playbooks.js";
import type { Logger } from "../logger.js";
import type { BossProfile, SharkerPlatform } from "../platform/types.js";
import type { Store } from "../store/store.js";
import { DAY, HOUR, localTime } from "../util/time.js";
import { adjustProposal, goalView, proposeGoal, startGoal, type GoalView } from "./goals.js";
import { addDays, computeInsights, type Insights } from "./insights.js";
import { PAUSE_AFTER_MISSED, plannedStep, stepMission } from "./plan.js";
import type { BossPrefs, CoachIntensity, CoachState, FollowUp, Goal, GoalMetric, GoalProposal, MissionRecord, StatSnapshot } from "./types.js";

export interface ActiveMission {
  record: MissionRecord;
  def: MissionDef;
}

/** A playbook step that is now open, with its mission assigned for today. */
export interface OpenedStep {
  playbook: Playbook;
  index: number;
  step: PlaybookStep;
  mission: ActiveMission;
  /** True when this call opened the step (a new day of the plan). */
  opened: boolean;
  /** Mornings in a row this step has waited undone (0 = fresh). */
  missed: number;
}

/** The coach's full picture of one Boss at one moment. */
export interface CoachView {
  state: CoachState;
  insights: Insights;
  level: LevelView;
  goal: GoalView | null;
  /** Boss's local date (YYYY-MM-DD). */
  today: string;
  todayMission: ActiveMission | null;
  /** Missions from the last 60 days, oldest first. */
  history: MissionRecord[];
}

export type MissionResult =
  | { status: "done"; points: number; streak: number; totalPoints: number }
  | { status: "not_verified" };

const MAX_NOTES = 20;
const MAX_PENDING_FOLLOWUPS = 3;

export class CoachService {
  constructor(private readonly deps: { store: Store; platform: SharkerPlatform; logger: Logger }) {}

  /**
   * Builds the coach view. Unless `readOnly`, it also records today's stats snapshot,
   * expires finished goals and initializes the Boss's level (without celebrating it).
   */
  async view(ctx: ContentCtx, opts: { readOnly?: boolean } = {}): Promise<CoachView> {
    const { store } = this.deps;
    const boss = ctx.boss;
    const today = localTime(ctx.now, ctx.timezone).date;
    const [state, snapshots, history] = await Promise.all([
      store.getCoachState(boss.id),
      store.snapshotsSince(boss.id, addDays(today, -14)),
      store.missionsSince(boss.id, addDays(today, -60)),
    ]);
    const insights = computeInsights(ctx, snapshots, today);
    const level = levelView(boss);

    let dirty = false;
    if (state.goal?.status === "active" && goalView(state.goal, boss, ctx.now).status === "expired") {
      state.goal = { ...state.goal, status: "expired" };
      dirty = true;
    }
    if (state.level === undefined) {
      state.level = level.current?.level ?? 0;
      dirty = true;
    }
    if (!opts.readOnly) {
      await store.saveSnapshot(boss.id, snapshotOf(boss, today));
      if (dirty) await store.saveCoachState(boss.id, state);
    }

    const rec = history.filter((r) => r.date === today).at(-1);
    const def = rec ? getMission(rec.missionId) : undefined;
    return {
      state,
      insights,
      level,
      goal: state.goal ? goalView(state.goal, boss, ctx.now) : null,
      today,
      todayMission: rec && def ? { record: rec, def } : null,
      history,
    };
  }

  async save(bossId: string, state: CoachState): Promise<void> {
    await this.deps.store.saveCoachState(bossId, state);
  }

  // ── Missions ──────────────────────────────────────────────────────────────

  /** The mission the picker would give today (no side effects). */
  suggestMission(ctx: ContentCtx, view: CoachView, exclude: string[] = []): MissionDef {
    const goalMetric = view.state.goal?.status === "active" ? view.state.goal.metric : null;
    return pickMission({ ctx, insights: view.insights, goalMetric, history: view.history }, exclude);
  }

  async assignMission(ctx: ContentCtx, view: CoachView, exclude: string[] = []): Promise<ActiveMission> {
    return this.assign(ctx, view, this.suggestMission(ctx, view, exclude));
  }

  /** Makes `def` today's mission. */
  async assign(ctx: ContentCtx, view: CoachView, def: MissionDef): Promise<ActiveMission> {
    const record = await this.deps.store.assignMission(ctx.boss.id, def.id, view.today, ctx.now);
    view.history.push(record);
    view.todayMission = { record, def };
    return view.todayMission;
  }

  /** Today's mission (whatever its status), or a freshly assigned one: the plan's step when a plan is active. */
  async ensureTodayMission(ctx: ContentCtx, view: CoachView): Promise<ActiveMission> {
    if (view.todayMission) return view.todayMission;
    if (view.state.playbook?.status === "active") {
      const opened = await this.openStep(ctx, view, { byBoss: true });
      if (opened && "mission" in opened) return opened.mission;
    }
    return this.assignMission(ctx, view);
  }

  /** Another mission for today, excluding everything already given today. */
  async bonusMission(ctx: ContentCtx, view: CoachView): Promise<ActiveMission> {
    const givenToday = view.history.filter((r) => r.date === view.today).map((r) => r.missionId);
    return this.assignMission(ctx, view, givenToday);
  }

  async completeMission(ctx: ContentCtx, view: CoachView, mission: ActiveMission): Promise<MissionResult> {
    const { store, platform } = this.deps;
    if (mission.def.verify) {
      platform.invalidate?.({ id: ctx.boss.id, phone: ctx.boss.phone });
      const fresh = (await platform.getBoss(ctx.boss.id)) ?? ctx.boss;
      if (!mission.def.verify(fresh, ctx.now)) return { status: "not_verified" };
    }
    if (mission.record.status !== "done") {
      await store.updateMission(mission.record.id, "done", ctx.now);
      mission.record.status = "done";
      mission.record.completedAt = ctx.now.toISOString();
      const s = view.state;
      const gapDays = s.lastMissionDoneAt ? (ctx.now.getTime() - new Date(s.lastMissionDoneAt).getTime()) / DAY : Infinity;
      s.streak = gapDays <= 3 ? s.streak + 1 : 1;
      s.points += mission.def.points;
      s.lastMissionDoneAt = ctx.now.toISOString();
      // Using a channel for the first time (status, groups…) marks it open for the Boss.
      if (mission.def.channel && !s.channels[mission.def.channel]) s.channels[mission.def.channel] = ctx.now.toISOString();
      await this.save(ctx.boss.id, s);
    }
    return { status: "done", points: mission.def.points, streak: view.state.streak, totalPoints: view.state.points };
  }

  // ── Playbooks (launch program, campaigns) ─────────────────────────────────

  /** Starts a plan today (replacing any active one) and opens its first step. */
  async startPlaybook(ctx: ContentCtx, view: CoachView, id: string): Promise<OpenedStep | null> {
    if (!getPlaybook(id)) return null;
    const s = view.state;
    if (s.playbook && s.playbook.id !== id && (s.playbook.status === "active" || s.playbook.status === "paused") && !s.playbooksDone.includes(s.playbook.id)) {
      s.playbooksDone.push(s.playbook.id);
    }
    s.playbook = { id, step: 0, stepDate: view.today, openedAt: ctx.now.toISOString(), missed: 0, startedAt: ctx.now.toISOString(), status: "active" };
    s.playbooksDone = s.playbooksDone.filter((x) => x !== id);
    await this.save(ctx.boss.id, s);
    this.deps.logger.info("coach: playbook started", { bossId: ctx.boss.id, playbook: id });
    const opened = await this.openStep(ctx, view, { byBoss: true });
    return opened && "mission" in opened ? opened : null;
  }

  /**
   * Today's step of the active plan, (re)opening it and assigning its mission when a new day
   * started. An undone step is reopened, never skipped: when the coach reopens it on its own
   * (`byBoss` false, the morning message) the missed counter grows, and at PAUSE_AFTER_MISSED
   * the plan pauses. When the Boss opens it, they're here: the counter resets.
   * `advance` moves on to the next step right away (the Boss chose to).
   */
  async openStep(
    ctx: ContentCtx,
    view: CoachView,
    opts: { advance?: boolean; byBoss?: boolean } = {},
  ): Promise<OpenedStep | { finished: Playbook } | { paused: Playbook } | null> {
    const withView: ContentCtx = { ...ctx, coach: view };
    let planned = plannedStep(withView);
    if (planned === null) return null;
    const playbook = planned === "finished" ? getPlaybook(view.state.playbook!.id)! : planned.playbook;
    if (planned !== "finished" && opts.advance) {
      const next = planned.index + 1;
      planned = next >= playbook.steps.length ? "finished" : { playbook, index: next, step: playbook.steps[next]!, opensNew: true, missed: 0 };
    }
    if (planned === "finished") {
      await this.finishPlaybook(ctx.boss.id, view, "done");
      return { finished: playbook };
    }
    const missed = opts.byBoss ? 0 : planned.missed;
    if (planned.opensNew || missed !== (view.state.playbook!.missed ?? 0)) {
      const paused = !opts.byBoss && missed >= PAUSE_AFTER_MISSED;
      view.state.playbook = {
        ...view.state.playbook!,
        step: planned.index,
        stepDate: view.today,
        openedAt: planned.opensNew ? ctx.now.toISOString() : view.state.playbook!.openedAt,
        missed,
        status: paused ? "paused" : "active",
      };
      await this.save(ctx.boss.id, view.state);
      if (paused) {
        this.deps.logger.warn("coach: plan paused, Boss went quiet", { bossId: ctx.boss.id, playbook: playbook.id, step: planned.index });
        return { paused: playbook };
      }
    }
    const def = stepMission(withView, planned);
    const current = view.todayMission;
    const mission = current && current.def.id === def.id ? current : await this.assign(ctx, view, def);
    return { playbook, index: planned.index, step: planned.step, mission, opened: planned.opensNew, missed };
  }

  /** The Boss is back after a pause: the plan continues where it stopped, from today. */
  async resumePlaybook(ctx: ContentCtx, view: CoachView): Promise<Playbook | null> {
    const pb = view.state.playbook;
    if (!pb || pb.status !== "paused") return null;
    view.state.playbook = { ...pb, status: "active", stepDate: view.today, openedAt: ctx.now.toISOString(), missed: 0 };
    await this.save(ctx.boss.id, view.state);
    this.deps.logger.info("coach: plan resumed", { bossId: ctx.boss.id, playbook: pb.id });
    return getPlaybook(pb.id) ?? null;
  }

  /** The Boss engaged with the plan (wrote, tapped): the rescue ladder starts over. */
  async engaged(bossId: string, view: CoachView): Promise<void> {
    const pb = view.state.playbook;
    if (!pb || pb.status !== "active" || !pb.missed) return;
    view.state.playbook = { ...pb, missed: 0 };
    await this.save(bossId, view.state);
  }

  async finishPlaybook(bossId: string, view: CoachView, status: "done" | "stopped"): Promise<void> {
    const pb = view.state.playbook;
    if (!pb) return;
    view.state.playbook = { ...pb, status };
    if (!view.state.playbooksDone.includes(pb.id)) view.state.playbooksDone.push(pb.id);
    await this.save(bossId, view.state);
    this.deps.logger.info("coach: playbook finished", { bossId, playbook: pb.id, status });
  }

  async setPrefs(bossId: string, view: CoachView, patch: Partial<BossPrefs>): Promise<void> {
    view.state.prefs = { ...view.state.prefs, ...patch };
    await this.save(bossId, view.state);
  }

  async addAudiences(bossId: string, view: CoachView, ids: string[]): Promise<void> {
    const merged = [...new Set([...view.state.audiences, ...ids.map((a) => a.trim()).filter(Boolean)])].slice(-10);
    if (merged.length === view.state.audiences.length) return;
    view.state.audiences = merged;
    await this.save(bossId, view.state);
  }

  async markChannel(bossId: string, view: CoachView, channelId: string, now: Date): Promise<void> {
    if (view.state.channels[channelId]) return;
    view.state.channels[channelId] = now.toISOString();
    await this.save(bossId, view.state);
  }

  async skipMission(bossId: string, view: CoachView, mission: ActiveMission): Promise<void> {
    await this.deps.store.updateMission(mission.record.id, "skipped", null);
    mission.record.status = "skipped";
    view.state.streak = 0;
    await this.save(bossId, view.state);
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  async proposeGoal(ctx: ContentCtx, view: CoachView): Promise<GoalProposal> {
    view.state.pendingGoal = proposeGoal(ctx.boss, view.insights, ctx.now, view.state.goal);
    await this.save(ctx.boss.id, view.state);
    return view.state.pendingGoal;
  }

  async adjustPendingGoal(ctx: ContentCtx, view: CoachView, factor: number): Promise<GoalProposal> {
    const current = view.state.pendingGoal ?? proposeGoal(ctx.boss, view.insights, ctx.now, view.state.goal);
    view.state.pendingGoal = adjustProposal(current, factor);
    await this.save(ctx.boss.id, view.state);
    return view.state.pendingGoal;
  }

  async acceptPendingGoal(ctx: ContentCtx, view: CoachView): Promise<Goal> {
    const p = view.state.pendingGoal ?? proposeGoal(ctx.boss, view.insights, ctx.now, view.state.goal);
    return this.setGoal(ctx, view, p.metric, p.target, p.days);
  }

  async setGoal(ctx: ContentCtx, view: CoachView, metric: GoalMetric, target: number, days: number): Promise<Goal> {
    const goal = startGoal(ctx.boss, metric, Math.max(1, target), Math.min(Math.max(Math.round(days), 3), 90), ctx.now);
    view.state.goal = goal;
    view.state.pendingGoal = null;
    view.goal = goalView(goal, ctx.boss, ctx.now);
    await this.save(ctx.boss.id, view.state);
    this.deps.logger.info("coach: goal set", { bossId: ctx.boss.id, metric, target: goal.target });
    return goal;
  }

  async markGoalAchieved(bossId: string, view: CoachView, now: Date): Promise<void> {
    if (!view.state.goal || view.state.goal.status !== "active") return;
    view.state.goal = { ...view.state.goal, status: "achieved", achievedAt: now.toISOString() };
    await this.save(bossId, view.state);
  }

  // ── Memory, follow-ups, preferences ───────────────────────────────────────

  async remember(bossId: string, view: CoachView, notes: string[], now: Date): Promise<void> {
    const clean = notes.map((n) => n.replace(/\s+/g, " ").trim().slice(0, 200)).filter(Boolean);
    const known = new Set(view.state.notes.map((n) => n.text.toLowerCase()));
    const fresh = clean.filter((n) => !known.has(n.toLowerCase()));
    if (fresh.length === 0) return;
    view.state.notes = [...view.state.notes, ...fresh.map((text) => ({ text, at: now.toISOString() }))].slice(-MAX_NOTES);
    await this.save(bossId, view.state);
  }

  async scheduleFollowUp(bossId: string, view: CoachView, inHours: number, reason: string, now: Date): Promise<FollowUp> {
    const followUp: FollowUp = {
      id: `fu_${now.getTime().toString(36)}`,
      dueAt: new Date(now.getTime() + Math.min(Math.max(inHours, 1), 168) * HOUR).toISOString(),
      reason: reason.replace(/\s+/g, " ").trim().slice(0, 140),
      status: "pending",
    };
    const pending = view.state.followUps.filter((f) => f.status === "pending");
    const done = view.state.followUps.filter((f) => f.status !== "pending").slice(-5);
    view.state.followUps = [...done, ...pending.slice(-(MAX_PENDING_FOLLOWUPS - 1)), followUp];
    await this.save(bossId, view.state);
    return followUp;
  }

  dueFollowUp(view: CoachView, now: Date): FollowUp | null {
    return view.state.followUps.find((f) => f.status === "pending" && new Date(f.dueAt).getTime() <= now.getTime()) ?? null;
  }

  async markFollowUp(bossId: string, view: CoachView, id: string, status: FollowUp["status"]): Promise<void> {
    view.state.followUps = view.state.followUps.map((f) => (f.id === id ? { ...f, status } : f));
    await this.save(bossId, view.state);
  }

  async setIntensity(bossId: string, view: CoachView, intensity: CoachIntensity): Promise<void> {
    view.state.intensity = intensity;
    await this.save(bossId, view.state);
  }

  async setLevel(bossId: string, view: CoachView, level: number): Promise<void> {
    view.state.level = level;
    await this.save(bossId, view.state);
  }
}

export function snapshotOf(boss: BossProfile, date: string): StatSnapshot {
  const s = boss.stats;
  return {
    date,
    totalPlayers: s.totalPlayers,
    newPlayersToday: s.newPlayersToday,
    newPlayers7d: s.newPlayers7d,
    activePlayers7d: s.activePlayers7d,
    earningsTotal: s.earningsTotal,
    earnings7d: s.earnings7d,
  };
}
