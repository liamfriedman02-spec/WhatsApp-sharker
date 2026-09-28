import type { BossProfile, SharkerPlatform } from "./types.js";

export interface SharkerApiOptions {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Profiles are cached briefly so a burst of messages doesn't hammer the API. */
  cacheTtlMs?: number;
}

/** HTTP client for the Sharker platform API (contract: docs/platform-api.md). */
export class SharkerApiPlatform implements SharkerPlatform {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<string, { at: number; boss: BossProfile | null }>();

  constructor(private readonly opts: SharkerApiOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async getBossByPhone(phone: string): Promise<BossProfile | null> {
    return this.cached(`phone:${phone}`, () =>
      this.get<BossProfile>(`/bosses/by-phone/${encodeURIComponent(phone)}`),
    );
  }

  async getBoss(bossId: string): Promise<BossProfile | null> {
    return this.cached(`id:${bossId}`, () => this.get<BossProfile>(`/bosses/${encodeURIComponent(bossId)}`));
  }

  async *listBosses(): AsyncIterable<BossProfile> {
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const page = await this.get<{ data: BossProfile[]; nextCursor: string | null }>(`/bosses${query}`);
      if (!page) return;
      for (const boss of page.data) yield boss;
      cursor = page.nextCursor;
    } while (cursor);
  }

  /** Drop cached profiles for a Boss (called when a platform event says their data changed). */
  invalidate(boss: { id: string; phone?: string }): void {
    this.cache.delete(`id:${boss.id}`);
    if (boss.phone) this.cache.delete(`phone:${boss.phone}`);
  }

  private async cached(key: string, load: () => Promise<BossProfile | null>): Promise<BossProfile | null> {
    const ttl = this.opts.cacheTtlMs ?? 30_000;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.boss;
    const boss = await load();
    this.cache.set(key, { at: Date.now(), boss });
    return boss;
  }

  private async get<T>(path: string): Promise<T | null> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: {
        accept: "application/json",
        ...(this.opts.apiKey ? { authorization: `Bearer ${this.opts.apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 10_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Sharker API GET ${path} failed: ${res.status} ${await res.text().catch(() => "")}`);
    }
    return (await res.json()) as T;
  }
}
