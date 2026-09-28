import type { ContentCtx } from "./context.js";
import type { GuideId } from "./guides.js";
import type { CtaId } from "./links.js";

export interface NextAction {
  id: string;
  /** Imperative, lower-case, single line (safe to use as a template variable). */
  text: string;
  cta: CtaId;
  guide?: GuideId;
}

/**
 * The single most valuable thing this Boss can do right now, following the journey:
 * Launch Brand → Activate AI Agent → Connect socials → Bring players → Earn (payouts) → Grow.
 */
export function nextBestAction(ctx: ContentCtx): NextAction {
  const b = ctx.boss;
  if (!b.brandLaunchedAt) return { id: "launch", text: "finish launching your brand", cta: "brand_settings" };
  if (ctx.stage === "not_activated") {
    return { id: "activate_agent", text: "activate your AI Marketing Agent", cta: "agent_activate", guide: "activate_agent" };
  }
  if (ctx.stage === "needs_socials") {
    return { id: "connect_socials", text: "connect your socials to your AI Agent", cta: "agent_socials", guide: "connect_socials" };
  }
  if (b.stats.totalPlayers === 0) {
    return { id: "first_player", text: "share your brand link to bring your first player", cta: "brand_link", guide: "share_link" };
  }
  if (b.stats.earningsTotal > 0 && !b.payouts.methodConfigured) {
    return { id: "setup_payouts", text: "add your payout method so your earnings can reach you", cta: "payouts", guide: "setup_payouts" };
  }
  if (b.stats.newPlayers7d === 0) {
    return { id: "grow_players", text: "share your brand link to bring new players this week", cta: "brand_link", guide: "share_link" };
  }
  return { id: "keep_growing", text: "keep sharing your brand link while your AI Agent posts for you", cta: "dashboard" };
}
