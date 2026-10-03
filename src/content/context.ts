import type { CoachView } from "../coach/service.js";
import { agentStage, type AgentStage, type BossProfile } from "../platform/types.js";

/** Everything content needs to personalize a message. */
export interface ContentCtx {
  boss: BossProfile;
  stage: AgentStage;
  now: Date;
  hubUrl: string;
  timezone: string;
  /** The coach's view (insights, goal, level, mission) when it has been loaded. */
  coach?: CoachView;
  /** Demo mode (no Sharker API): screens show how to switch demo profiles. */
  demo?: boolean;
}

export function contentCtx(boss: BossProfile, opts: { now?: Date; hubUrl: string; defaultTimezone: string }): ContentCtx {
  return {
    boss,
    stage: agentStage(boss),
    now: opts.now ?? new Date(),
    hubUrl: opts.hubUrl,
    timezone: boss.timezone || opts.defaultTimezone,
  };
}
