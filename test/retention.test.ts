import { describe, expect, it } from "vitest";
import { makeBoss } from "../src/platform/mockPlatform.js";
import { inQuietHours, localTime } from "../src/util/time.js";
import { MONDAY_NOON, PHONES, harness, type Harness } from "./helpers.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function run(h: Harness, bossId: string) {
  return h.app.retention.runForBoss((await h.platform.getBoss(bossId))!);
}

/** Runs the engine hourly for `days` and returns every nudge sent. */
async function simulate(h: Harness, bossId: string, days: number, onTick?: (i: number) => void) {
  const sent: { at: Date; trigger: string; template: string; step: number }[] = [];
  for (let i = 0; i < Math.round(days * 24); i++) {
    onTick?.(i);
    const d = await run(h, bossId);
    if (d.sent) sent.push({ at: h.now(), trigger: d.sent.trigger, template: d.sent.template, step: d.sent.step });
    h.advance(HOUR);
  }
  return sent;
}

describe("AI Marketing Agent activation funnel", () => {
  it("reminds with different copy each time, growing gaps, and stops after 3", async () => {
    const h = harness();
    const sent = await simulate(h, "boss_ana", 30);
    const activate = sent.filter((s) => s.trigger === "agent_activate");

    expect(sent[0]?.trigger).toBe("welcome");
    expect(activate.map((s) => s.template)).toEqual(["boss_agent_activate_1", "boss_agent_activate_2", "boss_agent_activate_3"]);
    expect(activate[1]!.at.getTime() - activate[0]!.at.getTime()).toBeGreaterThanOrEqual(3 * DAY);
    expect(activate[2]!.at.getTime() - activate[1]!.at.getTime()).toBeGreaterThanOrEqual(7 * DAY);
  });

  it("moves the Boss to the next step and never repeats a completed one", async () => {
    const h = harness();
    // Monday: welcome + first activation reminder.
    let sent = await simulate(h, "boss_ana", 0.5);
    expect(sent.map((s) => s.trigger)).toEqual(["welcome", "agent_activate"]);

    // Boss activates the Agent → next nudge is "connect your socials", activation reminders stop.
    h.platform.update("boss_ana", { aiAgent: { activated: true, activatedAt: h.now().toISOString() } });
    sent = await simulate(h, "boss_ana", 2);
    expect(sent.map((s) => s.template)).toContain("boss_agent_socials_1");
    expect(sent.some((s) => s.trigger === "agent_activate")).toBe(false);
    expect(await h.store.getSeries("boss_ana", "agent_activate")).toBeNull(); // series closed

    // Boss connects Instagram → celebrate "Your AI Agent Is Live" once.
    h.platform.update("boss_ana", { aiAgent: { connectedSocials: ["instagram"] } });
    sent = await simulate(h, "boss_ana", 2);
    expect(sent.filter((s) => s.trigger === "agent_live")).toHaveLength(1);
    expect(sent.some((s) => s.trigger.startsWith("agent_connect"))).toBe(false);

    // First post published → celebrate the Agent's activity.
    h.platform.update("boss_ana", { aiAgent: { postsPublishedTotal: 1, postsPublished7d: 1, lastPostNetwork: "instagram", lastPostAt: h.now().toISOString() } });
    sent = await simulate(h, "boss_ana", 1);
    expect(sent.map((s) => s.trigger)).toContain("agent_first_post");

    // Nothing Agent-related is ever sent again.
    sent = await simulate(h, "boss_ana", 10);
    expect(sent.filter((s) => s.trigger.startsWith("agent_"))).toEqual([]);
  });

  it("the live message names the network the Agent posted on", async () => {
    const h = harness();
    h.platform.update("boss_bruno", { aiAgent: { connectedSocials: ["tiktok"], postsPublishedTotal: 1, lastPostNetwork: "tiktok" } });
    await h.store.recordNudge({ bossId: "boss_bruno", trigger: "agent_live", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: new Date(MONDAY_NOON.getTime() - 2 * DAY).toISOString() });
    await h.store.recordNudge({ bossId: "boss_bruno", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: new Date(MONDAY_NOON.getTime() - 5 * DAY).toISOString() });
    await h.store.recordNudge({ bossId: "boss_bruno", trigger: "first_earnings", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: new Date(MONDAY_NOON.getTime() - 5 * DAY).toISOString() });
    await h.store.recordNudge({ bossId: "boss_bruno", trigger: "first_player", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: new Date(MONDAY_NOON.getTime() - 5 * DAY).toISOString() });
    const d = await run(h, "boss_bruno");
    expect(d.sent?.trigger).toBe("agent_first_post");
    const msg = h.messenger.to(PHONES.bruno).at(-1);
    expect(msg?.kind === "template" && msg.bodyParams).toEqual(["Bruno Club", "TikTok"]);
  });
});

describe("frequency & respect", () => {
  it("per local day: ≤ 2 messages, ≤ 1 reminder/summary; reminders ≥ 12h apart; never in quiet hours", async () => {
    const h = harness();
    const milestones = ["welcome", "first_player", "first_earnings", "agent_live", "agent_first_post", "level_up", "goal_achieved", "best_day"];
    for (const id of ["boss_ana", "boss_bruno", "boss_carla", "boss_diego"]) {
      const tz = (await h.platform.getBoss(id))!.timezone ?? "UTC";
      const sent = await simulate(h, id, 21);
      expect(sent.length).toBeGreaterThan(3);
      const byDay = new Map<string, typeof sent>();
      for (const s of sent) {
        const day = localTime(s.at, tz).date;
        byDay.set(day, [...(byDay.get(day) ?? []), s]);
        expect(inQuietHours(localTime(s.at, tz).hour, 21, 9)).toBe(false);
      }
      for (const day of byDay.values()) {
        expect(day.length).toBeLessThanOrEqual(2);
        expect(day.filter((o) => !milestones.includes(o.trigger)).length).toBeLessThanOrEqual(1);
      }
      const reminders = sent.filter((o) => !milestones.includes(o.trigger));
      for (let i = 1; i < reminders.length; i++) {
        expect(reminders[i]!.at.getTime() - reminders[i - 1]!.at.getTime()).toBeGreaterThanOrEqual(12 * HOUR);
      }
      h.setNow(MONDAY_NOON);
    }
  });

  it("keeps a weekly reminder budget set by the Boss's coaching intensity", async () => {
    const milestones = ["welcome", "first_player", "first_earnings", "agent_live", "agent_first_post", "level_up", "goal_achieved", "best_day"];
    const caps = { light: 2, standard: 4, intense: 7 } as const;
    for (const intensity of ["light", "standard", "intense"] as const) {
      const h = harness();
      await h.store.saveCoachState("boss_ana", { ...(await h.store.getCoachState("boss_ana")), intensity });
      const sent = (await simulate(h, "boss_ana", 21)).filter((s) => !milestones.includes(s.trigger));
      for (const s of sent) {
        // The budget window is 7 days minus a 2h tolerance (keeps weekly rhythms from drifting).
        const week = sent.filter((o) => o.at.getTime() > s.at.getTime() - (7 * DAY - 2 * HOUR) && o.at.getTime() <= s.at.getTime());
        expect(week.length, intensity).toBeLessThanOrEqual(caps[intensity]);
      }
    }
  });

  it("still sends the weekly coaching when Monday's slot was taken by a reminder", async () => {
    const h = harness();
    const sent = await simulate(h, "boss_diego", 14);
    const weekly = sent.filter((s) => s.trigger === "weekly_coaching");
    expect(weekly.length).toBeGreaterThanOrEqual(2);
    for (const w of weekly) expect([1, 2, 3]).toContain(w.at.getUTCDay());
    for (let i = 1; i < weekly.length; i++) {
      expect(weekly[i]!.at.getTime() - weekly[i - 1]!.at.getTime()).toBeGreaterThanOrEqual(6 * DAY);
    }
  });

  it("stops completely for opted-out Bosses, Bosses without WhatsApp opt-in, and during a human handoff", async () => {
    const h = harness();
    const state = await h.store.getState("boss_ana", PHONES.ana);
    await h.store.saveState({ ...state, optedOut: true });
    expect((await run(h, "boss_ana")).blocked).toBe("opted_out");

    h.platform.update("boss_bruno", { whatsappOptIn: false });
    expect((await run(h, "boss_bruno")).blocked).toBe("no_whatsapp_opt_in");

    const diego = await h.store.getState("boss_diego", PHONES.diego);
    await h.store.saveState({ ...diego, mode: "human" });
    expect((await run(h, "boss_diego")).blocked).toBe("human_handoff_active");
    expect(h.messenger.sent).toEqual([]);
  });

  it("respects quiet hours in the Boss's own timezone", async () => {
    const h = harness({ now: new Date("2026-09-29T01:00:00Z") }); // 22:00 in São Paulo
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    h.platform.update("boss_carla", { stats: { earningsToday: 50 } });
    const state = await h.store.getState("boss_carla", PHONES.carla);
    await h.store.saveState({ ...state, digest: "daily" });
    const d = await run(h, "boss_carla");
    expect(d.candidates.map((c) => c.trigger)).toContain("daily_summary");
    expect(d.blocked).toBe("quiet_hours");
  });

  it("doesn't interrupt a Boss who is chatting, but still celebrates milestones", async () => {
    const h = harness();
    await h.text(PHONES.ana, "hi");
    h.messenger.clear();
    const first = await run(h, "boss_ana");
    expect(first.sent?.trigger).toBe("welcome"); // milestone goes through
    h.advance(3.5 * HOUR);
    await h.text(PHONES.ana, "what is gcoin");
    expect((await run(h, "boss_ana")).blocked).toBe("conversation_active");
  });
});

describe("WhatsApp 24h window", () => {
  it("sends interactive messages inside the window and approved templates outside it", async () => {
    const h = harness();
    await h.text(PHONES.ana, "hi");
    h.advance(2 * HOUR);
    await run(h, "boss_ana"); // welcome (milestone) in-session
    h.advance(4 * HOUR);
    await run(h, "boss_ana"); // agent_activate in-session
    const inSession = h.messenger.to(PHONES.ana).slice(-2);
    expect(inSession.map((m) => m.kind)).toEqual(["buttons", "cta"]);
    const cta = inSession[1];
    expect(cta?.kind === "cta" && cta.cta.label).toBe("Activate My AI Agent");
    expect(cta?.kind === "cta" && cta.cta.url).toContain("utm_campaign=boss_agent_activate_1");

    h.advance(2 * DAY);
    const d = await run(h, "boss_ana"); // no_players, outside the window
    expect(d.sent?.channel).toBe("template");
    const tpl = h.messenger.to(PHONES.ana).at(-1);
    expect(tpl?.kind).toBe("template");
    expect(tpl?.kind === "template" && tpl.name).toBe("boss_no_players_1");
    expect(tpl?.kind === "template" && tpl.buttonParams[0]).toEqual({ type: "url", index: 0, suffix: "brand/share?utm_source=whatsapp&utm_medium=boss_bot&utm_campaign=boss_no_players_1" });
  });
});

describe("milestones & performance", () => {
  it("celebrates first earnings (asking for payout details) and the first player", async () => {
    const h = harness();
    const sent = await simulate(h, "boss_bruno", 2);
    const triggers = sent.map((s) => s.trigger);
    expect(triggers.slice(0, 3)).toEqual(["welcome", "first_earnings", "first_player"]);
    expect(sent.find((s) => s.trigger === "first_earnings")?.template).toBe("boss_first_earnings_payouts");
  });

  it("doesn't celebrate old milestones for established Bosses", async () => {
    const h = harness();
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_carla"))!, { dryRun: true });
    const candidates = d.candidates.map((c) => c.trigger);
    expect(candidates).not.toContain("first_player");
    expect(candidates).not.toContain("first_earnings");
    expect(candidates).not.toContain("agent_live");
  });

  it("sends the weekly coaching on Monday morning with trends, level, goal and this week's focus", async () => {
    const h = harness({ now: new Date("2026-09-28T14:00:00Z") }); // Monday 11:00 in São Paulo
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    await h.store.saveSnapshot("boss_carla", { date: "2026-09-21", totalPlayers: 217, newPlayersToday: 3, newPlayers7d: 25, activePlayers7d: 110, earningsTotal: 4208, earnings7d: 540 });
    const d = await run(h, "boss_carla");
    expect(d.sent?.trigger).toBe("weekly_coaching");
    const msg = h.messenger.to(PHONES.carla).at(-1);
    expect(msg?.kind === "template" && msg.bodyParams).toEqual([
      "Carla Kingdom",
      "31",
      "+24% vs last week",
      "$612.30",
      "+13% vs last week",
      "👑 Elite",
      "not set yet",
      "bring 5 players back",
    ]);
    // This week's focus became today's mission, so "✅ Done" knows what to check.
    const missions = await h.store.missionsSince("boss_carla", "2026-09-28");
    expect(missions.map((m) => m.missionId)).toEqual(["reengage_players"]);
    h.advance(3 * DAY);
    expect((await run(h, "boss_carla")).candidates.map((c) => c.trigger)).not.toContain("weekly_coaching");
  });

  it("brings back inactive Bosses with their real numbers", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_diego", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    const sent = await simulate(h, "boss_diego", 2);
    // 1 reminder per day: the Agent comes first, the "come back" message the next day.
    expect(sent[0]?.trigger).toBe("agent_activate");
    expect(sent[1]?.template).toBe("boss_inactive_1");
    expect(localTime(sent[1]!.at, "UTC").date).not.toBe(localTime(sent[0]!.at, "UTC").date);
    const msg = h.messenger.sent.find((s) => s.message.kind === "template" && s.message.name === "boss_inactive_1")?.message;
    expect(msg?.kind === "template" && msg.bodyParams).toEqual(["Diego", "Diego Den", "3", "$22.10"]);
  });

  it("stops the inactive series when the Boss comes back", async () => {
    const h = harness({ bosses: [makeBoss({ id: "b1", phone: "1", brandLaunchedAt: "2026-06-01T00:00:00Z", lastActiveAt: "2026-09-10T00:00:00Z", aiAgent: { activated: true, connectedSocials: ["instagram"], postsPublishedTotal: 50 }, stats: { totalPlayers: 10 } }, MONDAY_NOON.getTime())] });
    await h.store.recordNudge({ bossId: "b1", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    expect((await run(h, "b1")).sent?.trigger).toBe("inactive");
    h.platform.update("b1", { lastActiveAt: h.now().toISOString() });
    h.advance(DAY);
    await run(h, "b1");
    expect(await h.store.getSeries("b1", "inactive")).toBeNull();
  });
});

describe("events, sweeps and previews", () => {
  it("handles each platform event once", async () => {
    const h = harness();
    const event = { id: "evt_1", type: "player.joined" as const, bossId: "boss_bruno", occurredAt: h.now().toISOString() };
    const first = await h.app.retention.handleEvent(event);
    expect(first?.sent?.trigger).toBe("welcome");
    expect(await h.app.retention.handleEvent(event)).toBeNull();
  });

  it("sweeps every Boss", async () => {
    const h = harness();
    const summary = await h.app.retention.sweep();
    expect(summary).toMatchObject({ checked: 4, sent: 4, errors: 0 });
  });

  it("previews without sending or changing state", async () => {
    const h = harness();
    const d = await h.app.retention.runForBoss((await h.platform.getBoss("boss_ana"))!, { dryRun: true });
    expect(d.sent).toMatchObject({ trigger: "welcome", messageId: null });
    expect(h.messenger.sent).toEqual([]);
    expect(await h.store.lastSentByTrigger("boss_ana")).toEqual({});
  });
});
