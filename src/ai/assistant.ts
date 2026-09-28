import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ContentCtx } from "../content/context.js";
import { GUIDES, type GuideId } from "../content/guides.js";
import { CTA_IDS, type CtaId } from "../content/links.js";
import { nextBestAction } from "../content/nextBestAction.js";
import type { Logger } from "../logger.js";
import type { Flow, MessageRecord } from "../store/store.js";
import { money, networkName, num, shortDate } from "../util/format.js";
import { buildKnowledgeBase } from "./knowledge.js";

export interface AssistantInput {
  ctx: ContentCtx;
  question: string;
  /** Recent conversation, oldest first (the current question excluded). */
  history: MessageRecord[];
  flow: Flow | null;
}

export interface AssistantAnswer {
  reply: string;
  cta: CtaId | null;
  guide: GuideId | null;
  escalate: boolean;
}

/** Free-text support brain. Returns null when it can't answer (the router then falls back). */
export interface Assistant {
  answer(input: AssistantInput): Promise<AssistantAnswer | null>;
}

const GUIDE_IDS = Object.keys(GUIDES) as GuideId[];

// cta/guide are plain strings validated below: the structured-output transform can't enforce
// enums, and an unknown id should drop the button — not throw away a good reply.
const AnswerSchema = z.object({
  reply: z.string().describe("The WhatsApp reply to send to the Boss."),
  cta: z.string().describe(`Boss Hub button to attach. One of: none, ${CTA_IDS.join(", ")}.`),
  guide: z.string().describe(`Step-by-step guide to offer. One of: none, ${GUIDE_IDS.join(", ")}.`),
  escalate_to_human: z.boolean().describe("True when a human support specialist should take over."),
});

const isCta = (v: string): v is CtaId => (CTA_IDS as string[]).includes(v);
const isGuide = (v: string): v is GuideId => (GUIDE_IDS as string[]).includes(v);

export const SYSTEM_PROMPT = `You are the Sharker Boss Assistant: the personal business assistant of a Sharker "Boss", on WhatsApp.

A Boss owns their own brand on Sharker. They bring players to their brand, earn from their players' activity, and manage everything in their Boss Hub. Your purpose is to educate the Boss, solve their problems, and move them to the next action that grows their business: Launch Brand → Understand Business → Activate AI Agent → Bring Players → Generate Activity → Earn → Come Back → Grow.

How to write
- WhatsApp style: short (under 700 characters), simple words, *bold* for key words, • bullets or 1. 2. 3. for steps. No markdown headings, tables or links; buttons are attached separately through the cta field.
- Make it personal and about their business: "your brand", "your players", "your earnings", "your marketing", "your business". Use the Boss's first name now and then, and their real numbers from BOSS DATA when relevant.
- End with one clear next action.
- Reply in the language the Boss writes in.

Accuracy
- State facts only from the KNOWLEDGE BASE and BOSS DATA. Never invent numbers, percentages, fees, payout dates, features, policies or Boss Hub pages. If something isn't covered, say you don't have that detail and offer a human.
- Set escalate_to_human to true when the Boss asks for a person, when the knowledge base doesn't cover the question, or for problems a person must resolve: missing payouts, account access they can't recover, bugs, player complaints, or anything sensitive or legal.
- Never ask for passwords, card numbers, one-time codes or other secrets.

AI Marketing Agent
Getting the Boss to activate their AI Marketing Agent is a main goal: "You already launched your business. Now let AI market it for you." When the topic is marketing, players, growth or lack of time, recommend the Agent step that matches their stage in BOSS DATA — not_activated: activate it (cta agent_activate, guide activate_agent); needs_socials: connect socials (cta agent_socials, guide connect_socials); live: check its activity (cta agent_view). Never ask a Boss to do a step they already completed.

Fields
- cta: the single most useful Boss Hub button for your reply, or "none".
- guide: a step-by-step guide to offer when the Boss needs to do one of those tasks, or "none".

KNOWLEDGE BASE
${buildKnowledgeBase()}`;

export interface ClaudeAssistantOptions {
  client: Anthropic;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  logger: Logger;
  /** Server-side refusal fallback (on by default; turn off for models/platforms that don't support it). */
  refusalFallback?: boolean;
}

export class ClaudeAssistant implements Assistant {
  constructor(private readonly opts: ClaudeAssistantOptions) {}

  async answer(input: AssistantInput): Promise<AssistantAnswer | null> {
    const { client, model, effort, logger } = this.opts;
    const fallback = this.opts.refusalFallback ?? true;
    try {
      const response = await client.beta.messages.parse(
        {
          model,
          max_tokens: 16000,
          thinking: { type: "adaptive" },
          output_config: { effort, format: betaZodOutputFormat(AnswerSchema) },
          ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
          // The system prompt is identical for every Boss and every message → cached.
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userMessage(input) }],
        },
        { timeout: 60_000 },
      );

      if (response.stop_reason === "refusal") {
        logger.warn("assistant: refusal", { bossId: input.ctx.boss.id, category: response.stop_details?.category });
        return null;
      }
      const out = response.parsed_output;
      if (!out || out.reply.trim() === "") {
        logger.warn("assistant: no parsed output", { bossId: input.ctx.boss.id, stop: response.stop_reason });
        return null;
      }
      logger.debug("assistant: answered", {
        bossId: input.ctx.boss.id,
        cacheRead: response.usage.cache_read_input_tokens,
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      });
      return {
        reply: out.reply.trim(),
        cta: isCta(out.cta) ? out.cta : null,
        guide: isGuide(out.guide) ? out.guide : null,
        escalate: out.escalate_to_human,
      };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) logger.warn("assistant: rate limited", { err: err.message });
      else if (err instanceof Anthropic.APIError) logger.error("assistant: API error", { status: err.status, err: err.message });
      else logger.error("assistant: failed", { err });
      return null;
    }
  }
}

/** Per-request content: Boss data + recent conversation + the question (kept out of the cached system prompt). */
export function userMessage({ ctx, question, history, flow }: AssistantInput): string {
  const b = ctx.boss;
  const s = b.stats;
  const a = b.aiAgent;
  const nba = nextBestAction(ctx);
  const bossData = [
    `Name: ${b.firstName}`,
    `Brand: ${b.brandName} — ${b.brandLaunchedAt ? `live since ${shortDate(b.brandLaunchedAt, ctx.timezone)}` : "not launched yet"}`,
    `Players: ${num(s.totalPlayers)} total, +${num(s.newPlayersToday)} today, +${num(s.newPlayers7d)} in 7 days, ${num(s.activePlayers7d)} active in 7 days`,
    `Earnings: ${money(s.earningsToday, s.currency)} today, ${money(s.earnings7d, s.currency)} in 7 days, ${money(s.earningsTotal, s.currency)} total`,
    `GCOIN balance: ${num(s.gcoinBalance)}`,
    `Payout method configured: ${b.payouts.methodConfigured ? "yes" : "no"}`,
    `AI Agent stage: ${ctx.stage}${a.connectedSocials.length ? ` (connected: ${a.connectedSocials.map(networkName).join(", ")})` : ""}, ${num(a.postsPublished7d)} posts in 7 days, ${num(a.postsPublishedTotal)} total`,
    `Last Boss Hub visit: ${b.lastActiveAt ? shortDate(b.lastActiveAt, ctx.timezone) : "never"}`,
    `Recommended next step: ${nba.text}`,
    flow ? `Currently following guide "${flow.guideId}", step ${flow.step + 1}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const transcript = history
    .map((m) => `${m.direction === "in" ? "Boss" : "Assistant"}: ${m.text.slice(0, 600)}`)
    .join("\n");

  return [
    `<boss_data>\n${bossData}\n</boss_data>`,
    transcript ? `<recent_conversation>\n${transcript}\n</recent_conversation>` : null,
    `<boss_message>\n${question}\n</boss_message>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
