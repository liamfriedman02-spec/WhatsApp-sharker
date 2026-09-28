import type { AgentStage } from "../platform/types.js";
import { joinList, networkName, plural } from "../util/format.js";
import type { ContentCtx } from "./context.js";
import { agentCta, type CtaId } from "./links.js";

export interface AgentMessage {
  header: string;
  body: string;
  cta: CtaId;
}

/**
 * The AI Marketing Agent message for the Boss's current stage.
 * Stage decides everything: the Boss is always pushed to the *next* step only.
 */
export function agentStatusMessage(ctx: ContentCtx): AgentMessage {
  const { boss } = ctx;
  switch (ctx.stage) {
    case "not_activated":
      return {
        header: "🤖 Let AI Grow Your Brand",
        body:
          "Your brand is live. Now put your marketing on autopilot.\n\n" +
          "Activate your AI Marketing Agent, connect your socials and let it automatically create and publish content for your brand.",
        cta: agentCta(ctx.stage),
      };
    case "needs_socials":
      return {
        header: "Your AI Agent Is Ready 🤖",
        body: "One last step.\n\nConnect your social account so your Agent can start promoting your brand automatically.",
        cta: agentCta(ctx.stage),
      };
    case "live": {
      const socials = joinList(boss.aiAgent.connectedSocials.map(networkName));
      const activity =
        boss.aiAgent.postsPublished7d > 0
          ? `\n\n📣 This week it published ${plural(boss.aiAgent.postsPublished7d, "post", "posts")} for *${boss.brandName}* on ${socials}.`
          : `\n\n🔗 Connected: ${socials}.`;
      return {
        header: "🚀 Your AI Agent Is Live",
        body:
          "Your Agent is now working for your brand and automatically publishing content to help you grow." + activity,
        cta: agentCta(ctx.stage),
      };
    }
  }
}

/** ✅/⬜ checklist of the 3 autopilot steps, personalized to the Boss's progress. */
export function agentChecklist(stage: AgentStage): string {
  const done = (ok: boolean) => (ok ? "✅" : "⬜");
  return [
    `${done(stage !== "not_activated")} 1. Activate your AI Agent`,
    `${done(stage === "live")} 2. Connect your socials`,
    `${done(stage === "live")} 3. Your Agent creates & publishes for you`,
  ].join("\n");
}
