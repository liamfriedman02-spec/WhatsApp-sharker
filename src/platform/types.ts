/**
 * The Boss data the bot needs from the Sharker platform.
 * See docs/platform-api.md for the HTTP contract the platform is expected to serve.
 */
export interface BossProfile {
  id: string;
  /** WhatsApp id: E.164 digits without "+", e.g. "5511999998888". */
  phone: string;
  firstName: string;
  brandName: string;
  /** Public link players use to join the brand (used in ready-to-post content). */
  brandUrl?: string | null;
  /** IANA timezone, e.g. "America/Sao_Paulo". Falls back to DEFAULT_TIMEZONE. */
  timezone?: string;
  /** Boss agreed to receive proactive WhatsApp messages (required by WhatsApp policy). */
  whatsappOptIn: boolean;
  /** ISO timestamp the brand went live, or null if not launched yet. */
  brandLaunchedAt: string | null;
  /** ISO timestamp of the Boss's last Boss Hub session. */
  lastActiveAt: string | null;
  stats: BossStats;
  aiAgent: AiAgentState;
  payouts: { methodConfigured: boolean };
}

export interface BossStats {
  totalPlayers: number;
  newPlayersToday: number;
  newPlayers7d: number;
  activePlayers7d: number;
  earningsTotal: number;
  earningsToday: number;
  earnings7d: number;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  gcoinBalance: number;
}

export interface AiAgentState {
  activated: boolean;
  activatedAt: string | null;
  /** Social networks connected to the Agent, e.g. ["instagram", "tiktok"]. */
  connectedSocials: string[];
  postsPublishedTotal: number;
  postsPublished7d: number;
  lastPostAt: string | null;
  lastPostNetwork: string | null;
}

/**
 * Where the Boss is in the AI Marketing Agent funnel.
 * Every agent-related message and CTA is chosen from this stage, so the bot always
 * pushes the *next* step and never repeats a step the Boss already completed.
 */
export type AgentStage = "not_activated" | "needs_socials" | "live";

export function agentStage(boss: BossProfile): AgentStage {
  if (!boss.aiAgent.activated) return "not_activated";
  if (boss.aiAgent.connectedSocials.length === 0) return "needs_socials";
  return "live";
}

/** Real-time events the Sharker platform pushes to POST /webhooks/sharker. */
export type PlatformEventType =
  | "brand.launched"
  | "player.joined"
  | "earnings.generated"
  | "ai_agent.activated"
  | "ai_agent.social_connected"
  | "ai_agent.social_disconnected"
  | "ai_agent.post_published"
  | "boss.updated";

export interface PlatformEvent {
  id: string;
  type: PlatformEventType;
  bossId: string;
  occurredAt: string;
  data?: Record<string, unknown>;
}

export interface SharkerPlatform {
  getBossByPhone(phone: string): Promise<BossProfile | null>;
  getBoss(bossId: string): Promise<BossProfile | null>;
  /** Iterates every Boss eligible for proactive messaging (paginated under the hood). */
  listBosses(): AsyncIterable<BossProfile>;
  /** Drops any cached copy of this Boss so the next read is fresh. */
  invalidate?(boss: { id: string; phone?: string }): void;
}
