import { describe, expect, it } from "vitest";
import { assistantLabel, createAssistant } from "../src/ai/factory.js";
import { FALLBACK_MODEL, OpenAiAssistant, newestGptModel, strictJsonSchema } from "../src/ai/openai.js";
import { loadConfig } from "../src/config.js";
import { contentCtx } from "../src/content/context.js";
import { silentLogger } from "../src/logger.js";
import { demoBosses } from "../src/platform/mockPlatform.js";
import { HUB, MONDAY_NOON } from "./helpers.js";

const carla = demoBosses(MONDAY_NOON.getTime()).find((b) => b.id === "boss_carla")!;
const ctx = contentCtx(carla, { now: MONDAY_NOON, hubUrl: HUB, defaultTimezone: "UTC" });

const ANSWER = {
  reply: "Your Agent posted 14 times this week!",
  cta: "agent_view",
  guide: "none",
  escalate_to_human: false,
  set_goal: { metric: "none", target: 0, days: 0 },
  remember: [],
  follow_up_hours: 0,
  follow_up_reason: "",
  mission_done: false,
  buttons: ["menu:ai_agent", "bogus"],
};

/** A fake OpenAI endpoint: records the request, returns `message` as the first choice. */
function fakeOpenAi(reply: { content?: unknown; refusal?: string; status?: number }) {
  const requests: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), headers: Object.fromEntries(new Headers(init?.headers).entries()), body: JSON.parse(String(init?.body)) });
    if (reply.status && reply.status !== 200) return new Response(JSON.stringify({ error: { message: "boom", type: "server_error" } }), { status: reply.status });
    const message = reply.refusal ? { refusal: reply.refusal, content: null } : { content: typeof reply.content === "string" ? reply.content : JSON.stringify(reply.content) };
    return new Response(JSON.stringify({ choices: [{ message, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });
  };
  return { requests, make: (model = "gpt-5-mini") => new OpenAiAssistant({ apiKey: "sk-test", model, logger: silentLogger, fetch: fetchImpl }) };
}

describe("OpenAiAssistant", () => {
  it("calls Chat Completions with the coach prompt and a strict JSON schema, and validates the reply like Claude's", async () => {
    const { requests, make } = fakeOpenAi({ content: ANSWER });
    const answer = await make().answer({ ctx, question: "is my agent working?", history: [], flow: null });
    expect(answer).toEqual({
      reply: "Your Agent posted 14 times this week!",
      cta: "agent_view",
      guide: null,
      escalate: false,
      buttons: ["menu:ai_agent"],
      actions: { setGoal: null, remember: [], followUp: null, missionDone: false },
    });

    const req = requests[0]!;
    expect(req.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(req.headers.authorization).toBe("Bearer sk-test");
    expect(req.body.model).toBe("gpt-5-mini");
    expect(req.body.reasoning_effort).toBe("low");
    const messages = req.body.messages as { role: string; content: string }[];
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[0]!.content).toContain("You are the Sharker Boss Coach");
    expect(messages[1]!.content).toContain("<boss_message>\nis my agent working?\n</boss_message>");
    const format = req.body.response_format as { type: string; json_schema: { strict: boolean; schema: Record<string, unknown> } };
    expect(format.type).toBe("json_schema");
    expect(format.json_schema.strict).toBe(true);
    const schema = format.json_schema.schema as { additionalProperties: boolean; required: string[]; properties: Record<string, { additionalProperties?: boolean; required?: string[] }>; $schema?: string };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["reply", "cta", "guide", "escalate_to_human", "set_goal", "remember", "follow_up_hours", "follow_up_reason", "mission_done", "buttons"]);
    expect(schema.properties.set_goal).toMatchObject({ additionalProperties: false, required: ["metric", "target", "days"] });
    expect(schema.$schema).toBeUndefined();
  });

  it("only sends reasoning_effort to reasoning models", async () => {
    const { requests, make } = fakeOpenAi({ content: ANSWER });
    await make("gpt-4.1").answer({ ctx, question: "hi", history: [], flow: null });
    expect(requests[0]!.body.reasoning_effort).toBeUndefined();
  });

  it("writes posts and invites with the shared prompts", async () => {
    const posts = fakeOpenAi({ content: { posts: ["a {link}", "b", "c", "d"] } });
    expect(await posts.make().writePosts({ ctx, request: "for students" })).toEqual(["a {link}", "b", "c"]);
    expect((posts.requests[0]!.body.messages as { content: string }[])[1]!.content).toContain("The Boss's request: for students");

    const invite = fakeOpenAi({ content: { text: " Oi família! {link} " } });
    expect(await invite.make().writeInvite({ ctx, audience: "cousins" })).toBe("Oi família! {link}");
    expect((invite.requests[0]!.body.messages as { content: string }[])[0]!.content).toContain("personal invitation message");
  });

  it("returns null on refusals, API errors and output that doesn't fit the schema", async () => {
    for (const reply of [{ refusal: "no" }, { status: 500 }, { status: 429 }, { content: "not json" }, { content: { reply: "missing fields" } }, { content: { ...ANSWER, reply: "  " } }]) {
      expect(await fakeOpenAi(reply).make().answer({ ctx, question: "hi", history: [], flow: null })).toBeNull();
    }
  });

  it("with model 'auto', uses the newest GPT model the account can use (looked up once)", async () => {
    const calls: string[] = [];
    const models = ["gpt-4.1", "gpt-5", "gpt-5-mini", "gpt-6.1-mini", "gpt-6.1", "gpt-6.1-2026-05-01", "gpt-6.1-pro", "gpt-6", "o3", "gpt-5-chat-latest"];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/models")) return new Response(JSON.stringify({ data: models.map((id) => ({ id })) }), { status: 200 });
      expect(JSON.parse(String(init?.body)).model).toBe("gpt-6.1");
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(ANSWER) } }] }), { status: 200 });
    };
    const assistant = new OpenAiAssistant({ apiKey: "sk-test", model: "auto", logger: silentLogger, fetch: fetchImpl });
    expect((await assistant.answer({ ctx, question: "hi", history: [], flow: null }))?.reply).toBe(ANSWER.reply);
    expect((await assistant.answer({ ctx, question: "hi", history: [], flow: null }))?.reply).toBe(ANSWER.reply);
    expect(calls.filter((u) => u.endsWith("/models"))).toHaveLength(1);
    expect(newestGptModel(models)).toBe("gpt-6.1");
    expect(newestGptModel(["gpt-5-mini", "gpt-5-nano"])).toBe("gpt-5-mini");
    expect(newestGptModel(["gpt-4.1", "o3"])).toBeNull();
  });

  it("falls back to a known model when the account's models can't be listed", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      if (String(input).endsWith("/models")) return new Response("nope", { status: 401 });
      seen.push(JSON.parse(String(init?.body)).model);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(ANSWER) } }] }), { status: 200 });
    };
    const assistant = new OpenAiAssistant({ apiKey: "sk-test", model: "auto", logger: silentLogger, fetch: fetchImpl });
    await assistant.answer({ ctx, question: "hi", history: [], flow: null });
    expect(seen).toEqual([FALLBACK_MODEL]);
  });

  it("retries once without reasoning_effort when the model rejects it", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      if (body.reasoning_effort) return new Response(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning_effort'", param: "reasoning_effort" } }), { status: 400 });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(ANSWER) } }] }), { status: 200 });
    };
    const assistant = new OpenAiAssistant({ apiKey: "sk-test", model: "gpt-7", logger: silentLogger, fetch: fetchImpl });
    expect((await assistant.answer({ ctx, question: "hi", history: [], flow: null }))?.reply).toBe(ANSWER.reply);
    await assistant.answer({ ctx, question: "again", history: [], flow: null });
    expect(bodies.map((b) => b.reasoning_effort)).toEqual(["low", undefined, undefined]); // remembered for the next call
  });

  it("closes every object in a schema for strict mode", () => {
    const strict = strictJsonSchema({ $schema: "x", type: "object", properties: { a: { type: "string" }, b: { type: "array", items: { type: "object", properties: { c: { type: "number" } } } } } });
    expect(strict).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["a", "b"],
      properties: { a: { type: "string" }, b: { type: "array", items: { type: "object", additionalProperties: false, required: ["c"], properties: { c: { type: "number" } } } } },
    });
  });
});

describe("assistant factory", () => {
  const base = { NODE_ENV: "test", WHATSAPP_DRY_RUN: "true" };

  it("picks Claude, else OpenAI, else nothing", () => {
    const none = loadConfig(base);
    expect(createAssistant(none, silentLogger)).toBeNull();
    expect(assistantLabel(none)).toBe("disabled");

    const openai = loadConfig({ ...base, OPENAI_API_KEY: "sk-test" });
    expect(createAssistant(openai, silentLogger)).toBeInstanceOf(OpenAiAssistant);
    expect(assistantLabel(openai)).toBe("openai:newest GPT on the account");
    expect(assistantLabel(loadConfig({ ...base, OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-5-mini" }))).toBe("openai:gpt-5-mini");

    const both = loadConfig({ ...base, OPENAI_API_KEY: "sk-test", ANTHROPIC_API_KEY: "sk-ant-test", CLAUDE_MODEL: "claude-opus-5" });
    expect(createAssistant(both, silentLogger)).not.toBeInstanceOf(OpenAiAssistant);
    expect(assistantLabel(both)).toBe("claude-opus-5");

    const off = loadConfig({ ...base, OPENAI_API_KEY: "sk-test", AI_ASSISTANT_ENABLED: "false" });
    expect(createAssistant(off, silentLogger)).toBeNull();
  });
});
