/**
 * Pure helpers used by proactive coaching messages: what the coach *would* assign or
 * propose right now. Deterministic, so the message and the follow-up write agree.
 */
import type { ContentCtx } from "../content/context.js";
import { MISSIONS, pickMission, type MissionDef } from "../content/missions.js";
import { proposeGoal } from "./goals.js";
import type { CoachView } from "./service.js";
import type { GoalProposal } from "./types.js";

function coachOf(ctx: ContentCtx): CoachView {
  if (!ctx.coach) throw new Error("coach view not loaded for this message");
  return ctx.coach;
}

/** Today's open mission, or the one the picker would assign now. */
export function plannedMission(ctx: ContentCtx): MissionDef {
  const coach = coachOf(ctx);
  if (coach.todayMission?.record.status === "open") return coach.todayMission.def;
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
