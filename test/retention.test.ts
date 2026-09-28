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
  for (let i = 0; i < days * 24; i++) {
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
    // Day 1: welcome + first activation reminder.
    let sent = await simulate(h, "boss_ana", 1);
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
  it("never exceeds 2 nudges per 24h or 1 reminder/summary per 24h, and never in quiet hours", async () => {
    const h = harness();
    const milestones = ["welcome", "first_player", "first_earnings", "agent_live", "agent_first_post"];
    for (const id of ["boss_ana", "boss_bruno", "boss_carla", "boss_diego"]) {
      const sent = await simulate(h, id, 21);
      expect(sent.length).toBeGreaterThan(3);
      for (const s of sent) {
        const window = sent.filter((o) => o.at.getTime() > s.at.getTime() - DAY && o.at.getTime() <= s.at.getTime());
        expect(window.length).toBeLessThanOrEqual(2);
        expect(window.filter((o) => !milestones.includes(o.trigger)).length).toBeLessThanOrEqual(1);
        const tz = (await h.platform.getBoss(id))!.timezone ?? "UTC";
        expect(inQuietHours(localTime(s.at, tz).hour, 21, 9)).toBe(false);
      }
      h.setNow(MONDAY_NOON);
    }
  });

  it("still sends the weekly summary when Monday's slot was taken by a reminder", async () => {
    const h = harness();
    const sent = await simulate(h, "boss_diego", 14);
    const weekly = sent.filter((s) => s.trigger === "weekly_summary");
    expect(weekly.length).toBe(2);
    for (const w of weekly) expect([1, 2, 3]).toContain(w.at.getUTCDay());
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

  it("sends the weekly summary on Monday morning with the next best action", async () => {
    const h = harness({ now: new Date("2026-09-28T14:00:00Z") }); // Monday 11:00 in São Paulo
    await h.store.recordNudge({ bossId: "boss_carla", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    const d = await run(h, "boss_carla");
    expect(d.sent?.trigger).toBe("weekly_summary");
    const msg = h.messenger.to(PHONES.carla).at(-1);
    expect(msg?.kind === "template" && msg.bodyParams).toEqual([
      "Carla Kingdom",
      "31",
      "248",
      "$612.30",
      "14 posts this week",
      "keep sharing your brand link while your AI Agent posts for you",
    ]);
    h.advance(3 * DAY);
    expect((await run(h, "boss_carla")).candidates.map((c) => c.trigger)).not.toContain("weekly_summary");
  });

  it("brings back inactive Bosses with their real numbers", async () => {
    const h = harness();
    await h.store.recordNudge({ bossId: "boss_diego", trigger: "welcome", category: "milestone", channel: "template", step: 0, messageId: null, sentAt: "2026-09-01T12:00:00.000Z" });
    const sent = await simulate(h, "boss_diego", 1);
    expect(sent.map((s) => s.trigger)).toContain("agent_activate");
    expect(sent.map((s) => s.trigger)).not.toContain("inactive"); // 1 reminder per day: Agent comes first
    const later = await simulate(h, "boss_diego", 2);
    expect(later.map((s) => s.template)).toContain("boss_inactive_1");
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
