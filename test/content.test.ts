import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "../src/ai/assistant.js";
import {
  aiAgentMessages,
  businessSnapshot,
  demoMenu,
  faqCategoryMenu,
  faqMessages,
  guideStepMessage,
  helpMenu,
  homeMessage,
  learnMenu,
  mainMenu,
  nextActionMessage,
  settingsMenu,
  topicMessages,
} from "../src/bot/views.js";
import { FAQ, FAQ_CATEGORIES, faqByCategory } from "../src/content/faq.js";
import { GUIDES } from "../src/content/guides.js";
import { CTAS, CTA_IDS } from "../src/content/links.js";
import { NUDGES, type NudgeTemplate } from "../src/content/nudges.js";
import { TOPICS } from "../src/content/topics.js";
import { DEMO_PERSONAS } from "../src/platform/demoPlatform.js";
import { demoBosses } from "../src/platform/mockPlatform.js";
import { renderNudge } from "../src/retention/render.js";
import { TRIGGERS } from "../src/retention/triggers.js";
import { SqliteStore } from "../src/store/store.js";
import { validateMessage } from "../src/whatsapp/validate.js";
import type { OutboundMessage } from "../src/whatsapp/types.js";
import { HUB, MONDAY_NOON } from "./helpers.js";
import { contentCtx } from "../src/content/context.js";
import { CoachService } from "../src/coach/service.js";
import { InMemoryPlatform } from "../src/platform/mockPlatform.js";
import { silentLogger } from "../src/logger.js";
import { coachSessionMessage, goalProposalMessage, missionMessage, postsMessages, progressMessage, fallbackPosts } from "../src/bot/coachViews.js";
import {
  audienceQuestion,
  channelsMessage,
  inviteFor,
  inviteMessages,
  moneyAnswerMessage,
  moneyAskMessage,
  moneyMenu,
  playbookDoneMessage,
  playbookMenu,
  playbookOfferMessage,
  playbookStoppedMessage,
  playerTextMessages,
  stepMessages,
  textsMenu,
} from "../src/bot/playViews.js";
import { moneyMath } from "../src/coach/money.js";
import { AUDIENCES } from "../src/content/invites.js";
import { MISSIONS, getMission } from "../src/content/missions.js";
import { PLAYBOOKS } from "../src/content/playbooks.js";
import { proposeGoal } from "../src/coach/goals.js";

const bosses = demoBosses(MONDAY_NOON.getTime());
const coachStore = new SqliteStore(":memory:");
const coachSvc = new CoachService({ store: coachStore, platform: new InMemoryPlatform(bosses), logger: silentLogger });
const ctxs = await Promise.all(
  bosses.map(async (b) => {
    const ctx = contentCtx(b, { now: MONDAY_NOON, hubUrl: HUB, defaultTimezone: "UTC" });
    ctx.coach = await coachSvc.view(ctx);
    return ctx;
  }),
);
const templates = Object.values(NUDGES) as NudgeTemplate[];
const triggerInput = (ctx: (typeof ctxs)[number]) => ({ ctx, coach: ctx.coach!, state: {} as never, local: { hour: 12, weekday: 1, date: "" }, lastSent: () => null });

/** Every reply id the router understands. */
const ROUTABLE =
  /^(menu:\w+|nba|learn:\w+|help:\w+|faq:\w+|feedback:(solved|unsolved):\w+|guide:\w+|guide_step:(done|stuck|exit|check)|handoff:(start|cancel|close)|settings:(digest:(daily|weekly|off)|coach:(light|standard|intense)|pause|resume)|ask:ai|mission:(today|done|skip|bonus|help)|goal:(accept|higher|lower|new)|coach:(progress|session)|post:write|followup:(done|notyet)|demo:(ana|bruno|carla|diego)|play:(today|next|stop|menu|start:(launch|friend_week|comeback_week|channel_week))|invite:(family|friends|work|community|online|welcome|referral|followup|comeback)|texts:menu|money:(menu|\d+)|channels:menu)$/;

function allViews(): OutboundMessage[] {
  const store = new SqliteStore(":memory:");
  const out: OutboundMessage[] = [learnMenu(), helpMenu(), demoMenu(), demoMenu(DEMO_PERSONAS[0]!.title), audienceQuestion(), playbookStoppedMessage(), moneyAskMessage()];
  for (const c of FAQ_CATEGORIES) out.push(faqCategoryMenu(c.id));
  for (const ctx of ctxs) {
    const state = ctx.coach!.state;
    out.push(homeMessage(ctx), homeMessage({ ...ctx, demo: true }), mainMenu(ctx), mainMenu({ ...ctx, demo: true }), businessSnapshot(ctx), nextActionMessage(ctx), ...aiAgentMessages(ctx));
    out.push(textsMenu(ctx), channelsMessage(ctx, state), moneyMenu(ctx), playbookMenu(ctx, state), ...inviteMessages(ctx, AUDIENCES.map((a) => inviteFor(ctx, a))));
    for (const kind of ["welcome", "referral", "followup", "comeback"]) out.push(...playerTextMessages(ctx, kind)!);
    for (const amount of [100, 300, 1000, 50_000]) out.push(moneyAnswerMessage(ctx, moneyMath(ctx, ctx.coach!.insights, amount), state));
    for (const pb of PLAYBOOKS) {
      out.push(playbookOfferMessage(ctx, pb), playbookDoneMessage(ctx, pb, ctx.coach!));
      // Every step of every plan, as the Boss sees it that day (open) and once it's done.
      pb.steps.forEach((step, index) => {
        const def = getMission(step.mission(ctx, state))!;
        for (const status of ["open", "done"] as const) {
          const record = { id: 1, bossId: ctx.boss.id, missionId: def.id, date: ctx.coach!.today, status, assignedAt: MONDAY_NOON.toISOString(), completedAt: null };
          out.push(...stepMessages(ctx, { playbook: pb, index, step, mission: { record, def }, opened: true }, ctx.coach!));
        }
      });
      // The home screen, the full menu and the campaign list with this plan active.
      const active = { ...ctx, coach: { ...ctx.coach!, state: { ...state, playbook: { id: pb.id, step: 0, stepDate: ctx.coach!.today, startedAt: "", status: "active" as const } } } };
      out.push(homeMessage(active), mainMenu(active), playbookMenu(active, active.coach.state));
    }
    out.push(progressMessage(ctx, ctx.coach!), coachSessionMessage(ctx, ctx.coach!, MISSIONS[0]!), ...postsMessages(ctx, fallbackPosts(ctx)));
    out.push(goalProposalMessage(ctx, proposeGoal(ctx.boss, ctx.coach!.insights, MONDAY_NOON), ctx.coach!));
    for (const m of MISSIONS) out.push(missionMessage(ctx, m, ctx.coach!));
    for (const t of TOPICS) out.push(...topicMessages(t, ctx));
    for (const f of FAQ) out.push(...faqMessages(f, ctx));
    for (const g of Object.values(GUIDES)) g.steps.forEach((_, i) => out.push(guideStepMessage(g, i, ctx)));
    for (const t of templates) {
      out.push(renderNudge(t, ctx, "session", "en").message, renderNudge(t, ctx, "template", "en").message);
    }
  }
  for (const digest of ["daily", "weekly", "off"] as const) {
    for (const optedOut of [true, false]) {
      for (const intensity of ["light", "standard", "intense"] as const) {
        out.push(settingsMenu({ bossId: "b", phone: "1", optedOut, digest, mode: "bot", flow: null, lastInboundAt: null, waLastInboundAt: null, channel: "whatsapp", telegramChatId: null, handoffId: null, updatedAt: "" }, intensity));
      }
    }
  }
  store.close();
  return out;
}

describe("content fits WhatsApp limits", () => {
  it("every screen for every demo Boss is a valid WhatsApp message", () => {
    const problems = allViews().flatMap((m) => validateMessage(m).map((e) => `${m.kind}: ${e}`));
    expect(problems).toEqual([]);
  });

  it("every button / row id is routable", () => {
    const unroutable = allViews()
      .flatMap((m) => (m.kind === "buttons" ? m.buttons.map((b) => b.id) : m.kind === "list" ? m.sections.flatMap((s) => s.rows.map((r) => r.id)) : []))
      .filter((id) => !ROUTABLE.test(id));
    expect(unroutable).toEqual([]);
  });

  it("covers all 10 education topics from the brief", () => {
    expect(TOPICS.map((t) => t.id)).toEqual([
      "what_is_boss",
      "how_brand_works",
      "how_earn",
      "bring_players",
      "boss_hub",
      "payments",
      "gcoin",
      "marketing",
      "ai_agent",
      "ai_autopilot",
    ]);
  });

  it("FAQ categories fit in one list and cover every support area", () => {
    for (const c of FAQ_CATEGORIES) {
      expect(faqByCategory(c.id).length).toBeGreaterThan(0);
      expect(faqByCategory(c.id).length).toBeLessThanOrEqual(10);
    }
    expect(new Set(FAQ.map((f) => f.id)).size).toBe(FAQ.length);
  });

  it("CTA labels fit a WhatsApp button", () => {
    for (const id of CTA_IDS) expect(CTAS[id].label.length, id).toBeLessThanOrEqual(20);
  });
});

describe("WhatsApp templates", () => {
  it("have valid, unique names", () => {
    const names = templates.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z0-9_]{1,512}$/);
  });

  it("don't start or end with a variable and have sequential placeholders", () => {
    for (const t of templates) {
      expect(t.body.trimStart().startsWith("{{"), t.name).toBe(false);
      expect(t.body.trimEnd().endsWith("}}"), t.name).toBe(false);
      const nums = [...t.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      const unique = [...new Set(nums)].sort((a, b) => a - b);
      expect(unique, t.name).toEqual(unique.map((_, i) => i + 1));
      expect(t.example.length, `${t.name} example`).toBe(unique.length);
      expect(t.body.length, t.name).toBeLessThanOrEqual(1024);
      if (t.footer) expect(t.footer.length).toBeLessThanOrEqual(60);
      for (const q of t.quickReplies ?? []) {
        expect(q.title.length, q.title).toBeLessThanOrEqual(20);
        expect(q.payload).toMatch(ROUTABLE);
      }
    }
  });

  it("produce one non-empty, single-line param per placeholder for every demo Boss", () => {
    for (const t of templates) {
      const placeholders = new Set([...t.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size;
      for (const base of ctxs) {
        const goal = { metric: "players" as const, target: 40, startValue: 0, startAt: MONDAY_NOON.toISOString(), deadline: "2026-10-26T12:00:00.000Z", status: "active" as const };
        const ctx = { ...base, coach: { ...base.coach!, state: { ...base.coach!.state, goal } } };
        const params = t.params(ctx);
        expect(params.length, t.name).toBe(placeholders);
        for (const p of params) expect(p, t.name).toMatch(/^[^\n\t]+$/);
      }
    }
  });

  it("the AI Agent messages use the copy from the brief", () => {
    expect(NUDGES.agent_activate_1.body).toContain("Let AI Grow Your Brand");
    expect(NUDGES.agent_activate_1.body).toContain("Now put your marketing on autopilot.");
    expect(NUDGES.agent_socials_1.body).toContain("Your AI Agent Is Ready 🤖");
    expect(NUDGES.agent_socials_1.body).toContain("One last step.");
    expect(NUDGES.agent_live.body).toContain("Your AI Agent Is Live");
  });

  it("every trigger's copy exists for each reminder step", () => {
    for (const trigger of TRIGGERS) {
      const steps = trigger.schedule.type === "series" ? trigger.schedule.gapsDays.length + 1 : 1;
      for (let i = 0; i < steps; i++) {
        for (const ctx of ctxs) {
          expect(trigger.template(triggerInput(ctx), i)).toBeDefined();
        }
      }
    }
  });

  it("reminder steps never repeat the same copy", () => {
    for (const trigger of TRIGGERS.filter((t) => t.schedule.type === "series")) {
      const input = triggerInput(ctxs[0]!);
      const steps = trigger.schedule.type === "series" ? trigger.schedule.gapsDays.length + 1 : 1;
      const names = Array.from({ length: steps }, (_, i) => trigger.template(input, i).name);
      expect(new Set(names).size, trigger.id).toBe(steps);
    }
  });
});

describe("assistant knowledge base", () => {
  it("contains every topic, FAQ and guide, and no volatile data", () => {
    for (const t of TOPICS) expect(SYSTEM_PROMPT).toContain(t.body.slice(0, 40));
    for (const f of FAQ) expect(SYSTEM_PROMPT).toContain(f.question);
    for (const g of Object.keys(GUIDES)) expect(SYSTEM_PROMPT).toContain(`Guide "${g}"`);
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}T/); // no timestamps → cacheable prefix
  });
});
