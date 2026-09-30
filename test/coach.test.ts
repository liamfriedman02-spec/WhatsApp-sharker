import { describe, expect, it, vi } from "vitest";
import { NO_ACTIONS, userMessage, type Assistant, type AssistantAnswer } from "../src/ai/assistant.js";
import { goalView, proposeGoal, roundNice, startGoal } from "../src/coach/goals.js";
import { computeInsights } from "../src/coach/insights.js";
import { contentCtx } from "../src/content/context.js";
import { levelView, nextLevelNeeds } from "../src/content/levels.js";
import { MISSIONS, pickMission } from "../src/content/missions.js";
import { demoBosses, makeBoss } from "../src/platform/mockPlatform.js";
import { HUB, MONDAY_NOON, PHONES, harness, ids, textOf, type Harness } from "./helpers.js";

const DAY = 86_400_000;
const bosses = Object.fromEntries(demoBosses(MONDAY_NOON.getTime()).map((b) => [b.id, b]));
const ctxOf = (id: string, now = MONDAY_NOON) => contentCtx(bosses[id]!, { now, hubUrl: HUB, defaultTimezone: "UTC" });

async function coachState(h: Harness, bossId: string) {
  return h.store.getCoachState(bossId);
}

describe("insights", () => {
  it("compares this week with last week and finds the money in inactive players", () => {
    const ctx = ctxOf("boss_carla");
    const insights = computeInsights(ctx, [{ date: "2026-09-21", totalPlayers: 217, newPlayersToday: 3, newPlayers7d: 25, activePlayers7d: 110, earningsTotal: 4208, earnings7d: 540 }], "2026-09-28");
    expect(insights.newPlayers).toEqual({ current: 31, previous: 25, changePct: 24 });
    expect(insights.earnings.changePct).toBe(13);
    expect(insights.inactivePlayers).toBe(128);
    expect(insights.earningsPerActive).toBeCloseTo(5.1025, 3);
    const ids = insights.tips.map((t) => t.id);
    expect(ids).toContain("reactivation_value");
    expect(ids).toContain("players_up");
    expect(insights.tips.find((t) => t.id === "reactivation_value")!.text).toContain("could mean about +$51.03 a week");
  });

  it("flags drops, a missing Agent and a brand with no players", () => {
    const ana = computeInsights(ctxOf("boss_ana"), [], "2026-09-28");
    expect(ana.tips.map((t) => t.id)).toEqual(["no_players", "agent_missing", "no_history"]);
    const diego = computeInsights(ctxOf("boss_diego"), [{ date: "2026-09-21", totalPlayers: 38, newPlayersToday: 1, newPlayers7d: 10, activePlayers7d: 15, earningsTotal: 507.9, earnings7d: 60 }], "2026-09-28");
    expect(diego.tips[0]?.id).toBe("players_down");
    expect(diego.tips[0]?.text).toContain("down 70%");
  });
});

describe("goals", () => {
  it("proposes a stretching goal from the Boss's own pace", () => {
    const empty = computeInsights(ctxOf("boss_ana"), [], "2026-09-28");
    expect(proposeGoal(bosses.boss_ana!, empty, MONDAY_NOON)).toMatchObject({ metric: "players", target: 5, days: 14 });
    const bruno = computeInsights(ctxOf("boss_bruno"), [], "2026-09-28");
    expect(proposeGoal(bosses.boss_bruno!, bruno, MONDAY_NOON)).toMatchObject({ metric: "players", target: 10, days: 28 });
    const carla = computeInsights(ctxOf("boss_carla"), [], "2026-09-28");
    expect(proposeGoal(bosses.boss_carla!, carla, MONDAY_NOON)).toMatchObject({ metric: "earnings", target: 3100, days: 28 });
    expect([7, 23, 147, 1234].map(roundNice)).toEqual([7, 25, 150, 1200]);
  });

  it("tracks pace: ahead, on track, behind, achieved, expired", () => {
    const start = new Date(MONDAY_NOON.getTime() - 10 * DAY);
    const base = makeBoss({ id: "g", phone: "1", stats: { totalPlayers: 100 } });
    const goal = startGoal(base, "players", 28, 28, start); // needs 1/day
    const at = (players: number, now = MONDAY_NOON) => goalView(goal, { ...base, stats: { ...base.stats, totalPlayers: players } }, now);
    expect(at(115).status).toBe("ahead");
    expect(at(110).status).toBe("on_track");
    expect(at(104).status).toBe("behind");
    expect(at(128).status).toBe("achieved");
    expect(at(110, new Date(start.getTime() + 30 * DAY)).status).toBe("expired");
    expect(at(110).label).toBe("10/28 new players");
    expect(at(110).neededPerDay).toBeCloseTo(1, 1);
  });
});

describe("levels", () => {
  it("places each demo Boss on the ladder and says what's missing", () => {
    expect(levelView(bosses.boss_ana!).current?.name).toBe("Starter");
    expect(nextLevelNeeds(levelView(bosses.boss_ana!))).toBe("AI Agent live and your first player");
    expect(levelView(bosses.boss_bruno!).current?.name).toBe("Starter");
    expect(levelView(bosses.boss_carla!).current?.name).toBe("Elite");
    expect(levelView(bosses.boss_diego!).current?.name).toBe("Starter"); // Agent not live blocks Rising
  });
});

describe("mission picker", () => {
  const pick = (id: string, extra: Partial<Parameters<typeof pickMission>[0]> = {}) => {
    const ctx = ctxOf(id);
    return pickMission({ ctx, insights: computeInsights(ctx, [], "2026-09-28"), goalMetric: null, history: [], ...extra });
  };

  it("always pushes the most valuable next action", () => {
    expect(pick("boss_ana").id).toBe("activate_agent");
    expect(pick("boss_bruno").id).toBe("connect_socials");
    expect(pick("boss_carla").id).toBe("reengage_players");
  });

  it("respects cooldowns and one-time missions", () => {
    const history = [
      { id: 1, bossId: "boss_carla", missionId: "reengage_players", date: "2026-09-27", status: "done" as const, assignedAt: new Date(MONDAY_NOON.getTime() - DAY).toISOString(), completedAt: null },
    ];
    expect(pick("boss_carla", { history }).id).not.toBe("reengage_players");
    const bio = [{ ...history[0]!, missionId: "bio_link", date: "2026-08-01", assignedAt: "2026-08-01T10:00:00Z" }];
    const newBoss = makeBoss({ id: "n", phone: "9", stats: { totalPlayers: 3, newPlayers7d: 1 }, aiAgent: { activated: true, connectedSocials: ["instagram"] } });
    const ctx = contentCtx(newBoss, { now: MONDAY_NOON, hubUrl: HUB, defaultTimezone: "UTC" });
    const insights = computeInsights(ctx, [], "2026-09-28");
    expect(pickMission({ ctx, insights, goalMetric: null, history: [] }).id).toBe("share_groups");
    expect(pickMission({ ctx, insights, goalMetric: null, history: bio }).id).not.toBe("bio_link");
  });

  it("every mission's task and why are single lines (template variables)", () => {
    for (const m of MISSIONS) {
      expect(m.task).toMatch(/^[^\n]+$/);
      expect(m.why).toMatch(/^[^\n]+$/);
    }
  });
});

describe("coaching conversation", () => {
  it("gives today's mission, checks it on the live account, and rewards it", async () => {
    const h = harness();
    const [mission] = await h.text(PHONES.ana, "mission");
    expect(textOf(mission)).toContain("Activate your AI Marketing Agent");
    expect(ids(mission)).toEqual(["mission:done", "guide:activate_agent", "mission:skip"]);

    const [notYet] = await h.tap(PHONES.ana, "mission:done");
    expect(textOf(notYet)).toContain("don't see");

    h.platform.update("boss_ana", { aiAgent: { activated: true } });
    const [done] = await h.tap(PHONES.ana, "mission:done");
    expect(textOf(done)).toContain("Mission complete!* +50 points");
    expect(textOf(done)).toContain("1 mission in a row");
    expect(await coachState(h, "boss_ana")).toMatchObject({ points: 50, streak: 1 });

    const [again] = await h.tap(PHONES.ana, "mission:today");
    expect(textOf(again)).toContain("Today's mission is done");
    const [bonus] = await h.tap(PHONES.ana, "mission:bonus");
    expect(textOf(bonus)).toContain("Bonus mission");
    expect(textOf(bonus)).toContain("Connect at least one social account");
  });

  it("builds a streak over days and resets it when a mission is skipped", async () => {
    const h = harness();
    for (let day = 0; day < 3; day++) {
      await h.tap(PHONES.carla, "mission:today");
      await h.tap(PHONES.carla, "mission:done");
      h.advance(DAY);
    }
    expect((await coachState(h, "boss_carla")).streak).toBe(3);
    await h.tap(PHONES.carla, "mission:today");
    const [other] = await h.tap(PHONES.carla, "mission:skip");
    expect(textOf(other)).toContain("try this one instead");
    expect((await coachState(h, "boss_carla")).streak).toBe(0);
  });

  it("finishing a guide completes the matching mission", async () => {
    const h = harness();
    await h.tap(PHONES.bruno, "mission:today"); // connect_socials
    await h.tap(PHONES.bruno, "guide:connect_socials");
    await h.tap(PHONES.bruno, "guide_step:done");
    await h.tap(PHONES.bruno, "guide_step:done");
    h.platform.update("boss_bruno", { aiAgent: { connectedSocials: ["tiktok"] } });
    const out = await h.tap(PHONES.bruno, "guide_step:done");
    expect(out.map(textOf).join("\n")).toContain("Today's mission done too! +50 points");
  });

  it("proposes, adjusts, locks in and celebrates a goal", async () => {
    const h = harness();
    const [proposal] = await h.tap(PHONES.bruno, "goal:new");
    expect(textOf(proposal)).toContain("*10 new players by Oct 26*");
    const [higher] = await h.tap(PHONES.bruno, "goal:higher");
    expect(textOf(higher)).toContain("*15 new players by Oct 26*");
    const [set] = await h.tap(PHONES.bruno, "goal:accept");
    expect(textOf(set)).toContain("Goal locked in!");
    expect((await coachState(h, "boss_bruno")).goal).toMatchObject({ metric: "players", target: 15, startValue: 2, status: "active" });

    h.advance(10 * DAY);
    h.platform.update("boss_bruno", { stats: { totalPlayers: 12 } });
    const [progress] = await h.tap(PHONES.bruno, "coach:progress");
    expect(textOf(progress)).toContain("10/15 new players");
    expect(textOf(progress)).toContain("ahead of pace");

    h.platform.update("boss_bruno", { stats: { totalPlayers: 17 } });
    const [celebration, progress2] = await h.tap(PHONES.bruno, "coach:progress");
    expect(textOf(celebration)).toContain("Goal reached, Bruno!");
    expect(textOf(progress2)).toContain("reached 🏆");
    expect((await coachState(h, "boss_bruno")).goal?.status).toBe("achieved");
  });

  it("writes ready-to-post texts (with the brand link when known)", async () => {
    const h = harness();
    h.platform.update("boss_carla", { brandUrl: "https://carla.example/join" });
    const out = await h.text(PHONES.carla, "write me a post");
    expect(out).toHaveLength(5);
    expect(textOf(out[1])).toContain("https://carla.example/join");
    expect(ids(out[4])).toContain("post:write");

    const noLink = await h.tap(PHONES.ana, "post:write");
    expect(textOf(noLink[1])).toContain("[your brand link]");
    expect(textOf(noLink[4])).toContain("replace [your brand link]");
  });

  it("lets the Boss choose how hard the coach pushes", async () => {
    const h = harness();
    const [settings] = await h.text(PHONES.ana, "settings");
    expect(ids(settings)).toContain("settings:coach:intense");
    await h.tap(PHONES.ana, "settings:coach:intense");
    expect((await coachState(h, "boss_ana")).intensity).toBe("intense");
  });
});

describe("AI coach actions", () => {
  const coachAnswer = (a: Partial<AssistantAnswer>): AssistantAnswer => ({ reply: "Let's go!", cta: null, guide: null, escalate: false, actions: NO_ACTIONS, ...a });

  it("sets goals, remembers, schedules check-ins and completes missions from the conversation", async () => {
    const assistant: Assistant = {
      answer: vi.fn(async () =>
        coachAnswer({
          actions: {
            setGoal: { metric: "players", target: 40, days: 30 },
            remember: ["Audience: university friends"],
            followUp: { hours: 20, reason: "share your link in 3 groups" },
            missionDone: true,
          },
        }),
      ),
      writePosts: vi.fn(async () => ["one {link}", "two", "three"]),
    };
    const h = harness({ assistant });
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    await h.tap(PHONES.carla, "mission:today");
    const out = await h.text(PHONES.carla, "ok 40 players this month, I'll share in 3 groups tonight. did the mission btw");
    const confirm = textOf(out.at(-1));
    expect(confirm).toContain("Goal saved: *40 new players by Oct 28*");
    expect(confirm).toContain("Mission done: +20 points");
    expect(confirm).toContain("I'll check in with you tomorrow");

    const state = await coachState(h, "boss_carla");
    expect(state.goal).toMatchObject({ metric: "players", target: 40 });
    expect(state.notes.map((n) => n.text)).toEqual(["Audience: university friends"]);
    expect(state.followUps[0]).toMatchObject({ status: "pending", reason: "share your link in 3 groups" });

    // The coach checks in when it's due (template, since the window may have closed).
    h.advance(25 * 3_600_000);
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_carla"))!);
    expect(d.sent?.trigger).toBe("follow_up");
    const msg = h.messenger.to(PHONES.carla).at(-1);
    expect(msg?.kind === "template" && msg.bodyParams).toEqual(["Carla", "share your link in 3 groups"]);
    expect((await coachState(h, "boss_carla")).followUps[0]?.status).toBe("sent");
    const [reply] = await h.tap(PHONES.carla, "followup:done");
    expect(textOf(reply)).toContain("Love it, Carla!");

    // AI-written posts are used when available.
    const posts = await h.tap(PHONES.carla, "post:write");
    expect(textOf(posts[1])).toContain("one [your brand link]");
  });

  it("sends the coach data to Claude", () => {
    const ctx = ctxOf("boss_carla");
    ctx.coach = {
      state: { intensity: "intense", goal: null, pendingGoal: null, level: 5, points: 120, streak: 4, lastMissionDoneAt: null, notes: [{ text: "Posts mostly on TikTok", at: "" }], followUps: [] },
      insights: computeInsights(ctx, [], "2026-09-28"),
      level: levelView(ctx.boss),
      goal: null,
      today: "2026-09-28",
      todayMission: null,
      history: [],
    };
    const text = userMessage({ ctx, question: "how do I grow?", history: [], flow: null });
    expect(text).toContain("<coach_data>");
    expect(text).toContain("Coaching intensity: intense");
    expect(text).toContain("Level: 👑 Elite");
    expect(text).toContain("Streak: 4 missions in a row; points: 120");
    expect(text).toContain("- Posts mostly on TikTok");
    expect(text).toContain("Earnings per active player this week: about $5.10");
  });
});

describe("proactive coaching", () => {
  const DAY_MS = DAY;
  async function sim(h: Harness, bossId: string, days: number) {
    const sent: { at: Date; trigger: string; template: string }[] = [];
    for (let i = 0; i < days * 24; i++) {
      const d = await h.app.retention.runForBoss((await h.platform.getBoss(bossId))!);
      if (d.sent) sent.push({ at: h.now(), trigger: d.sent.trigger, template: d.sent.template });
      h.advance(3_600_000);
    }
    return sent;
  }

  it("sends missions on the Boss's chosen rhythm and makes them today's mission", async () => {
    const counts: Record<string, number> = {};
    for (const intensity of ["light", "standard", "intense"] as const) {
      const h = harness();
      const state = await h.store.getCoachState("boss_carla");
      await h.store.saveCoachState("boss_carla", { ...state, intensity });
      await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
      const sent = await sim(h, "boss_carla", 14);
      counts[intensity] = sent.filter((s) => s.trigger === "daily_mission").length;
      if (intensity === "standard") {
        const firstMission = sent.find((s) => s.trigger === "daily_mission")!;
        expect([2, 4]).toContain(firstMission.at.getUTCDay());
        const assigned = await h.store.missionsSince("boss_carla", "2026-09-28");
        expect(assigned.length).toBeGreaterThan(0);
      }
    }
    expect(counts.light).toBe(0);
    expect(counts.standard).toBeGreaterThanOrEqual(3);
    expect(counts.intense).toBeGreaterThan(counts.standard!);
  });

  it("the mission template's Done button completes that exact mission", async () => {
    const h = harness({ now: new Date("2026-09-29T12:00:00Z") }); // Tuesday
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "weekly_coaching", category: "digest", channel: "template", step: 0, messageId: null, sentAt: "2026-09-28T13:00:00.000Z" });
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_carla"))!);
    expect(d.sent?.trigger).toBe("daily_mission");
    const tpl = h.messenger.to(PHONES.carla).at(-1);
    expect(tpl?.kind === "template" && tpl.bodyParams[1]).toBe("Message 5 of your players who weren't active this week and invite them back.");
    const [done] = await h.tap(PHONES.carla, "mission:done");
    expect(textOf(done)).toContain("Mission complete!* +20 points");
  });

  it("celebrates a level up once when the Boss climbs", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_bruno", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    await h.app.retention.runForBoss((await h.platform.getBoss("boss_bruno"))!, { dryRun: false }); // initializes the level silently
    h.platform.update("boss_bruno", { aiAgent: { connectedSocials: ["instagram"] } }); // → Rising
    h.advance(4 * 3_600_000);
    const sent = await sim(h, "boss_bruno", 3);
    expect(sent.filter((s) => s.trigger === "level_up")).toHaveLength(1);
    const msg = h.messenger.sent.find((s) => s.message.kind === "template" && s.message.name === "boss_level_up")?.message;
    expect(msg?.kind === "template" && msg.bodyParams.slice(2)).toEqual(["🚀 Rising", "10 players (2/10)"]);
  });

  it("celebrates a best-ever day, and alerts once when new players drop", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_diego", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    for (let i = 1; i <= 8; i++) {
      const date = new Date(MONDAY_NOON.getTime() - i * DAY_MS).toISOString().slice(0, 10);
      await h.store.saveSnapshot("boss_diego", { date, totalPlayers: 38, newPlayersToday: 2, newPlayers7d: 10, activePlayers7d: 15, earningsTotal: 500, earnings7d: 60 });
    }
    h.platform.update("boss_diego", { lastActiveAt: MONDAY_NOON.toISOString(), aiAgent: { activated: true, connectedSocials: ["instagram"] } });
    h.platform.update("boss_diego", { stats: { newPlayersToday: 6 } });
    const best = await h.app.retention.runForBoss((await h.platform.getBoss("boss_diego"))!);
    expect(best.sent?.trigger).toBe("best_day");

    h.platform.update("boss_diego", { stats: { newPlayersToday: 0 } });
    const sent = await sim(h, "boss_diego", 10);
    expect(sent.filter((s) => s.trigger === "momentum_drop")).toHaveLength(1);
  });

  it("proposes a goal to engaged Bosses without one — at most weekly, never on light", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    const sent = await sim(h, "boss_carla", 14);
    const proposals = sent.filter((s) => s.trigger === "goal_proposal");
    expect(proposals.length).toBeGreaterThanOrEqual(1);
    expect(proposals.length).toBeLessThanOrEqual(2);
    expect((await h.store.getCoachState("boss_carla")).pendingGoal).toMatchObject({ metric: "earnings" });

    const light = harness();
    await light.store.saveCoachState("boss_carla", { ...(await light.store.getCoachState("boss_carla")), intensity: "light" });
    const lightSent = await sim(light, "boss_carla", 14);
    expect(lightSent.some((s) => s.trigger === "goal_proposal" || s.trigger === "daily_mission")).toBe(false);
  });
});
