import type { StatSnapshot } from "../coach/types.js";
import type { BossProfile, SharkerPlatform } from "./types.js";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * In-memory platform used for local development, the simulator and tests.
 * Selected automatically when SHARKER_API_BASE_URL is not set.
 */
export class InMemoryPlatform implements SharkerPlatform {
  private readonly bosses = new Map<string, BossProfile>();

  constructor(seed: BossProfile[] = []) {
    for (const b of seed) this.bosses.set(b.id, structuredClone(b));
  }

  async getBossByPhone(phone: string): Promise<BossProfile | null> {
    for (const b of this.bosses.values()) if (b.phone === phone) return structuredClone(b);
    return null;
  }

  async getBoss(bossId: string): Promise<BossProfile | null> {
    const b = this.bosses.get(bossId);
    return b ? structuredClone(b) : null;
  }

  async *listBosses(): AsyncIterable<BossProfile> {
    for (const b of this.bosses.values()) yield structuredClone(b);
  }

  all(): BossProfile[] {
    return [...this.bosses.values()].map((b) => structuredClone(b));
  }

  upsert(boss: BossProfile): void {
    this.bosses.set(boss.id, structuredClone(boss));
  }

  remove(bossId: string): void {
    this.bosses.delete(bossId);
  }

  update(bossId: string, patch: DeepPartial<BossProfile>): BossProfile {
    const current = this.bosses.get(bossId);
    if (!current) throw new Error(`Unknown boss ${bossId}`);
    const next = merge(current, patch);
    this.bosses.set(bossId, next);
    return structuredClone(next);
  }
}

function merge<T>(base: T, patch: DeepPartial<T>): T {
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object") {
      out[k] = merge(out[k], v as DeepPartial<unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

const DAY = 86_400_000;

/** Builds a Boss with sensible defaults; override anything you need. */
export function makeBoss(overrides: DeepPartial<BossProfile> & { id: string; phone: string }, now = Date.now()): BossProfile {
  const base: BossProfile = {
    id: overrides.id,
    phone: overrides.phone,
    firstName: "Boss",
    brandName: "My Brand",
    timezone: "UTC",
    whatsappOptIn: true,
    brandLaunchedAt: new Date(now - 30 * DAY).toISOString(),
    lastActiveAt: new Date(now - 1 * DAY).toISOString(),
    stats: {
      totalPlayers: 0,
      newPlayersToday: 0,
      newPlayers7d: 0,
      activePlayers7d: 0,
      earningsTotal: 0,
      earningsToday: 0,
      earnings7d: 0,
      currency: "USD",
      gcoinBalance: 0,
    },
    aiAgent: {
      activated: false,
      activatedAt: null,
      connectedSocials: [],
      postsPublishedTotal: 0,
      postsPublished7d: 0,
      lastPostAt: null,
      lastPostNetwork: null,
    },
    payouts: { methodConfigured: false },
  };
  return merge(base, overrides);
}

/** Demo Bosses covering each stage of the Boss journey. */
export function demoBosses(now = Date.now()): BossProfile[] {
  const ago = (days: number) => new Date(now - days * DAY).toISOString();
  return [
    makeBoss(
      {
        id: "boss_ana",
        phone: "15550000001",
        firstName: "Ana",
        brandName: "Ana Arena",
        brandLaunchedAt: ago(3),
        lastActiveAt: ago(1),
      },
      now,
    ),
    makeBoss(
      {
        id: "boss_bruno",
        phone: "15550000002",
        firstName: "Bruno",
        brandName: "Bruno Club",
        brandLaunchedAt: ago(10),
        lastActiveAt: ago(0.5),
        stats: { totalPlayers: 2, newPlayersToday: 1, newPlayers7d: 2, activePlayers7d: 2, earningsTotal: 18.5, earningsToday: 6, earnings7d: 18.5, gcoinBalance: 1200 },
        aiAgent: { activated: true, activatedAt: ago(2) },
      },
      now,
    ),
    makeBoss(
      {
        id: "boss_carla",
        phone: "15550000003",
        firstName: "Carla",
        brandName: "Carla Kingdom",
        timezone: "America/Sao_Paulo",
        brandLaunchedAt: ago(60),
        lastActiveAt: ago(0.2),
        stats: { totalPlayers: 248, newPlayersToday: 4, newPlayers7d: 31, activePlayers7d: 120, earningsTotal: 4820.75, earningsToday: 96.4, earnings7d: 612.3, gcoinBalance: 58400 },
        aiAgent: {
          activated: true,
          activatedAt: ago(40),
          connectedSocials: ["instagram", "tiktok"],
          postsPublishedTotal: 86,
          postsPublished7d: 14,
          lastPostAt: ago(0.3),
          lastPostNetwork: "instagram",
        },
        payouts: { methodConfigured: true },
      },
      now,
    ),
    makeBoss(
      {
        id: "boss_diego",
        phone: "15550000004",
        firstName: "Diego",
        brandName: "Diego Den",
        brandLaunchedAt: ago(45),
        lastActiveAt: ago(12),
        stats: { totalPlayers: 41, newPlayersToday: 0, newPlayers7d: 3, activePlayers7d: 9, earningsTotal: 530, earningsToday: 0, earnings7d: 22.1, gcoinBalance: 4300 },
        payouts: { methodConfigured: true },
      },
      now,
    ),
  ];
}

/**
 * Eight days of daily stat snapshots for the demo Bosses, so the coach can show
 * week-over-week trends in the simulator: Carla is growing, Diego is slowing down.
 */
export function demoHistory(now = Date.now()): Record<string, StatSnapshot[]> {
  const date = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString().slice(0, 10);
  const series = (days: number, f: (d: number) => Omit<StatSnapshot, "date">) =>
    Array.from({ length: days }, (_, i) => ({ date: date(days - i), ...f(days - i) }));
  return {
    boss_carla: series(8, (d) => ({
      totalPlayers: 248 - d * 4,
      newPlayersToday: 3,
      newPlayers7d: 25,
      activePlayers7d: 110,
      earningsTotal: 4820.75 - d * 85,
      earnings7d: 540,
    })),
    boss_diego: series(8, (d) => ({
      totalPlayers: 41 - Math.min(d, 3),
      newPlayersToday: 2,
      newPlayers7d: 11,
      activePlayers7d: 16,
      earningsTotal: 530 - d * 6,
      earnings7d: 61,
    })),
  };
}
