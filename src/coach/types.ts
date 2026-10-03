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

/**
 * A multi-day plan the Boss is following (the 10-day launch program, or a campaign).
 * One step per local day; the step's mission is today's mission.
 */
export interface PlaybookState {
  id: string;
  /** 0-based index of the current step. */
  step: number;
  /** Local date (YYYY-MM-DD) the current step was (re)opened. */
  stepDate: string;
  /** ISO time the current step was (re)opened. */
  openedAt?: string;
  /** Mornings in a row the coach reopened this step because it wasn't done (the rescue ladder). */
  missed?: number;
  startedAt: string;
  /** paused = the Boss went quiet; the plan waits and resumes when they write. */
  status: "active" | "paused" | "done" | "stopped";
}

/** What the Boss told the coach when they started (the onboarding chat). */
export interface BossPrefs {
  /** Minutes a day the Boss can give their brand. */
  minutesPerDay: number | null;
  /** Local hour the Boss wants the day's step (9 morning, 13 afternoon, 18 evening). */
  preferredHour: number | null;
  /** Social pages the Boss already had for their brand when they started. */
  socials: string[];
  onboardedAt: string | null;
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
  playbook: PlaybookState | null;
  /** Playbooks already completed or stopped (not proposed again). */
  playbooksDone: string[];
  /** Who the Boss can invite (audience ids, or free text they typed). */
  audiences: string[];
  /** Marketing channels the Boss told us they opened: channel id → ISO date. */
  channels: Record<string, string>;
  prefs: BossPrefs;
}

export function defaultPrefs(): BossPrefs {
  return { minutesPerDay: null, preferredHour: null, socials: [], onboardedAt: null };
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
    playbook: null,
    playbooksDone: [],
    audiences: [],
    channels: {},
    prefs: defaultPrefs(),
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
