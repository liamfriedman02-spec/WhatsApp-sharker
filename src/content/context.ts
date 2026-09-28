import { agentStage, type AgentStage, type BossProfile } from "../platform/types.js";

/** Everything content needs to personalize a message. */
export interface ContentCtx {
  boss: BossProfile;
  stage: AgentStage;
  now: Date;
  hubUrl: string;
  timezone: string;
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
