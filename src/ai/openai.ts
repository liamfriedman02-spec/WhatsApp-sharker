/**
 * The same coach on OpenAI (used when there's an OPENAI_API_KEY and no Anthropic key).
 * Same prompts, same schemas, same validation: only the HTTP call differs. Uses Chat
 * Completions with a strict JSON schema so every reply parses.
 */
import { z } from "zod";
import type { ContentCtx } from "../content/context.js";
import type { Logger } from "../logger.js";
import {
  AnswerSchema,
  INVITE_PROMPT,
  InviteSchema,
  POSTS_PROMPT,
  PostsSchema,
  SYSTEM_PROMPT,
  inviteRequest,
  postsRequest,
  toAnswer,
  userMessage,
  type Assistant,
  type AssistantAnswer,
  type AssistantInput,
} from "./assistant.js";

export interface OpenAiAssistantOptions {
  apiKey: string;
  /** e.g. "gpt-5-mini". Reasoning models (gpt-5*, o*) get reasoning_effort "low" for chat latency. */
  model: string;
  logger: Logger;
  baseUrl?: string;
  fetch?: typeof fetch;
}

interface Completion {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string };
}

export class OpenAiAssistant implements Assistant {
  constructor(private readonly opts: OpenAiAssistantOptions) {}

  async answer(input: AssistantInput): Promise<AssistantAnswer | null> {
    const out = await this.complete("coach_answer", AnswerSchema, SYSTEM_PROMPT, userMessage(input), input.ctx.boss.id);
    return out ? toAnswer(out) : null;
  }

  async writePosts({ ctx, request }: { ctx: ContentCtx; request?: string }): Promise<string[] | null> {
    const out = await this.complete("posts", PostsSchema, POSTS_PROMPT, postsRequest(ctx, request), ctx.boss.id);
    const posts = out?.posts.map((p) => p.trim()).filter(Boolean) ?? [];
    return posts.length > 0 ? posts.slice(0, 3) : null;
  }

  async writeInvite({ ctx, audience }: { ctx: ContentCtx; audience: string }): Promise<string | null> {
    const out = await this.complete("invite", InviteSchema, INVITE_PROMPT, inviteRequest(ctx, audience), ctx.boss.id);
    return out?.text.trim() || null;
  }

  /** One structured completion; null on refusal, API error or unparseable output (the router falls back). */
  private async complete<T extends z.ZodType>(name: string, schema: T, system: string, user: string, bossId: string): Promise<z.infer<T> | null> {
    const { apiKey, model, logger } = this.opts;
    const base = (this.opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: strictJsonSchema(z.toJSONSchema(schema)) } },
      max_completion_tokens: 4000,
      ...(isReasoningModel(model) ? { reasoning_effort: "low" } : {}),
    };
    try {
      const res = await (this.opts.fetch ?? fetch)(`${base}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      const data = (await res.json().catch(() => ({}))) as Completion;
      if (!res.ok) {
        const log = res.status === 429 ? logger.warn : logger.error;
        log.call(logger, "openai: API error", { bossId, status: res.status, err: data.error?.message?.slice(0, 300) });
        return null;
      }
      const choice = data.choices?.[0];
      if (!choice?.message || choice.message.refusal) {
        logger.warn("openai: refusal", { bossId, refusal: choice?.message?.refusal?.slice(0, 200) });
        return null;
      }
      if (!choice.message.content) {
        logger.warn("openai: no content", { bossId, finish: choice.finish_reason });
        return null;
      }
      const parsed = schema.safeParse(JSON.parse(choice.message.content));
      if (!parsed.success) {
        logger.warn("openai: output doesn't match schema", { bossId, issues: parsed.error.issues.length });
        return null;
      }
      logger.debug("openai: answered", { bossId, input: data.usage?.prompt_tokens, output: data.usage?.completion_tokens });
      return parsed.data as z.infer<T>;
    } catch (err) {
      logger.error("openai: failed", { bossId, err });
      return null;
    }
  }
}

function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}

/**
 * OpenAI's strict mode wants every object closed (additionalProperties: false) with every
 * property required; zod's JSON schema already has that shape, this makes sure of it.
 */
export function strictJsonSchema(schema: unknown): Record<string, unknown> {
  const walk = (node: unknown): unknown => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return node;
    const n = { ...(node as Record<string, unknown>) };
    delete n.$schema;
    if (n.type === "object" && n.properties && typeof n.properties === "object") {
      const props = Object.fromEntries(Object.entries(n.properties as Record<string, unknown>).map(([k, v]) => [k, walk(v)]));
      n.properties = props;
      n.required = Object.keys(props);
      n.additionalProperties = false;
    }
    if (n.items) n.items = walk(n.items);
    return n;
  };
  return walk(schema) as Record<string, unknown>;
}
