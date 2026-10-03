import { describe, expect, it, vi } from "vitest";
import { NO_ACTIONS, type Assistant, type AssistantAnswer } from "../src/ai/assistant.js";
import { moneyMath, parseAmount } from "../src/coach/money.js";
import { matchAudiences } from "../src/content/invites.js";
import { getMission } from "../src/content/missions.js";
import { PLAYBOOKS } from "../src/content/playbooks.js";
import type { LogSupportDesk } from "../src/bot/handoff.js";
import { MONDAY_NOON, PHONES, harness, ids, textOf, type Harness } from "./helpers.js";

const DAY = 86_400_000;
const WELCOME_SENT = { trigger: "welcome", category: "milestone" as const, channel: "template" as const, step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" };

async function run(h: Harness, bossId: string) {
  return h.app.retention.runForBoss((await h.platform.getBoss(bossId))!);
}

/** Starts the launch program and answers the three onboarding questions; returns the last replies (plan + day 1). */
async function onboard(h: Harness, phone: string, answers: { time?: string; social?: string; hour?: string } = {}) {
  await h.tap(phone, "play:start:launch");
  await h.tap(phone, `onb:time:${answers.time ?? "10"}`);
  await h.tap(phone, `onb:social:${answers.social ?? "none"}`);
  return h.tap(phone, `onb:hour:${answers.hour ?? "9"}`);
}

describe("launch program", () => {
  it("starts with a short chat: how the money works, three questions (typed or tapped), then the plan and day 1", async () => {
    const h = harness();
    const [home] = await h.text(PHONES.ana, "hi");
    expect(ids(home)[0]).toBe("play:start:launch");
    expect(textOf(home)).toContain("Launch program");

    const [offer] = await h.text(PHONES.ana, "sprint");
    expect(textOf(offer)).toContain("Launch program");
    expect(ids(offer)).toEqual(["play:start:launch", "mission:today", "menu:main"]);

    const [welcome, q1] = await h.tap(PHONES.ana, "play:start:launch");
    expect(textOf(welcome)).toContain("Welcome to your launch program, Ana!");
    expect(textOf(welcome)).toContain("you earn from their activity");
    expect(ids(q1)).toEqual(["onb:time:10", "onb:time:30", "onb:time:60"]);
    expect((await h.store.getCoachState("boss_ana")).playbook).toMatchObject({ id: "launch", step: 0, status: "active", missed: 0 });

    const [q2] = await h.text(PHONES.ana, "half an hour"); // typed instead of tapped
    expect(ids(q2)).toEqual(["onb:social:instagram", "onb:social:tiktok", "onb:social:both", "onb:social:none"]);
    const [q3] = await h.text(PHONES.ana, "only insta");
    expect(ids(q3)).toEqual(["onb:hour:9", "onb:hour:13", "onb:hour:18"]);
    const [overview, day1, who] = await h.tap(PHONES.ana, "onb:hour:18");

    const prefs = (await h.store.getCoachState("boss_ana")).prefs;
    expect(prefs).toMatchObject({ minutesPerDay: 30, socials: ["instagram"], preferredHour: 18 });
    expect(prefs.onboardedAt).toBe(h.now().toISOString());
    expect(textOf(overview)).toContain("Every evening I bring you one step");
    expect(textOf(overview)).toContain("1. Your first 5 players");
    expect(textOf(overview)).toContain("10. Your plan for the month");
    expect(textOf(day1)).toContain("Day 1 of 10");
    expect(textOf(day1)).toContain("💡 You earn from your players' activity");
    expect(ids(who)).toEqual(["invite:family", "invite:friends", "invite:work", "invite:community", "invite:online"]);

    // Day 1 by typing: who's around → invites → "sent it" finishes the day and says what tomorrow brings.
    const invites = await h.text(PHONES.ana, "my football team and a few cousins");
    expect(textOf(invites[1])).toContain("*Ana Arena*");
    const [done] = await h.text(PHONES.ana, "sent it");
    expect(textOf(done)).toContain("Day 1 of 10 done! +20 points");
    expect(textOf(done)).toContain("Tomorrow I bring day 2: *Your Instagram page*");
    expect(ids(done)).toEqual(["play:next", "coach:progress", "menu:main"]);

    // Day 2 knows Ana already has Instagram: no "open it", make it sell.
    const day2 = await h.tap(PHONES.ana, "play:next");
    expect(textOf(day2[0])).toContain("You already have Instagram");
    expect(textOf(day2[0])).toContain("Add your brand link to your Instagram and TikTok bio");
    expect(ids(day2.at(-1))).toEqual(["mission:done", "texts:menu", "stuck:menu"]);
  });

  it("opens the social pages with the Boss, step by step, and teaches why", async () => {
    const h = harness();
    await onboard(h, PHONES.ana);
    await h.tap(PHONES.ana, "invite:friends");
    await h.tap(PHONES.ana, "mission:done");
    const day2 = await h.tap(PHONES.ana, "play:next");
    expect(textOf(day2[0])).toContain("*Your Instagram page*");
    expect(textOf(day2[0])).toContain("💡 Your Instagram page is your shop window");
    expect(textOf(day2[0])).toContain("Open an Instagram page for your brand");
    expect(textOf(day2[0])).toContain("2-minute version counts too: create the account with your brand name");
    expect(ids(day2.at(-1))).toEqual(["mission:done", "guide:open_instagram", "stuck:menu"]);

    const [intro, step1] = await h.tap(PHONES.ana, "guide:open_instagram");
    expect(textOf(intro)).toContain("open Instagram for your brand");
    expect(textOf(step1)).toContain("(1/3)");
    await h.tap(PHONES.ana, "guide_step:done");
    await h.tap(PHONES.ana, "guide_step:done");
    const out = await h.tap(PHONES.ana, "guide_step:done");
    expect(out.map(textOf).join("\n")).toContain("Today's mission done too! +25 points");
    expect((await h.store.getCoachState("boss_ana")).channels.instagram).toBeDefined();

    const day4 = await h.tap(PHONES.ana, "play:next"); // day 3, the Agent
    expect(textOf(day4[0])).toContain("Day 3 of 10");
    expect(ids(day4.at(-1))).toEqual(["mission:done", "guide:activate_agent", "stuck:menu"]);
  });

  it("brings the next day at the Boss's hour, with the day's lesson", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    await onboard(h, PHONES.ana, { hour: "18" });
    await h.tap(PHONES.ana, "invite:friends");
    await h.tap(PHONES.ana, "mission:done");

    h.advance(DAY); // Tuesday 12:00: too early for an evening Boss
    expect((await run(h, "boss_ana")).candidates.map((c) => c.trigger)).not.toContain("playbook_step");
    h.advance(6 * 3_600_000); // 18:00
    const d = await run(h, "boss_ana");
    expect(d.sent?.trigger).toBe("playbook_step");
    const tpl = h.messenger.to(PHONES.ana).at(-1);
    expect(tpl?.kind === "template" && tpl.name).toBe("boss_playbook_step");
    expect(tpl?.kind === "template" && tpl.bodyParams).toEqual([
      "Launch program",
      "2 of 10",
      "Your Instagram page is your shop window. People look at it before they join. Your brand name, one clear line and your link turn a visit into a player.",
      "Open an Instagram page for your brand, with your brand link in the bio.",
    ]);
    expect((await h.store.getCoachState("boss_ana")).playbook).toMatchObject({ step: 1, stepDate: "2026-09-29", missed: 0 });
    expect((await h.store.missionsSince("boss_ana", "2026-09-29")).map((m) => m.missionId)).toEqual(["open_instagram"]);
  });

  it("never skips an undone step: still waiting → what's in the way → pause and tell the team; a message brings it back", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    await onboard(h, PHONES.ana); // and then goes quiet
    const sentNames = async () => {
      h.advance(DAY);
      const d = await run(h, "boss_ana");
      const last = h.messenger.to(PHONES.ana).at(-1);
      return { trigger: d.sent?.trigger, name: last?.kind === "template" ? last.name : null, params: last?.kind === "template" ? last.bodyParams : [] };
    };

    const tue = await sentNames();
    expect(tue).toMatchObject({ trigger: "playbook_step", name: "boss_playbook_retry" });
    expect(tue.params).toEqual(["Ana", "Launch program", "1 of 10", "Your first 5 players", "send your invite to just one person you trust"]);
    expect((await h.store.getCoachState("boss_ana")).playbook).toMatchObject({ step: 0, missed: 1, status: "active" });

    expect(await sentNames()).toMatchObject({ trigger: "playbook_step", name: "boss_playbook_stuck" });
    const desk = h.supportDesk as LogSupportDesk;
    expect(desk.events).toEqual([]);

    expect(await sentNames()).toMatchObject({ trigger: "playbook_step", name: "boss_playbook_paused" });
    expect((await h.store.getCoachState("boss_ana")).playbook?.status).toBe("paused");
    expect(desk.events).toEqual([expect.objectContaining({ event: "boss.at_risk", boss: expect.objectContaining({ id: "boss_ana" }) })]);
    expect((desk.events[0] as { reason: string }).reason).toContain('day 1 of Launch program ("Your first 5 players")');

    const fri = await sentNames();
    expect(fri.trigger).not.toBe("playbook_step"); // paused: no more plan messages

    // Ana writes again: welcome back, same place, ladder reset.
    const [back, home] = await h.text(PHONES.ana, "hey");
    expect(textOf(back)).toContain("Welcome back, Ana!");
    expect(textOf(back)).toContain("day 1 of your launch program, *Your first 5 players*");
    expect(ids(home)[0]).toBe("play:today");
    expect((await h.store.getCoachState("boss_ana")).playbook).toMatchObject({ status: "active", missed: 0, step: 0 });
  });

  it("checks in once in the evening when the day's step isn't done, and not if the Boss wrote", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    await onboard(h, PHONES.ana); // Monday 12:00
    h.advance(6.5 * 3_600_000); // 18:30
    const d = await run(h, "boss_ana");
    expect(d.sent?.trigger).toBe("plan_checkin");
    const msg = h.messenger.to(PHONES.ana).at(-1); // she wrote today, so it's the interactive version
    expect(textOf(msg)).toContain("Quick check, Ana");
    expect(textOf(msg)).toContain("Did you get to today's step: *Your first 5 players*?");
    expect(textOf(msg)).toContain("The 2-minute version counts too: send your invite to just one person you trust.");
    expect(ids(msg)).toEqual(["mission:done", "stuck:menu"]);
    h.advance(3_600_000);
    expect((await run(h, "boss_ana")).candidates.map((c) => c.trigger)).not.toContain("plan_checkin");

    const quiet = harness();
    await quiet.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    await onboard(quiet, PHONES.ana);
    quiet.advance(3 * 3_600_000);
    await quiet.text(PHONES.ana, "what is gcoin"); // talking to us already
    quiet.advance(3.5 * 3_600_000);
    expect((await run(quiet, "boss_ana")).candidates.map((c) => c.trigger)).not.toContain("plan_checkin");
  });

  it("'I'm stuck' finds what's in the way and makes the step easier", async () => {
    const h = harness();
    await onboard(h, PHONES.ana);
    const [menu] = await h.tap(PHONES.ana, "stuck:menu");
    expect(ids(menu)).toEqual(["stuck:time", "stuck:how", "stuck:doubt", "stuck:skip", "handoff:start"]);

    const [tiny] = await h.tap(PHONES.ana, "stuck:time");
    expect(textOf(tiny)).toContain("Just this: *send your invite to just one person you trust*");
    expect((await h.store.getCoachState("boss_ana")).prefs.minutesPerDay).toBe(5);

    const [doubt] = await h.tap(PHONES.ana, "stuck:doubt");
    expect(textOf(doubt)).toContain("You earn from their activity, every time they play");
    expect(textOf(doubt)).toContain("Your first active players will show you your own numbers");

    const skipped = await h.tap(PHONES.ana, "stuck:skip");
    expect(textOf(skipped[0])).toContain("Day 2 of 10");
    const how = await h.tap(PHONES.ana, "stuck:how"); // day 2: opens Instagram together, step by step
    expect(textOf(how[0])).toContain("we do it together");
    expect(textOf(how[2])).toContain("(1/3)");
  });

  it("ends with the plan for the month, then celebrates the whole program", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    const state = await h.store.getCoachState("boss_ana");
    await h.store.saveCoachState("boss_ana", { ...state, intensity: "intense", playbook: { id: "launch", step: 9, stepDate: "2026-09-28", missed: 0, startedAt: "", status: "active" } });

    const day10 = await h.tap(PHONES.ana, "play:today");
    expect(textOf(day10[0])).toContain("Day 10 of 10");
    expect(textOf(day10[0])).toContain("how much you want *Ana Arena* to earn a month");
    expect(ids(day10.at(-1))).toEqual(["mission:done", "money:menu", "stuck:menu"]);
    expect((await run(h, "boss_ana")).candidates.map((c) => c.trigger)).not.toContain("daily_mission");
    const [last] = await h.tap(PHONES.ana, "mission:done");
    expect(textOf(last)).toContain("That was the last day");

    h.advance(DAY);
    const d = await run(h, "boss_ana");
    expect(d.sent?.trigger).toBe("playbook_done");
    const tpl = h.messenger.to(PHONES.ana).at(-1);
    expect(tpl?.kind === "template" && tpl.bodyParams).toEqual(["Launch program", "Ana", "10", "Ana Arena"]);
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
      for (const pb of PLAYBOOKS) for (const step of pb.steps) expect(getMission(step.mission(ctx, state)), `${pb.id}/${step.title}`).toBeDefined();
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

  it("the program's first day is answerable by typing or tapping", async () => {
    const h = harness();
    await onboard(h, PHONES.ana);
    const tapped = await h.tap(PHONES.ana, "invite:online");
    expect(textOf(tapped[1])).toContain("It's official 🎉 *Ana Arena* is live");
    expect((await h.store.getState("boss_ana", PHONES.ana)).flow).toBeNull(); // the tap answered the question
  });
});

describe("retention with plans", () => {
  it("a Boss who does every step gets one step a day, then the celebration, and nothing else asks for their time", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_ana", ...WELCOME_SENT });
    // Ana's Agent and payouts are set, so the checked steps (Agent, payouts) can be done.
    h.platform.update("boss_ana", { aiAgent: { activated: true, connectedSocials: ["instagram"] }, payouts: { methodConfigured: true } });
    await onboard(h, PHONES.ana);
    await h.tap(PHONES.ana, "invite:friends");
    await h.tap(PHONES.ana, "mission:done");
    const sent: string[] = [];
    for (let i = 0; i < 11 * 24; i++) {
      h.advance(3_600_000);
      const d = await run(h, "boss_ana");
      if (!d.sent) continue;
      sent.push(`${h.now().toISOString().slice(0, 10)} ${d.sent.trigger}`);
      if (d.sent.trigger === "playbook_step") await h.tap(PHONES.ana, "mission:done");
    }
    const reminders = sent.filter((s) => !/welcome|first_|agent_live|agent_first_post|level_up|best_day|goal_achieved/.test(s));
    const steps = reminders.filter((s) => s.endsWith("playbook_step"));
    expect(steps).toHaveLength(9); // days 2–10
    expect(new Set(steps.map((s) => s.slice(0, 10))).size).toBe(9); // one per day
    const doneAt = reminders.findIndex((s) => s.endsWith("playbook_done"));
    expect(doneAt).toBe(9);
    expect(reminders.slice(0, doneAt)).toEqual(steps); // no other reminder while the plan runs
    expect(reminders.some((s) => s.endsWith("plan_checkin") || s.endsWith("playbook_retry"))).toBe(false);
    expect((await h.store.getCoachState("boss_ana")).playbook?.status).toBe("done");
  });
});

describe("timeline", () => {
  it("MONDAY_NOON is a Monday", () => {
    expect(MONDAY_NOON.getUTCDay()).toBe(1);
  });
});
