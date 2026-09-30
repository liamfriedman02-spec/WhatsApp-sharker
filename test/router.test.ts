import { describe, expect, it, vi } from "vitest";
import { NO_ACTIONS, type Assistant, type AssistantAnswer } from "../src/ai/assistant.js";
import type { LogSupportDesk } from "../src/bot/handoff.js";
import { HUB, PHONES, harness, ids, textOf } from "./helpers.js";

const answer = (a: Partial<AssistantAnswer>): AssistantAnswer => ({ reply: "ok", cta: null, guide: null, escalate: false, actions: NO_ACTIONS, ...a });

describe("conversation basics", () => {
  it("tells unknown numbers they aren't linked to a Boss account", async () => {
    const h = harness();
    const out = await h.text("19999999999", "hi");
    expect(out).toHaveLength(1);
    expect(textOf(out[0])).toContain("couldn't find a Boss account");
  });

  it("greets with a personal main menu that pushes the next step", async () => {
    const h = harness();
    const [menu] = await h.text(PHONES.ana, "Hi!");
    expect(menu?.kind).toBe("list");
    expect(textOf(menu)).toContain("Hi Ana!");
    expect(textOf(menu)).toContain("*Ana Arena*");
    expect(textOf(menu)).toContain("activate your AI Marketing Agent");
    expect(ids(menu)).toEqual(
      expect.arrayContaining(["mission:today", "coach:progress", "menu:business", "menu:ai_agent", "post:write", "menu:learn", "menu:help", "handoff:start"]),
    );
  });

  it("ignores duplicate webhook deliveries", async () => {
    const h = harness();
    const msg = { messageId: "dup", from: PHONES.ana, timestamp: h.now(), type: "text" as const, text: "hi" };
    await h.app.router.handleInbound(msg);
    await h.app.router.handleInbound(msg);
    expect(h.messenger.sent).toHaveLength(1);
  });

  it("records the inbound time (24h window) and logs the conversation", async () => {
    const h = harness();
    await h.text(PHONES.ana, "menu");
    const state = await h.store.getState("boss_ana", PHONES.ana);
    expect(state.lastInboundAt).toBe(h.now().toISOString());
    const log = await h.store.recentMessages("boss_ana", 10);
    expect(log.map((m) => m.direction)).toEqual(["in", "out"]);
  });
});

describe("education", () => {
  it("teaches a topic with a CTA, then offers the next topic", async () => {
    const h = harness();
    const [topic, next] = await h.tap(PHONES.carla, "learn:how_earn");
    expect(topic?.kind).toBe("cta");
    expect(textOf(topic)).toContain("More players + more activity = more earnings");
    expect(textOf(topic)).toContain("$4,820.75"); // personalized
    expect(topic?.kind === "cta" && topic.cta.url).toMatch(new RegExp(`^${HUB}/earnings\\?utm_source=whatsapp`));
    expect(ids(next)).toEqual(["learn:bring_players", "menu:learn", "menu:main"]);
    expect(textOf(next)).toContain("Bring players");
  });

  it("the AI Agent topic CTA follows the Boss's Agent stage", async () => {
    const h = harness();
    const cta = async (phone: string) => {
      const [m] = await h.tap(phone, "learn:ai_agent");
      return m?.kind === "cta" ? m.cta.label : null;
    };
    expect(await cta(PHONES.ana)).toBe("Activate My AI Agent");
    expect(await cta(PHONES.bruno)).toBe("Connect My Socials");
    expect(await cta(PHONES.carla)).toBe("View My AI Agent");
  });

  it("shows the autopilot checklist with the Boss's real progress", async () => {
    const h = harness();
    const [m] = await h.tap(PHONES.bruno, "learn:ai_autopilot");
    expect(textOf(m)).toContain("✅ 1. Activate your AI Agent");
    expect(textOf(m)).toContain("⬜ 2. Connect your socials");
  });

  it("finishing the last topic points to the next best action", async () => {
    const h = harness();
    const [, done] = await h.tap(PHONES.ana, "learn:ai_autopilot");
    expect(textOf(done)).toContain("You finished the Boss basics");
    expect(ids(done)).toContain("nba");
  });
});

describe("support", () => {
  it("navigates help → category → personalized FAQ answer → feedback", async () => {
    const h = harness();
    const [help] = await h.text(PHONES.carla, "help");
    expect(ids(help)).toContain("help:earnings");
    const [cat] = await h.tap(PHONES.carla, "help:earnings");
    expect(ids(cat)).toContain("faq:how_much_earned");
    const [ans, feedback] = await h.tap(PHONES.carla, "faq:how_much_earned");
    expect(textOf(ans)).toContain("$96.40");
    expect(textOf(ans)).toContain("$612.30");
    expect(ids(feedback)).toEqual(["feedback:solved:how_much_earned", "handoff:start", "feedback:unsolved:how_much_earned"]);
    const [solved] = await h.tap(PHONES.carla, "feedback:solved:how_much_earned");
    expect(textOf(solved)).toContain("Great!");
  });

  it("without AI, free text is answered from the knowledge base", async () => {
    const h = harness();
    const [ans] = await h.text(PHONES.diego, "when do I get paid?");
    expect(textOf(ans)).toContain("When do I get paid?");
    const [confused] = await h.text(PHONES.diego, "blorp zzz");
    expect(textOf(confused)).toContain("not sure I understood");
    expect(ids(confused)).toContain("handoff:start");
  });

  it("business snapshot shows Your players / Your earnings / Your AI Agent", async () => {
    const h = harness();
    const [m] = await h.tap(PHONES.carla, "menu:business");
    const t = textOf(m);
    expect(t).toContain("Carla Kingdom — your business");
    expect(t).toContain("*Your players:* 248 (+4 today, +31 this week)");
    expect(t).toContain("*Your earnings:*");
    expect(t).toContain("*Your AI Agent:* 14 posts this week");
  });
});

describe("step-by-step guides", () => {
  it("walks through activating the AI Agent and verifies it on the live account", async () => {
    const h = harness();
    const [intro, step1] = await h.tap(PHONES.ana, "guide:activate_agent");
    expect(textOf(intro)).toContain("activate your AI Marketing Agent");
    expect(textOf(step1)).toContain("(1/2)");
    expect(textOf(step1)).toContain(`${HUB}/ai-agent/activate`);

    const [step2] = await h.text(PHONES.ana, "done");
    expect(textOf(step2)).toContain("(2/2)");

    const [notYet] = await h.tap(PHONES.ana, "guide_step:done");
    expect(textOf(notYet)).toContain("don't see it on your account yet");

    h.platform.update("boss_ana", { aiAgent: { activated: true, activatedAt: h.now().toISOString() } });
    const [success] = await h.tap(PHONES.ana, "guide_step:check");
    expect(textOf(success)).toContain("Your AI Agent is active!");
    expect(ids(success)).toEqual(["guide:connect_socials", "menu:main"]);

    const [intro2, socials1] = await h.tap(PHONES.ana, "guide:connect_socials");
    expect(textOf(intro2)).toContain("connect your social accounts");
    expect(textOf(socials1)).toContain("(1/3)");
    expect((await h.store.getState("boss_ana", PHONES.ana)).flow).toEqual({ type: "guide", guideId: "connect_socials", step: 0 });
  });

  it("skips steps the Boss already completed", async () => {
    const h = harness();
    const bruno = await h.tap(PHONES.bruno, "guide:activate_agent"); // already activated → connect socials
    expect(textOf(bruno[0])).toContain("already done");
    expect(textOf(bruno[1])).toContain("connect your social accounts");

    const carla = await h.tap(PHONES.carla, "guide:activate_agent"); // fully live → one message
    expect(carla).toHaveLength(1);
    expect(textOf(carla[0])).toContain("already done");
    expect(ids(carla[0])).toContain("nba");
  });

  it("leaving a guide ends it, so a later 'ok' doesn't resume it", async () => {
    const h = harness();
    await h.tap(PHONES.ana, "guide:share_link");
    await h.tap(PHONES.ana, "menu:business");
    expect((await h.store.getState("boss_ana", PHONES.ana)).flow).toBeNull();
    const [reply] = await h.text(PHONES.ana, "ok");
    expect(textOf(reply)).not.toContain("(2/3)");
  });

  it("'I'm stuck' offers human help", async () => {
    const h = harness();
    await h.tap(PHONES.ana, "guide:share_link");
    const [stuck] = await h.tap(PHONES.ana, "guide_step:stuck");
    expect(ids(stuck)).toContain("handoff:start");
  });
});

describe("human handoff", () => {
  it("opens a ticket, forwards messages, lets an agent reply and resolve", async () => {
    const h = harness();
    const desk = h.supportDesk as LogSupportDesk;

    const [ask] = await h.text(PHONES.diego, "human");
    expect(textOf(ask)).toContain("Talk to a human");
    const [ack] = await h.text(PHONES.diego, "My payout from last week is missing");
    expect(textOf(ack)).toContain("request *#1*");
    expect(desk.events[0]).toMatchObject({ event: "handoff.opened", message: "My payout from last week is missing" });

    const silent = await h.text(PHONES.diego, "It was $22");
    expect(silent).toEqual([]); // the bot stays quiet while a human owns the conversation
    expect(desk.events[1]).toMatchObject({ event: "handoff.message", message: "It was $22" });

    await h.app.router.agentReply(1, "Found it — it's being re-sent today.", "Marta");
    expect(textOf(h.messenger.sent.at(-1)?.message)).toContain("Marta (Sharker Support)");

    await h.app.router.resolveHandoff(1);
    expect((await h.store.getState("boss_diego", PHONES.diego)).mode).toBe("bot");
    expect(desk.events.at(-1)).toMatchObject({ event: "handoff.closed", reason: "resolved_by_agent" });

    const [menu] = await h.text(PHONES.diego, "hi");
    expect(menu?.kind).toBe("list");
  });

  it("cancelling or navigating away doesn't open a ticket", async () => {
    const h = harness();
    await h.tap(PHONES.ana, "handoff:start");
    await h.tap(PHONES.ana, "menu:learn");
    const replies = await h.text(PHONES.ana, "what is gcoin");
    expect(textOf(replies[0])).toContain("GCOIN");
    expect(await h.store.listHandoffs()).toEqual([]);
  });

  it("expires a stale handoff back to the bot", async () => {
    const h = harness();
    await h.tap(PHONES.ana, "handoff:start");
    await h.text(PHONES.ana, "help me please");
    h.advance(25 * 3_600_000);
    const [menu] = await h.text(PHONES.ana, "hi");
    expect(menu?.kind).toBe("list");
    expect((await h.store.listHandoffs("open")).length).toBe(0);
  });
});

describe("preferences", () => {
  it("STOP pauses proactive tips, START resumes them", async () => {
    const h = harness();
    await h.text(PHONES.ana, "STOP");
    expect((await h.store.getState("boss_ana", PHONES.ana)).optedOut).toBe(true);
    const out = await h.text(PHONES.ana, "start");
    expect((await h.store.getState("boss_ana", PHONES.ana)).optedOut).toBe(false);
    expect(out[1]?.kind).toBe("list");
  });

  it("changes the performance summary frequency", async () => {
    const h = harness();
    await h.tap(PHONES.carla, "settings:digest:daily");
    expect((await h.store.getState("boss_carla", PHONES.carla)).digest).toBe("daily");
  });
});

describe("AI assistant", () => {
  const stub = (impl: Assistant["answer"]): Assistant => ({ answer: vi.fn(impl), writePosts: vi.fn(async () => null) });

  it("sends the answer with the Boss Hub button it picked", async () => {
    const assistant = stub(async () => answer({ reply: "Activate your Agent and it posts for you!", cta: "agent_activate" }));
    const h = harness({ assistant });
    const [m] = await h.text(PHONES.ana, "I have no time to post on instagram");
    expect(m?.kind).toBe("cta");
    expect(m?.kind === "cta" && m.cta.label).toBe("Activate My AI Agent");
    expect(m?.kind === "cta" && m.cta.url).toContain("utm_campaign=assistant");
  });

  it("offers a guide and escalates to a human when asked", async () => {
    const h = harness({
      assistant: stub(async ({ question }) =>
        question.includes("payout") ? answer({ reply: "Let me get a person.", escalate: true }) : answer({ reply: "Here's how.", guide: "connect_socials" }),
      ),
    });
    const [guide] = await h.text(PHONES.bruno, "how do I connect tiktok?");
    expect(ids(guide)).toEqual(["guide:connect_socials", "menu:main"]);
    const [esc] = await h.text(PHONES.bruno, "my payout never arrived");
    expect(ids(esc)).toContain("handoff:start");
  });

  it("gets Boss data and recent history, and falls back to the knowledge base on failure", async () => {
    const assistant = stub(async () => null);
    const h = harness({ assistant });
    await h.text(PHONES.carla, "hi");
    const [fallback] = await h.text(PHONES.carla, "where is my gcoin balance");
    const call = vi.mocked(assistant.answer).mock.calls[0]![0];
    expect(call.question).toBe("where is my gcoin balance");
    expect(call.ctx.boss.id).toBe("boss_carla");
    expect(call.history.map((m) => m.direction)).toEqual(["in", "out"]); // current question excluded
    expect(textOf(fallback)).toContain("58,400 GCOIN");
  });
});
