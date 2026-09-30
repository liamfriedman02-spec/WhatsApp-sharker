/**
 * Boss levels — a visible ladder that turns the journey into progress the Boss can feel.
 * Each level is reached when all its requirements (and those of lower levels) are met.
 *
 * ⚠️ Thresholds are a first proposal; tune them to real Sharker data.
 */
import { agentStage, type BossProfile } from "../platform/types.js";

export interface LevelRequirement {
  label: string;
  current: number;
  target: number;
}

export interface LevelDef {
  level: number;
  name: string;
  emoji: string;
  requirements: (boss: BossProfile) => LevelRequirement[];
}

const req = (label: string, current: number, target: number): LevelRequirement => ({ label, current: Math.min(current, target), target });

export const LEVELS: LevelDef[] = [
  {
    level: 1,
    name: "Starter",
    emoji: "🌱",
    requirements: (b) => [req("launch your brand", b.brandLaunchedAt ? 1 : 0, 1)],
  },
  {
    level: 2,
    name: "Rising",
    emoji: "🚀",
    requirements: (b) => [
      req("AI Agent live", agentStage(b) === "live" ? 1 : 0, 1),
      req("your first player", b.stats.totalPlayers, 1),
    ],
  },
  {
    level: 3,
    name: "Builder",
    emoji: "🏗️",
    requirements: (b) => [req("10 players", b.stats.totalPlayers, 10), req("your first earnings", b.stats.earningsTotal > 0 ? 1 : 0, 1)],
  },
  {
    level: 4,
    name: "Pro",
    emoji: "💎",
    requirements: (b) => [req("50 players", b.stats.totalPlayers, 50), req("20 active players this week", b.stats.activePlayers7d, 20)],
  },
  {
    level: 5,
    name: "Elite",
    emoji: "👑",
    requirements: (b) => [req("200 players", b.stats.totalPlayers, 200), req("75 active players this week", b.stats.activePlayers7d, 75)],
  },
];

export interface LevelView {
  current: LevelDef | null;
  next: LevelDef | null;
  nextRequirements: LevelRequirement[];
}

const met = (r: LevelRequirement) => r.current >= r.target;

export function levelView(boss: BossProfile): LevelView {
  let current: LevelDef | null = null;
  for (const l of LEVELS) {
    if (l.requirements(boss).every(met)) current = l;
    else break;
  }
  const next = LEVELS.find((l) => l.level === (current?.level ?? 0) + 1) ?? null;
  return { current, next, nextRequirements: next ? next.requirements(boss) : [] };
}

export function levelName(l: LevelDef | null): string {
  return l ? `${l.emoji} ${l.name}` : "🌱 Starter";
}

/** "10 players and your first earnings" — what's still missing for the next level (single line). */
export function nextLevelNeeds(view: LevelView): string {
  if (!view.next) return "keep your players active to stay at the top";
  const missing = view.nextRequirements.filter((r) => !met(r)).map((r) => (r.target > 1 ? `${r.label} (${r.current}/${r.target})` : r.label));
  if (missing.length === 0) return `${view.next.name} level`;
  return missing.length === 1 ? missing[0]! : `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`;
}
