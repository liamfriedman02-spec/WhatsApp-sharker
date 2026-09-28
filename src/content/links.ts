import type { AgentStage } from "../platform/types.js";
import type { CtaLink } from "../whatsapp/types.js";

/**
 * Every Boss Hub deep link the bot can send. Messages (and the AI assistant) reference
 * CTAs by id only, so a URL can never be invented and paths live in one place.
 *
 * NOTE: paths are placeholders — align them with the real Boss Hub routes before launch.
 */
export const CTAS = {
  hub_home: { label: "Open My Boss Hub", path: "" },
  dashboard: { label: "Open My Dashboard", path: "dashboard" },
  earnings: { label: "See My Earnings", path: "earnings" },
  payouts: { label: "Set Up My Payouts", path: "earnings/payouts" },
  brand_link: { label: "Get My Brand Link", path: "brand/share" },
  brand_settings: { label: "My Brand Settings", path: "brand" },
  players: { label: "See My Players", path: "players" },
  gcoin: { label: "Open My GCOIN", path: "wallet" },
  marketing: { label: "My Marketing Tools", path: "marketing" },
  agent_activate: { label: "Activate My AI Agent", path: "ai-agent/activate" },
  agent_socials: { label: "Connect My Socials", path: "ai-agent/socials" },
  agent_view: { label: "View My AI Agent", path: "ai-agent" },
  help_center: { label: "Help Center", path: "support" },
} as const satisfies Record<string, { label: string; path: string }>;

export type CtaId = keyof typeof CTAS;
export const CTA_IDS = Object.keys(CTAS) as CtaId[];

/** Path + tracking query appended to BOSS_HUB_URL (also used as the dynamic suffix of template URL buttons). */
export function ctaSuffix(id: CtaId, campaign: string): string {
  const query = new URLSearchParams({ utm_source: "whatsapp", utm_medium: "boss_bot", utm_campaign: campaign });
  return `${CTAS[id].path}?${query.toString()}`;
}

export function ctaLink(id: CtaId, hubUrl: string, campaign = "assistant"): CtaLink {
  return { label: CTAS[id].label, url: `${hubUrl}/${ctaSuffix(id, campaign)}` };
}

/** The single next step in the AI Agent funnel for this stage. */
export function agentCta(stage: AgentStage): CtaId {
  switch (stage) {
    case "not_activated":
      return "agent_activate";
    case "needs_socials":
      return "agent_socials";
    case "live":
      return "agent_view";
  }
}
