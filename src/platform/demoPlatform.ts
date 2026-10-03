/**
 * Demo mode (no SHARKER_API_BASE_URL): anyone who writes to the bot becomes a demo Boss,
 * and can switch between four realistic profiles with the "demo" command — so the whole
 * coach can be tested from a real phone before the Sharker API exists.
 */
import type { StatSnapshot } from "../coach/types.js";
import { InMemoryPlatform, demoBosses, demoHistory } from "./mockPlatform.js";
import type { BossProfile, SharkerPlatform } from "./types.js";

export interface DemoPersona {
  id: "ana" | "bruno" | "carla" | "diego";
  /** List row title (≤ 24 chars). */
  title: string;
  /** List row description (≤ 72 chars). */
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { id: "ana", title: "🌱 Ana · new Boss", description: "Just launched · no players yet · AI Agent off" },
  { id: "bruno", title: "🤖 Bruno · Agent ready", description: "First players · Agent on, socials not connected" },
  { id: "carla", title: "💎 Carla · growing", description: "248 players · Agent live · earning every day" },
  { id: "diego", title: "📉 Diego · slowing", description: "Away 12 days · new players dropping" },
];

export function personaId(value: string): DemoPersona["id"] | null {
  const id = value.replace(/^boss_/, "");
  return DEMO_PERSONAS.some((p) => p.id === id) ? (id as DemoPersona["id"]) : null;
}

export interface DemoPlatformOptions {
  defaultPersona: DemoPersona["id"];
  /** Numbers pre-assigned to a profile (e.g. DEMO_BOSS_PHONE). */
  preassigned?: Record<string, DemoPersona["id"]>;
  /** Called when a demo Boss is created, with the profile's stat history (for week-over-week insights). */
  onCreate?: (boss: BossProfile, history: StatSnapshot[]) => Promise<void> | void;
  now?: () => number;
}

export class DemoPlatform implements SharkerPlatform {
  private readonly inner = new InMemoryPlatform();

  constructor(private readonly opts: DemoPlatformOptions) {}

  async getBossByPhone(phone: string): Promise<BossProfile | null> {
    return (await this.inner.getBossByPhone(phone)) ?? this.assign(phone, this.opts.preassigned?.[phone] ?? this.opts.defaultPersona);
  }

  getBoss(bossId: string): Promise<BossProfile | null> {
    return this.inner.getBoss(bossId);
  }

  /** Only real testers — never the profile templates (their numbers are fake). */
  listBosses(): AsyncIterable<BossProfile> {
    return this.inner.listBosses();
  }

  update(bossId: string, patch: Parameters<InMemoryPlatform["update"]>[1]): BossProfile {
    return this.inner.update(bossId, patch);
  }

  /**
   * Makes `phone` the given profile. The Boss id is stable per (phone, profile), so coach
   * progress (missions, points, goals) is kept when switching back to a profile.
   */
  async assign(phone: string, persona: DemoPersona["id"]): Promise<BossProfile> {
    const now = this.opts.now?.() ?? Date.now();
    const template = demoBosses(now).find((b) => b.id === `boss_${persona}`)!;
    const boss: BossProfile = { ...template, id: `demo_${phone}_${persona}`, phone };
    const current = await this.inner.getBossByPhone(phone);
    if (current) this.inner.remove(current.id);
    this.inner.upsert(boss);
    await this.opts.onCreate?.(boss, demoHistory(now)[template.id] ?? []);
    return boss;
  }

  personaOf(boss: BossProfile): DemoPersona | undefined {
    return DEMO_PERSONAS.find((p) => boss.id.endsWith(`_${p.id}`));
  }
}
