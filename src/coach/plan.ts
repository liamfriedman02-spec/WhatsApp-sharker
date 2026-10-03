/**
 * Pure helpers used by proactive coaching messages: what the coach *would* assign, open or
 * propose right now. Deterministic, so the message and the follow-up write agree.
 */
import type { ContentCtx } from "../content/context.js";
import { MISSIONS, getMission, pickMission, type MissionDef } from "../content/missions.js";
import { getPlaybook, type Playbook, type PlaybookStep } from "../content/playbooks.js";
import { proposeGoal } from "./goals.js";
import type { CoachView } from "./service.js";
import type { GoalProposal } from "./types.js";

function coachOf(ctx: ContentCtx): CoachView {
  if (!ctx.coach) throw new Error("coach view not loaded for this message");
  return ctx.coach;
}

export interface PlannedStep {
  playbook: Playbook;
  index: number;
  step: PlaybookStep;
  /** True when this step hasn't been opened yet (a new day of the plan). */
  opensNew: boolean;
}

/**
 * The playbook step for today: the step opened today, or the next one when a new local day
 * has started. "finished" once the day after the last step arrives; null without an active plan.
 */
export function plannedStep(ctx: ContentCtx): PlannedStep | "finished" | null {
  const coach = coachOf(ctx);
  const pb = coach.state.playbook;
  if (!pb || pb.status !== "active") return null;
  const playbook = getPlaybook(pb.id);
  if (!playbook) return null;
  if (pb.stepDate >= coach.today) return { playbook, index: pb.step, step: playbook.steps[pb.step]!, opensNew: false };
  const next = pb.step + 1;
  if (next >= playbook.steps.length) return "finished";
  return { playbook, index: next, step: playbook.steps[next]!, opensNew: true };
}

/** The mission a playbook step assigns for this Boss today. */
export function stepMission(ctx: ContentCtx, planned: PlannedStep): MissionDef {
  return getMission(planned.step.mission(ctx, coachOf(ctx).state)) ?? MISSIONS[0]!;
}

/** Today's open mission, or the one the coach would assign now (the plan's step first, then the picker). */
export function plannedMission(ctx: ContentCtx): MissionDef {
  const coach = coachOf(ctx);
  if (coach.todayMission?.record.status === "open") return coach.todayMission.def;
  const planned = plannedStep(ctx);
  if (planned && planned !== "finished") return stepMission(ctx, planned);
  const goalMetric = coach.state.goal?.status === "active" ? coach.state.goal.metric : null;
  const givenToday = coach.history.filter((r) => r.date === coach.today).map((r) => r.missionId);
  return pickMission({ ctx, insights: coach.insights, goalMetric, history: coach.history }, givenToday) ?? MISSIONS[0]!;
}

/** The pending proposal, or a fresh one from the Boss's pace. */
export function plannedProposal(ctx: ContentCtx): GoalProposal {
  const coach = coachOf(ctx);
  return coach.state.pendingGoal ?? proposeGoal(ctx.boss, coach.insights, ctx.now, coach.state.goal);
}

export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
