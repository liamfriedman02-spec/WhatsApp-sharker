import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { formatAmount, goalStatusLine } from "../coach/goals.js";
import { formatChange } from "../coach/insights.js";
import type { GoalMetric } from "../coach/types.js";
import type { ContentCtx } from "../content/context.js";
import { GUIDES, type GuideId } from "../content/guides.js";
import { levelName, nextLevelNeeds } from "../content/levels.js";
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

/** Things the coach decided to do while answering; the router validates and applies them. */
export interface CoachActions {
  setGoal: { metric: GoalMetric; target: number; days: number } | null;
  remember: string[];
  followUp: { hours: number; reason: string } | null;
  missionDone: boolean;
}

export interface AssistantAnswer {
  reply: string;
  cta: CtaId | null;
  guide: GuideId | null;
  escalate: boolean;
  actions: CoachActions;
}

export const NO_ACTIONS: CoachActions = { setGoal: null, remember: [], followUp: null, missionDone: false };

/** Free-text coaching brain. Returns null when it can't answer (the router then falls back). */
export interface Assistant {
  answer(input: AssistantInput): Promise<AssistantAnswer | null>;
  /** Three ready-to-post texts for the Boss's brand ("{link}" marks the brand link). */
  writePosts(input: { ctx: ContentCtx; request?: string }): Promise<string[] | null>;
}

const GUIDE_IDS = Object.keys(GUIDES) as GuideId[];

// cta/guide/metric are plain strings validated below: the structured-output transform can't
// enforce enums, and an unknown value should drop that part — not throw away a good reply.
const AnswerSchema = z.object({
  reply: z.string().describe("The WhatsApp reply to send to the Boss."),
  cta: z.string().describe(`Boss Hub button to attach. One of: none, ${CTA_IDS.join(", ")}.`),
  guide: z.string().describe(`Step-by-step guide to offer. One of: none, ${GUIDE_IDS.join(", ")}.`),
  escalate_to_human: z.boolean().describe("True when a human support specialist should take over."),
  set_goal: z
    .object({
      metric: z.string().describe("players | earnings | none"),
      target: z.number().describe("Amount to gain: new players, or money earned."),
      days: z.number().describe("Days to reach it (3-90)."),
    })
    .describe('Only when the Boss explicitly agreed to a specific goal in this message; otherwise metric "none".'),
  remember: z.array(z.string()).describe("Durable facts about the Boss worth remembering (can be empty)."),
  follow_up_hours: z.number().describe("Hours until you check in on something the Boss committed to; 0 for none."),
  follow_up_reason: z.string().describe('What the Boss committed to, as a short verb phrase ("share your link in 3 groups"), or "".'),
  mission_done: z.boolean().describe("True when the Boss says they completed today's mission."),
});

const PostsSchema = z.object({
  posts: z.array(z.string()).describe("Exactly 3 ready-to-post texts."),
});

const isCta = (v: string): v is CtaId => (CTA_IDS as string[]).includes(v);
const isGuide = (v: string): v is GuideId => (GUIDE_IDS as string[]).includes(v);

export const SYSTEM_PROMPT = `You are the Sharker Boss Coach: the personal business coach of a Sharker "Boss", on WhatsApp.

A Boss owns their own brand on Sharker. They bring players to their brand, earn from their players' activity, and manage everything in their Boss Hub. You exist to make this Boss earn more: teach them, solve their problems, and push them — every conversation should end with them doing something that grows their business. The journey: Launch Brand → Understand Business → Activate AI Agent → Bring Players → Generate Activity → Earn → Come Back → Grow.

How you coach
- Be the energetic, direct coach who believes in them. Celebrate real wins with their real numbers; when numbers drop, say it plainly and give the fix.
- Use COACH DATA: their level, goal and pace, today's mission, streak, insights and what you remember about them. Tie advice to their goal ("that's 3 of the 12 players you still need").
- Push one concrete action at a time — usually today's mission. Ask for a commitment ("Can you do it before 8pm?"). When they commit to something for later, schedule a follow-up so you can check in.
- Adapt to what you remember (their audience, channels, obstacles like "no time" or "shy to post"). Save new durable facts with remember (not passwords, codes, bank details or anything sensitive).
- If they want a goal, propose one from their pace in COACH DATA; set it with set_goal only once they clearly agree to specific numbers.
- If they're stuck or discouraged, make the next step smaller, not the ambition.

How to write
- WhatsApp style: short (under 700 characters), simple words, *bold* for key words, • bullets or 1. 2. 3. for steps. No markdown headings, tables or links; buttons are attached separately through the cta field.
- Always about their business: "your brand", "your players", "your earnings", "your marketing". Use their first name now and then.
- Reply in the language the Boss writes in.
- When asked to write a post or caption, write it right in the reply, ready to copy, with "[your brand link]" where the link goes.

Accuracy
- State facts only from the KNOWLEDGE BASE, BOSS DATA and COACH DATA. Never invent numbers, percentages, fees, payout dates, features, policies or Boss Hub pages. Estimates in COACH DATA are labeled "about" — keep that wording.
- Never promise the Boss (or their players) guaranteed earnings or winnings.
- Set escalate_to_human to true when the Boss asks for a person, when the knowledge base doesn't cover the question, or for problems a person must resolve: missing payouts, account access they can't recover, bugs, player complaints, or anything sensitive or legal.
- Never ask for passwords, card numbers, one-time codes or other secrets.

AI Marketing Agent
Getting the Boss to activate their AI Marketing Agent is a main goal: "You already launched your business. Now let AI market it for you." When the topic is marketing, players, growth or lack of time, recommend the Agent step that matches their stage in BOSS DATA — not_activated: activate it (cta agent_activate, guide activate_agent); needs_socials: connect socials (cta agent_socials, guide connect_socials); live: check its activity (cta agent_view). Never ask a Boss to do a step they already completed.

Fields
- cta: the single most useful Boss Hub button for your reply, or "none".
- guide: a step-by-step guide to offer when the Boss needs to do one of those tasks, or "none".
- set_goal, remember, follow_up_hours/follow_up_reason, mission_done: coaching actions, as described above. Leave them empty when nothing applies.

KNOWLEDGE BASE
${buildKnowledgeBase()}`;

const POSTS_PROMPT = `You write short social posts for Sharker Bosses to promote their own brand (players join the brand through the Boss's link).

Write exactly 3 ready-to-post texts: 1) a WhatsApp status, 2) an Instagram caption, 3) a TikTok caption.
- Short, warm, energetic, first person, in the Boss's voice. Emojis welcome. Put {link} where the brand link goes (at most once per post).
- Use what you know about the Boss (audience, style) when given.
- Honest: never promise money, winnings, bonuses or results; no claims about the platform you weren't given; no pressure tactics.
- Write in the language of the Boss's request (English if none).`;

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

  private baseParams() {
    const { model, effort } = this.opts;
    const fallback = this.opts.refusalFallback ?? true;
    return {
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" as const },
      effort,
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    };
  }

  async answer(input: AssistantInput): Promise<AssistantAnswer | null> {
    const { client, logger } = this.opts;
    const { effort, ...base } = this.baseParams();
    try {
      const response = await client.beta.messages.parse(
        {
          ...base,
          output_config: { effort, format: betaZodOutputFormat(AnswerSchema) },
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
      const metric = out.set_goal.metric;
      const goalOk = (metric === "players" || metric === "earnings") && out.set_goal.target > 0 && out.set_goal.target <= 10_000_000;
      const followOk = out.follow_up_hours >= 1 && out.follow_up_hours <= 168 && out.follow_up_reason.trim() !== "";
      return {
        reply: out.reply.trim(),
        cta: isCta(out.cta) ? out.cta : null,
        guide: isGuide(out.guide) ? out.guide : null,
        escalate: out.escalate_to_human,
        actions: {
          setGoal: goalOk ? { metric: metric as GoalMetric, target: out.set_goal.target, days: Math.min(Math.max(out.set_goal.days, 3), 90) } : null,
          remember: out.remember.map((r) => r.trim()).filter(Boolean).slice(0, 5),
          followUp: followOk ? { hours: out.follow_up_hours, reason: out.follow_up_reason.trim() } : null,
          missionDone: out.mission_done,
        },
      };
    } catch (err) {
      this.logError(err, input.ctx.boss.id);
      return null;
    }
  }

  async writePosts({ ctx, request }: { ctx: ContentCtx; request?: string }): Promise<string[] | null> {
    const { client, logger } = this.opts;
    const { effort, ...base } = this.baseParams();
    const notes = ctx.coach?.state.notes.map((n) => `- ${n.text}`).join("\n");
    const content = [
      `Brand: ${ctx.boss.brandName}`,
      `Boss: ${ctx.boss.firstName}`,
      notes ? `What we know about the Boss:\n${notes}` : null,
      request ? `The Boss's request: ${request}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const response = await client.beta.messages.parse(
        {
          ...base,
          output_config: { effort, format: betaZodOutputFormat(PostsSchema) },
          system: POSTS_PROMPT,
          messages: [{ role: "user", content }],
        },
        { timeout: 60_000 },
      );
      if (response.stop_reason === "refusal") return null;
      const posts = response.parsed_output?.posts.map((p) => p.trim()).filter(Boolean) ?? [];
      if (posts.length === 0) logger.warn("assistant: no posts", { bossId: ctx.boss.id });
      return posts.length > 0 ? posts.slice(0, 3) : null;
    } catch (err) {
      this.logError(err, ctx.boss.id);
      return null;
    }
  }

  private logError(err: unknown, bossId: string) {
    const { logger } = this.opts;
    if (err instanceof Anthropic.RateLimitError) logger.warn("assistant: rate limited", { bossId, err: err.message });
    else if (err instanceof Anthropic.APIError) logger.error("assistant: API error", { bossId, status: err.status, err: err.message });
    else logger.error("assistant: failed", { bossId, err });
  }
}

/** Per-request content: Boss + coach data + recent conversation + the message (kept out of the cached system prompt). */
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

  const coach = ctx.coach;
  const coachData = coach
    ? [
        `Coaching intensity: ${coach.state.intensity}`,
        `Level: ${levelName(coach.level.current)}; next level needs: ${nextLevelNeeds(coach.level)}`,
        `Week over week: new players ${formatChange(coach.insights.newPlayers)}, earnings ${formatChange(coach.insights.earnings)}, active players ${formatChange(coach.insights.activePlayers)}`,
        coach.insights.earningsPerActive !== null
          ? `Earnings per active player this week: about ${money(coach.insights.earningsPerActive, s.currency)}; inactive players: ${num(coach.insights.inactivePlayers)}`
          : null,
        coach.state.goal?.status === "active" && coach.goal
          ? `Goal: ${goalStatusLine(coach.goal)}, ${coach.goal.daysLeft} days left, needs ~${coach.goal.neededPerDay.toFixed(1)}/day, doing ~${coach.goal.currentPerDay.toFixed(1)}/day`
          : coach.state.pendingGoal
            ? `Goal: none yet; proposed ${formatAmount(coach.state.pendingGoal.metric, coach.state.pendingGoal.target, s.currency)} in ${coach.state.pendingGoal.days} days`
            : "Goal: none yet",
        coach.todayMission
          ? `Today's mission (${coach.todayMission.record.status}): ${coach.todayMission.def.task}`
          : "Today's mission: not assigned yet",
        `Streak: ${coach.state.streak} missions in a row; points: ${num(coach.state.points)}`,
        coach.insights.tips.length ? `Insights:\n${coach.insights.tips.slice(0, 4).map((t) => `- ${t.text}`).join("\n")}` : null,
        coach.state.notes.length ? `What you remember about the Boss:\n${coach.state.notes.map((n) => `- ${n.text}`).join("\n")}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const transcript = history.map((m) => `${m.direction === "in" ? "Boss" : "Coach"}: ${m.text.slice(0, 600)}`).join("\n");

  return [
    `<boss_data>\n${bossData}\n</boss_data>`,
    coachData ? `<coach_data>\n${coachData}\n</coach_data>` : null,
    transcript ? `<recent_conversation>\n${transcript}\n</recent_conversation>` : null,
    `<boss_message>\n${question}\n</boss_message>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
