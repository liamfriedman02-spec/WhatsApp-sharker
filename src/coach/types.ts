/** How hard the coach pushes (chosen by the Boss in Notifications). */
export type CoachIntensity = "light" | "standard" | "intense";

export type GoalMetric = "players" | "earnings";

export interface Goal {
  metric: GoalMetric;
  /** Amount to gain during the goal (new players, or money earned). */
  target: number;
  /** Baseline (totalPlayers / earningsTotal) when the goal started. */
  startValue: number;
  startAt: string;
  deadline: string;
  status: "active" | "achieved" | "expired";
  achievedAt?: string;
}

export interface GoalProposal {
  metric: GoalMetric;
  target: number;
  days: number;
  proposedAt: string;
}

export interface FollowUp {
  id: string;
  dueAt: string;
  /** What the Boss committed to, e.g. "share your link in 3 groups". */
  reason: string;
  status: "pending" | "sent" | "cancelled";
}

export interface CoachNote {
  text: string;
  at: string;
}

/** Everything the coach remembers about one Boss. */
export interface CoachState {
  intensity: CoachIntensity;
  goal: Goal | null;
  pendingGoal: GoalProposal | null;
  /** Last level the Boss was congratulated for (undefined = not initialized yet). */
  level?: number;
  points: number;
  streak: number;
  lastMissionDoneAt: string | null;
  notes: CoachNote[];
  followUps: FollowUp[];
}

export function defaultCoachState(): CoachState {
  return {
    intensity: "standard",
    goal: null,
    pendingGoal: null,
    points: 0,
    streak: 0,
    lastMissionDoneAt: null,
    notes: [],
    followUps: [],
  };
}

export interface MissionRecord {
  id: number;
  bossId: string;
  missionId: string;
  /** Local date (YYYY-MM-DD) the mission was assigned for. */
  date: string;
  status: "open" | "done" | "skipped";
  assignedAt: string;
  completedAt: string | null;
}

/** Daily copy of the Boss's numbers, so the coach can compare weeks. */
export interface StatSnapshot {
  date: string;
  totalPlayers: number;
  newPlayersToday: number;
  newPlayers7d: number;
  activePlayers7d: number;
  earningsTotal: number;
  earnings7d: number;
}
