import { describe, expect, it, vi } from "vitest";
import { NO_ACTIONS, type Assistant, type AssistantAnswer } from "../src/ai/assistant.js";
import { moneyMath, parseAmount } from "../src/coach/money.js";
import { matchAudiences } from "../src/content/invites.js";
import { PLAYBOOKS } from "../src/content/playbooks.js";
import { MONDAY_NOON, PHONES, harness, ids, textOf, type Harness } from "./helpers.js";

const DAY = 86_400_000;
const WELCOME_SENT = { trigger: "welcome", category: "milestone" as const, channel: "template" as const, step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" };

async function run(h: Harness, bossId: string) {
  return h.app.retention.runForBoss((await h.platform.getBoss(bossId))!);
}

describe("launch sprint", () => {
  it("is offered to a new Boss, starts with 'who's around you', and writes the invites they describe", async () => {
    const h = harness();
    const [menu] = await h.text(PHONES.ana, "hi");
    expect(ids(menu)[0]).toBe("play:start:launch");
    expect(textOf(menu)).toContain("Here's the plan for *Ana Arena* today");

    const [offer] = await h.text(PHONES.ana, "sprint");
    expect(textOf(offer)).toContain("7-day launch sprint");
    expect(ids(offer)).toEqual(["play:start:launch", "mission:today", "menu:main"]);

    const started = await h.tap(PHONES.ana, "play:start:launch");
    expect(textOf(started[0])).toContain("starts now");
    expect(textOf(started[1])).toContain("Day 1 of 7");
    expect(textOf(started[1])).toContain("Send a personal message with your brand link to 5 friends");
    expect(ids(started[2])).toEqual(["invite:family", "invite:friends", "invite:work", "invite:community", "invite:online"]);
    const state = await h.store.getCoachState("boss_ana");
    expect(state.playbook).toMatchObject({ id: "launch", step: 0, stepDate: "2026-09-28", status: "active" });
    expect((await h.store.getState("boss_ana", PHONES.ana)).flow).toEqual({ type: "ask", ask: "audience" });

    // Typed answer, no buttons: two audiences recognized → two invites, in the Boss's name, with the link placeholder.
    const invites = await h.text(PHONES.ana, "my football team and a few cousins");
    expect(textOf(invites[0])).toContain("Your invites");
    expect(textOf(invites[1])).toContain("*Ana Arena*");
    expect(textOf(invites[1])).toContain("[your brand link]");
    expect(invites).toHaveLength(4); // intro, 2 invites, buttons
    expect(ids(invites[3])).toEqual(["mission:done", "texts:menu", "menu:main"]);
    expect((await h.store.getCoachState("boss_ana")).audiences).toEqual(["family", "community"]);

    // "sent it" completes the day's mission without a tap.
    const [done] = await h.text(PHONES.ana, "sent it");
    expect(textOf(done)).toContain("Mission complete!* +20 points");
    const [today] = await h.tap(PHONES.ana, "play:today");
    expect(textOf(today)).toContain("Today's step is done");
    expect(ids(today)).toContain("play:next");
  });

  it("brings the next day's step proactively, with the ready texts, and the Boss can skip ahead", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    await h.tap(PHONES.ana, "play:start:launch");
    await h.tap(PHONES.ana, "invite:friends");
    await h.tap(PHONES.ana, "mission:done");

    h.advance(DAY); // Tuesday noon
    const d = await run(h, "boss_ana");
    expect(d.sent?.trigger).toBe("playbook_step");
    const tpl = h.messenger.to(PHONES.ana).at(-1);
    expect(tpl?.kind === "template" && tpl.bodyParams).toEqual([
      "7-day launch sprint",
      "2 of 7",
      "Day 2. Today we go wide: 3 groups where people know you, and your WhatsApp status. Here are your texts. Forward, post, done.",
      "Send your brand link to 3 WhatsApp groups where people know you.",
    ]);
    expect((await h.store.getCoachState("boss_ana")).playbook).toMatchObject({ step: 1, stepDate: "2026-09-29" });
    expect((await h.store.missionsSince("boss_ana", "2026-09-29")).map((m) => m.missionId)).toEqual(["share_groups"]);
    expect((await run(h, "boss_ana")).candidates.map((c) => c.trigger)).not.toContain("playbook_step"); // once per day

    const day2 = await h.tap(PHONES.ana, "play:today");
    expect(textOf(day2[0])).toContain("Day 2 of 7");
    expect(textOf(day2[1])).toContain("Hey everyone!"); // the groups invite (the Boss picked friends, so the default is used)
    expect(textOf(day2[2])).toContain("*Ana Arena* is live!"); // status text
    expect(ids(day2[3])).toEqual(["mission:done", "guide:share_link", "play:next"]);

    const day3 = await h.tap(PHONES.ana, "play:next");
    expect(textOf(day3[0])).toContain("Day 3 of 7");
    expect(textOf(day3[0])).toContain("autopilot");
    expect(ids(day3.at(-1))).toEqual(["mission:done", "guide:activate_agent", "play:next"]);
    expect((await h.store.getCoachState("boss_ana")).playbook?.step).toBe(2);
  });

  it("ends with the review and a goal, and never double-books the day with a daily mission", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    const state = await h.store.getCoachState("boss_ana");
    await h.store.saveCoachState("boss_ana", { ...state, intensity: "intense", playbook: { id: "launch", step: 6, stepDate: "2026-09-28", startedAt: "", status: "active" } });

    const [day7] = await h.tap(PHONES.ana, "play:today");
    expect(textOf(day7)).toContain("Day 7 of 7");
    expect(textOf(day7)).toContain("your goal for the next 3 weeks");
    expect((await run(h, "boss_ana")).candidates.map((c) => c.trigger)).not.toContain("daily_mission");

    h.advance(DAY);
    const d = await run(h, "boss_ana");
    expect(d.sent?.trigger).toBe("playbook_done");
    const tpl = h.messenger.to(PHONES.ana).at(-1);
    expect(tpl?.kind === "template" && tpl.bodyParams).toEqual(["7-day launch sprint", "Ana", "7", "Ana Arena"]);
    const after = await h.store.getCoachState("boss_ana");
    expect(after.playbook?.status).toBe("done");
    expect(after.playbooksDone).toEqual(["launch"]);
    const [menu] = await h.text(PHONES.ana, "menu");
    expect(ids(menu)).not.toContain("play:start:launch"); // not proposed again
  });

  it("every plan step resolves to a real mission for every demo Boss", async () => {
    const h = harness();
    for (const id of ["boss_ana", "boss_bruno", "boss_carla", "boss_diego"]) {
      const boss = (await h.platform.getBoss(id))!;
      const ctx = h.ctx(boss);
      const state = await h.store.getCoachState(id);
      for (const pb of PLAYBOOKS) for (const step of pb.steps) expect(step.mission(ctx, state), `${pb.id}/${step.title}`).toMatch(/^[a-z_]+$/);
    }
  });
});

describe("campaigns", () => {
  it("proposes the campaign that fits the Boss and runs it day by day", async () => {
    const h = harness();
    const [menu] = await h.text(PHONES.carla, "hi");
    expect(ids(menu)[0]).toBe("play:start:comeback_week"); // 128 inactive players → bring them back first

    const [list] = await h.tap(PHONES.carla, "play:menu");
    expect(ids(list)).toEqual(["play:start:comeback_week", "play:start:friend_week", "play:start:channel_week"]);

    const started = await h.tap(PHONES.carla, "play:start:comeback_week");
    expect(textOf(started[1])).toContain("Comeback week* · Day 1 of 3");
    expect(textOf(started[1])).toContain("Message 5 of your players who weren't active this week");
    expect(textOf(started[2])).toContain("Haven't seen you around *Carla Kingdom*");
    const [menu2] = await h.text(PHONES.carla, "menu");
    expect(ids(menu2)[0]).toBe("play:today");
    expect(textOf(menu2)).toContain("Comeback week · day 1 of 3");

    const [stopped] = await h.tap(PHONES.carla, "play:stop");
    expect(textOf(stopped)).toContain("Plan paused");
    expect((await h.store.getCoachState("boss_carla")).playbook?.status).toBe("stopped");
  });
});

describe("channels", () => {
  it("shows what's open, leads to the next channel, and remembers it once the guide is done", async () => {
    const h = harness();
    const [channels] = await h.text(PHONES.carla, "channels");
    expect(textOf(channels)).toContain("🤖 📸 Instagram · your AI Agent posts here");
    expect(textOf(channels)).toContain("⬜ ✈️ Telegram channel");
    expect(textOf(channels)).toContain("*Next: ✈️ Telegram channel.*");
    expect(ids(channels)).toEqual(["guide:open_telegram", "menu:ai_agent", "menu:main"]);

    await h.tap(PHONES.carla, "guide:open_telegram");
    await h.tap(PHONES.carla, "guide_step:done");
    await h.tap(PHONES.carla, "guide_step:done");
    const [success] = await h.tap(PHONES.carla, "guide_step:done");
    expect(textOf(success)).toContain("Your Telegram channel is live");
    expect((await h.store.getCoachState("boss_carla")).channels.telegram).toBe(h.now().toISOString());

    const [again] = await h.text(PHONES.carla, "channels");
    expect(textOf(again)).toContain("✅ ✈️ Telegram channel");
    expect(textOf(again)).toContain("*Next: 📘 Facebook groups.*");
  });

  it("marks WhatsApp status and groups as in use when those missions are done", async () => {
    const h = harness();
    await h.tap(PHONES.carla, "play:start:comeback_week");
    await h.tap(PHONES.carla, "play:next"); // day 2: share_status
    await h.tap(PHONES.carla, "mission:done");
    expect(Object.keys((await h.store.getCoachState("boss_carla")).channels)).toEqual(["whatsapp_status"]);
  });
});

describe("texts", () => {
  it("has every text ready: invites by audience, welcome, referral, follow-up, comeback", async () => {
    const h = harness();
    const [menu] = await h.text(PHONES.ana, "texts");
    expect(ids(menu)).toEqual(["invite:family", "invite:friends", "invite:work", "invite:community", "invite:online", "invite:welcome", "invite:referral", "invite:followup", "invite:comeback", "post:write"]);
    const welcome = await h.tap(PHONES.ana, "invite:welcome");
    expect(textOf(welcome[0])).toContain("Welcome text for a new player");
    expect(textOf(welcome[1])).toContain("Welcome to *Ana Arena*!");
    const [, work] = await h.tap(PHONES.ana, "invite:work");
    expect(textOf(work)).toContain("Outside of work I've started my own project: *Ana Arena*");
    expect((await h.store.getCoachState("boss_ana")).audiences).toEqual(["work"]);
  });

  it("recognizes audiences in free text, even outside the sprint", async () => {
    expect(matchAudiences("my football team and a few cousins").map((a) => a.id)).toEqual(["family", "community"]);
    expect(matchAudiences("nobody really")).toEqual([]);
    const h = harness();
    const out = await h.text(PHONES.diego, "I could send it to my gym buddies"); // gym → groups, buddies → friends
    expect(textOf(out[0])).toContain("Your invites");
    expect(out).toHaveLength(4);
    expect(textOf(out[1])).toContain("*Diego Den*");
    expect(textOf(out[2])).toContain("*Diego Den*");
    expect((await h.store.getCoachState("boss_diego")).audiences).toEqual(["friends", "community"]);
  });

  it("uses Claude's invite in the Boss's voice when available", async () => {
    const assistant: Assistant = { answer: vi.fn(async () => null), writePosts: vi.fn(async () => null), writeInvite: vi.fn(async () => "Oi família! Entrem no *Ana Arena*: {link} 💛") };
    const h = harness({ assistant });
    const [, invite] = await h.tap(PHONES.ana, "invite:family");
    expect(textOf(invite)).toBe("Oi família! Entrem no *Ana Arena*: [your brand link] 💛");
    expect(vi.mocked(assistant.writeInvite!).mock.calls[0]![0].audience).toContain("Parents, siblings");
  });
});

describe("earnings math", () => {
  it("parses amounts the way people type them", () => {
    expect(["300", "$1,000", "1k", "2.5k", "I want 500 a month", "nothing"].map(parseAmount)).toEqual([300, 1000, 1000, 2500, 500, null]);
  });

  it("turns a monthly target into players, from the Boss's own numbers", async () => {
    const h = harness();
    const carla = h.ctx((await h.platform.getBoss("boss_carla"))!);
    const insights = { ...(await h.app.coach.view(carla, { readOnly: true })).insights };
    const m = moneyMath(carla, insights, 5000);
    expect(m).toMatchObject({ kind: "estimate", activeNeeded: 227, activeNow: 120, playersToBring: 222, alreadyThere: false });

    const [ask] = await h.text(PHONES.carla, "how much can I earn");
    expect(ids(ask)).toEqual(["money:100", "money:300", "money:1000"]);
    expect(textOf(ask)).toContain("$100");
    const [answer] = await h.text(PHONES.carla, "5000"); // typed, not tapped
    expect(textOf(answer)).toContain("$5,000 a month from Carla Kingdom");
    expect(textOf(answer)).toContain("about *227 active players*");
    expect(textOf(answer)).toContain("bring about 222 more players");
    expect(ids(answer)).toEqual(["goal:accept", "mission:today", "menu:main"]);
    const [goal] = await h.tap(PHONES.carla, "goal:accept");
    expect(textOf(goal)).toContain("Goal locked in!");
    expect((await h.store.getCoachState("boss_carla")).goal).toMatchObject({ metric: "earnings", target: 5000, status: "active" });

    const [already] = await h.tap(PHONES.carla, "money:1000");
    expect(textOf(already)).toContain("You're already there");
    expect(textOf(already)).toContain("Let's aim higher: *$1,500*");
  });

  it("tells a new Boss what it needs before it can calculate, and points to the sprint", async () => {
    const h = harness();
    const [m] = await h.tap(PHONES.ana, "money:300");
    expect(textOf(m)).toContain("I need your first 3 active players");
    expect(ids(m)).toEqual(["goal:accept", "play:start:launch", "menu:main"]);
    expect((await h.store.getCoachState("boss_ana")).pendingGoal).toMatchObject({ metric: "players", target: 5 });
  });

  it("answers 'I want to earn X' typed in the open, without AI", async () => {
    const h = harness();
    const [m] = await h.text(PHONES.diego, "I want to earn 500 a month");
    expect(textOf(m)).toContain("$500 a month from Diego Den");
    expect(textOf(m)).toContain("about *48 active players*");
  });
});

describe("hybrid replies", () => {
  const stub = (a: Partial<AssistantAnswer>): Assistant => ({
    answer: vi.fn(async () => ({ reply: "ok", cta: null, guide: null, escalate: false, buttons: [], actions: NO_ACTIONS, ...a })),
    writePosts: vi.fn(async () => null),
  });

  it("every AI reply ends with the buttons the coach picked, or the default next step", async () => {
    const picked = harness({ assistant: stub({ reply: "Great, send it tonight!", buttons: ["mission:done", "texts:menu"] }) });
    const [m] = await picked.text(PHONES.carla, "I'll message them tonight");
    expect(m?.kind).toBe("buttons");
    expect(ids(m)).toEqual(["mission:done", "texts:menu"]);

    const plain = harness({ assistant: stub({ reply: "Here's the idea." }) });
    expect(ids((await plain.text(PHONES.carla, "give me an idea"))[0])).toEqual(["mission:today", "menu:main"]);
    await plain.tap(PHONES.carla, "play:start:friend_week");
    expect(ids((await plain.text(PHONES.carla, "another idea"))[0])).toEqual(["play:today", "menu:main"]);
  });

  it("the sprint's first day is answerable by typing or tapping", async () => {
    const h = harness();
    await h.tap(PHONES.ana, "play:start:launch");
    const tapped = await h.tap(PHONES.ana, "invite:online");
    expect(textOf(tapped[1])).toContain("It's official 🎉 *Ana Arena* is live");
    expect((await h.store.getState("boss_ana", PHONES.ana)).flow).toBeNull(); // the tap answered the question
  });
});

describe("retention with plans", () => {
  it("the sprint's daily step doesn't count against the weekly reminder budget, but keeps the one-reminder-a-day rule", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    await h.tap(PHONES.ana, "play:start:launch");
    const sent: string[] = [];
    for (let i = 0; i < 7 * 24; i++) {
      h.advance(3_600_000);
      const d = await run(h, "boss_ana");
      if (d.sent) sent.push(`${h.now().toISOString().slice(0, 10)} ${d.sent.trigger}`);
    }
    const steps = sent.filter((s) => s.endsWith("playbook_step"));
    expect(steps).toHaveLength(6); // days 2–7
    expect(new Set(steps.map((s) => s.slice(0, 10))).size).toBe(6); // one per day
    const doneAt = sent.findIndex((s) => s.endsWith("playbook_done"));
    expect(doneAt).toBe(6); // the morning after day 7, right after the six steps
    expect(sent.slice(0, doneAt)).toEqual(steps); // while the plan runs, nothing else asks for the Boss's time
    expect(sent.slice(doneAt + 1).some((s) => s.endsWith("agent_activate"))).toBe(true); // regular coaching resumes afterwards
  });
});

describe("timeline", () => {
  it("MONDAY_NOON is a Monday", () => {
    expect(MONDAY_NOON.getUTCDay()).toBe(1);
  });
});
