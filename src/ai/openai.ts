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
  /** A model id, or "auto": the newest GPT model the account can use (looked up once at first use). */
  model: string;
  logger: Logger;
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** Used when "auto" can't list the account's models. */
export const FALLBACK_MODEL = "gpt-5-mini";

interface Completion {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string; param?: string };
}

export class OpenAiAssistant implements Assistant {
  private resolvedModel: Promise<string> | null = null;
  /** Set once a model rejected reasoning_effort, so we stop sending it. */
  private noReasoningParam = false;

  constructor(private readonly opts: OpenAiAssistantOptions) {}

  /** The model to call: the configured one, or the newest GPT model on this account. */
  model(): Promise<string> {
    if (this.opts.model !== "auto") return Promise.resolve(this.opts.model);
    this.resolvedModel ??= this.newestModel();
    return this.resolvedModel;
  }

  private async newestModel(): Promise<string> {
    const { apiKey, logger } = this.opts;
    const base = (this.opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    try {
      const res = await (this.opts.fetch ?? fetch)(`${base}/models`, { headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15_000) });
      const data = (await res.json()) as { data?: { id: string }[] };
      const picked = res.ok ? newestGptModel((data.data ?? []).map((m) => m.id)) : null;
      if (picked) {
        logger.info("openai: using the newest model on this account", { model: picked });
        return picked;
      }
      logger.warn("openai: couldn't pick a model from the account's list", { status: res.status });
    } catch (err) {
      logger.warn("openai: couldn't list models", { err });
    }
    this.resolvedModel = null; // try again next time
    return FALLBACK_MODEL;
  }

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
    const { apiKey, logger } = this.opts;
    const base = (this.opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = await this.model();
    const request = (withReasoning: boolean) => ({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: strictJsonSchema(z.toJSONSchema(schema)) } },
      max_completion_tokens: 4000,
      ...(withReasoning ? { reasoning_effort: "low" } : {}),
    });
    try {
      let withReasoning = isReasoningModel(model) && !this.noReasoningParam;
      let res = await this.post(`${base}/chat/completions`, request(withReasoning));
      let data = (await res.json().catch(() => ({}))) as Completion;
      // A model that doesn't take reasoning_effort says so with a 400: retry once without it.
      if (res.status === 400 && withReasoning && /reasoning/i.test(`${data.error?.param ?? ""} ${data.error?.message ?? ""}`)) {
        this.noReasoningParam = true;
        withReasoning = false;
        res = await this.post(`${base}/chat/completions`, request(false));
        data = (await res.json().catch(() => ({}))) as Completion;
      }
      if (!res.ok) {
        const log = res.status === 429 ? logger.warn : logger.error;
        log.call(logger, "openai: API error", { bossId, model, status: res.status, err: data.error?.message?.slice(0, 300) });
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

  private post(url: string, body: unknown): Promise<Response> {
    return (this.opts.fetch ?? fetch)(url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.opts.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  }
}

/** GPT-5 and later, and the o-series, take reasoning_effort. */
function isReasoningModel(model: string): boolean {
  return /^(gpt-([5-9]|\d{2})|o\d)/i.test(model);
}

/**
 * The newest general GPT model in a /models listing: highest version first (gpt-6.1 beats
 * gpt-6 beats gpt-5.2), the full model before -mini/-nano, dated snapshots and specialty
 * models (pro, realtime, audio, search, codex…) skipped. Null when nothing GPT-5+ is there.
 */
export function newestGptModel(ids: string[]): string | null {
  const parsed = ids
    .map((id) => {
      const m = /^gpt-(\d+)(?:\.(\d+))?(?:-(mini|nano))?$/.exec(id);
      return m ? { id, major: Number(m[1]), minor: Number(m[2] ?? 0), tier: m[3] === "mini" ? 1 : m[3] === "nano" ? 2 : 0 } : null;
    })
    .filter((m) => m !== null && m.major >= 5)
    .sort((a, b) => b!.major - a!.major || b!.minor - a!.minor || a!.tier - b!.tier);
  return parsed[0]?.id ?? null;
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
