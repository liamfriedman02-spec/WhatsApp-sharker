import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { ClaudeAssistant, userMessage } from "../src/ai/assistant.js";
import { silentLogger } from "../src/logger.js";
import { demoBosses } from "../src/platform/mockPlatform.js";
import { contentCtx } from "../src/content/context.js";
import { HUB, MONDAY_NOON } from "./helpers.js";

const carla = demoBosses(MONDAY_NOON.getTime()).find((b) => b.id === "boss_carla")!;
const ctx = contentCtx(carla, { now: MONDAY_NOON, hubUrl: HUB, defaultTimezone: "UTC" });

const NO_ACTION_FIELDS = { set_goal: { metric: "none", target: 0, days: 0 }, remember: [], follow_up_hours: 0, follow_up_reason: "", mission_done: false, buttons: [] };

/** Anthropic client whose HTTP layer is a stub: captures the request, returns `reply`. */
function fakeClient(reply: { text?: string; stop_reason?: string; status?: number }) {
  const requests: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    requests.push({ url: String(input), headers, body: JSON.parse(String(init?.body)) });
    if (reply.status && reply.status !== 200) {
      return new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "boom" } }), { status: reply.status, headers: { "content-type": "application/json" } });
    }
    return new Response(
      JSON.stringify({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: reply.text === undefined ? [] : [{ type: "text", text: reply.text }],
        stop_reason: reply.stop_reason ?? "end_turn",
        stop_sequence: null,
        stop_details: null,
        usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return { client: new Anthropic({ apiKey: "test", fetch: fetchImpl, maxRetries: 0 }), requests };
}

describe("ClaudeAssistant", () => {
  it("sends a cached system prompt, structured output schema, adaptive thinking and refusal fallback", async () => {
    const { client, requests } = fakeClient({
      text: JSON.stringify({ reply: "Your Agent posted 14 times this week!", cta: "agent_view", guide: "none", escalate_to_human: false, ...NO_ACTION_FIELDS }),
    });
    const assistant = new ClaudeAssistant({ client, model: "claude-opus-5", effort: "low", logger: silentLogger });
    const answer = await assistant.answer({ ctx, question: "is my agent working?", history: [], flow: null });

    expect(answer).toEqual({
      reply: "Your Agent posted 14 times this week!",
      cta: "agent_view",
      guide: null,
      escalate: false,
      buttons: [],
      actions: { setGoal: null, remember: [], followUp: null, missionDone: false },
    });
    const req = requests[0]!;
    expect(req.url).toContain("/v1/messages");
    expect(req.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(req.body).toMatchObject({
      model: "claude-opus-5",
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema" } },
    });
    const system = req.body.system as { text: string; cache_control: unknown }[];
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    const schema = (req.body.output_config as { format: { schema: { properties: Record<string, { description?: string }>; required: string[] } } }).format.schema;
    expect(schema.required).toEqual(["reply", "cta", "guide", "escalate_to_human", "set_goal", "remember", "follow_up_hours", "follow_up_reason", "mission_done", "buttons"]);
    expect(schema.properties.buttons!.description).toContain("mission:done");
    expect(schema.properties.cta!.description).toContain("agent_activate");
    expect(schema.properties.guide!.description).toContain("connect_socials");
  });

  it("drops unknown button ids instead of failing the answer, and turns dashes into human punctuation", async () => {
    const { client } = fakeClient({
      text: JSON.stringify({
        reply: "Hi — let's go!",
        cta: "made_up_page",
        guide: "nope",
        escalate_to_human: false,
        set_goal: { metric: "followers", target: 10, days: 7 },
        remember: [],
        follow_up_hours: 999,
        follow_up_reason: "x",
        mission_done: false,
        buttons: ["mission:done", "made_up:button", "mission:done", "texts:menu", "menu:main"],
      }),
    });
    const assistant = new ClaudeAssistant({ client, model: "claude-opus-5", effort: "low", logger: silentLogger });
    expect(await assistant.answer({ ctx, question: "hi", history: [], flow: null })).toEqual({
      reply: "Hi, let's go!",
      cta: null,
      guide: null,
      escalate: false,
      buttons: ["mission:done", "texts:menu", "menu:main"], // unknown ids dropped, duplicates merged, max 3
      actions: { setGoal: null, remember: [], followUp: null, missionDone: false },
    });
  });

  it("returns the coaching actions it decided on", async () => {
    const { client } = fakeClient({
      text: JSON.stringify({
        reply: "Deal! 40 players by the end of the month. 💪",
        cta: "none",
        guide: "none",
        escalate_to_human: false,
        set_goal: { metric: "players", target: 40, days: 500 },
        remember: ["Main audience: university friends", " "],
        follow_up_hours: 20,
        follow_up_reason: "share your link in 3 groups",
        mission_done: true,
        buttons: [],
      }),
    });
    const assistant = new ClaudeAssistant({ client, model: "claude-opus-5", effort: "low", logger: silentLogger });
    const a = await assistant.answer({ ctx, question: "ok let's do 40", history: [], flow: null });
    expect(a?.actions).toEqual({
      setGoal: { metric: "players", target: 40, days: 90 },
      remember: ["Main audience: university friends"],
      followUp: { hours: 20, reason: "share your link in 3 groups" },
      missionDone: true,
    });
  });

  it("writes three ready-to-post texts", async () => {
    const { client, requests } = fakeClient({ text: JSON.stringify({ posts: ["a {link}", "b", "c", "d"] }) });
    const assistant = new ClaudeAssistant({ client, model: "claude-opus-5", effort: "low", logger: silentLogger });
    expect(await assistant.writePosts({ ctx, request: "something for students" })).toEqual(["a {link}", "b", "c"]);
    expect(String((requests[0]!.body.messages as { content: string }[])[0]!.content)).toContain("something for students");
  });

  it("returns null on refusals, API errors and unparseable output (router falls back)", async () => {
    for (const reply of [{ stop_reason: "refusal", text: "" }, { status: 500 }, { text: "not json" }, { text: JSON.stringify({ reply: "missing fields" }) }]) {
      const { client } = fakeClient(reply);
      const assistant = new ClaudeAssistant({ client, model: "claude-opus-5", effort: "low", logger: silentLogger });
      expect(await assistant.answer({ ctx, question: "hi", history: [], flow: null })).toBeNull();
    }
  });

  it("can turn the refusal fallback off", async () => {
    const { client, requests } = fakeClient({ text: JSON.stringify({ reply: "ok", cta: "none", guide: "none", escalate_to_human: false, ...NO_ACTION_FIELDS }) });
    const assistant = new ClaudeAssistant({ client, model: "claude-sonnet-5", effort: "low", logger: silentLogger, refusalFallback: false });
    await assistant.answer({ ctx, question: "hi", history: [], flow: null });
    expect(requests[0]!.body.fallbacks).toBeUndefined();
    expect(requests[0]!.headers["anthropic-beta"] ?? "").not.toContain("server-side-fallback");
  });

  it("puts Boss data, history and the question in the user turn", () => {
    const text = userMessage({
      ctx,
      question: "how am I doing?",
      history: [
        { direction: "out", text: "🚀 Your AI Agent Is Live", source: "nudge:agent_live", createdAt: "" },
        { direction: "in", text: "cool", source: "boss", createdAt: "" },
      ],
      flow: { type: "guide", guideId: "share_link", step: 1 },
    });
    expect(text).toContain("Brand: Carla Kingdom");
    expect(text).toContain("Players: 248 total");
    expect(text).toContain("AI Agent stage: live (connected: Instagram, TikTok)");
    expect(text).toContain("Coach: 🚀 Your AI Agent Is Live\nBoss: cool");
    expect(text).toContain('Currently following guide "share_link", step 2');
    expect(text).toContain("<boss_message>\nhow am I doing?\n</boss_message>");
  });
});
