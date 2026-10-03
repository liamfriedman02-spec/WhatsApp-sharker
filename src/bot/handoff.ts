import type { Logger } from "../logger.js";
import type { BossProfile } from "../platform/types.js";
import type { Handoff, MessageRecord } from "../store/store.js";

export type SupportEvent =
  | { event: "handoff.opened"; handoff: Handoff; boss: BossSummary; message: string; transcript: MessageRecord[] }
  | { event: "handoff.message"; handoff: Handoff; boss: BossSummary; message: string }
  | { event: "handoff.closed"; handoff: Handoff; boss: BossSummary; reason: "resolved_by_agent" | "closed_by_boss" | "expired" }
  /** A Boss went quiet in the middle of their plan: a person reaching out now can keep them. */
  | { event: "boss.at_risk"; boss: BossSummary; reason: string };

export interface BossSummary {
  id: string;
  phone: string;
  firstName: string;
  brandName: string;
}

/** Where human-support requests go (helpdesk, CRM, Slack bridge…). */
export interface SupportDesk {
  notify(event: SupportEvent): Promise<void>;
}

export function bossSummary(b: BossProfile): BossSummary {
  return { id: b.id, phone: b.phone, firstName: b.firstName, brandName: b.brandName };
}

/** POSTs support events as JSON to SUPPORT_WEBHOOK_URL. Agents answer via the admin API. */
export class WebhookSupportDesk implements SupportDesk {
  constructor(
    private readonly url: string,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async notify(event: SupportEvent): Promise<void> {
    try {
      const res = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) this.logger.error("support desk webhook failed", { status: res.status, event: event.event });
    } catch (err) {
      this.logger.error("support desk webhook error", { err, event: event.event });
    }
  }
}

/** Logs support events — for development, or when the team works from the admin API only. */
export class LogSupportDesk implements SupportDesk {
  readonly events: SupportEvent[] = [];
  constructor(private readonly logger: Logger) {}
  async notify(event: SupportEvent): Promise<void> {
    this.events.push(event);
    this.logger.info("support desk event", { event: event.event, handoffId: "handoff" in event ? event.handoff.id : undefined, bossId: event.boss.id });
  }
}
