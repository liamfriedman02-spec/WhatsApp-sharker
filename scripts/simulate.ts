/**
 * Chat with the bot in your terminal as one of the demo Bosses — no WhatsApp account needed.
 *
 *   npm run simulate
 *
 * Type a message, or a number to tap a button/row from the last reply. Commands:
 *   /boss <n>              switch Boss (/boss to list)
 *   /set <path>=<json>     change the Boss's data, e.g. /set aiAgent.activated=true
 *   /nudge                 run the retention engine for this Boss now
 *   /time +<n>d|h          move the simulated clock forward
 *   /quit
 */
import { createInterface } from "node:readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeAssistant } from "../src/ai/assistant.js";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { NUDGES, fillTemplate, type NudgeTemplate } from "../src/content/nudges.js";
import { createLogger } from "../src/logger.js";
import { InMemoryPlatform, demoBosses } from "../src/platform/mockPlatform.js";
import type { BossProfile } from "../src/platform/types.js";
import { SqliteStore } from "../src/store/store.js";
import { RecordingMessenger, renderMessage } from "../src/whatsapp/consoleMessenger.js";
import type { OutboundMessage } from "../src/whatsapp/types.js";

const config = loadConfig({ ...process.env, NODE_ENV: "development", WHATSAPP_DRY_RUN: "true" });
const logger = createLogger(process.env.LOG_LEVEL === "debug" ? "debug" : "error");
let clock = Date.now();
const platform = new InMemoryPlatform(demoBosses(clock));
let options: { id: string; title: string }[] = [];

const messenger = new RecordingMessenger((_to, m) => print(m));
const assistant = config.ai.apiKey
  ? new ClaudeAssistant({ client: new Anthropic({ apiKey: config.ai.apiKey }), model: config.ai.model, effort: config.ai.effort, refusalFallback: config.ai.refusalFallback, logger })
  : null;
const app = createApp(config, logger, {
  platform,
  store: new SqliteStore(":memory:"),
  messenger,
  assistant,
  now: () => new Date(clock),
});

let boss: BossProfile = platform.all()[0]!;
let seq = 0;

function print(m: OutboundMessage) {
  const collect = (id: string, title: string) => {
    options.push({ id, title });
    return `[${options.length}] ${title}`;
  };
  let out: string;
  if (m.kind === "template") {
    const def = (Object.values(NUDGES) as NudgeTemplate[]).find((n) => n.name === m.name);
    const lines = [`📨 (template ${m.name})`, def ? fillTemplate(def.body, m.bodyParams) : JSON.stringify(m.bodyParams)];
    if (def?.footer) lines.push(`_${def.footer}_`);
    for (const b of m.buttonParams) {
      if (b.type === "url") lines.push(`[↗] ${config.sharker.bossHubUrl}/${b.suffix}`);
      else lines.push(collect(b.payload, def?.quickReplies?.[b.index - (def.cta ? 1 : 0)]?.title ?? b.payload));
    }
    out = lines.join("\n");
  } else if (m.kind === "buttons") {
    out = [m.body, m.footer ? `_${m.footer}_` : null, ...m.buttons.map((b) => collect(b.id, b.title))].filter(Boolean).join("\n");
  } else if (m.kind === "list") {
    out = [
      m.header ? `*${m.header}*` : null,
      m.body,
      m.footer ? `_${m.footer}_` : null,
      ...m.sections.flatMap((s) => [`— ${s.title} —`, ...s.rows.map((r) => collect(r.id, `${r.title}${r.description ? `  · ${r.description}` : ""}`))]),
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    out = renderMessage(m);
  }
  console.log(`\n\x1b[36m🤖 Bot\x1b[0m\n${out}\n`);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let obj = target;
  for (const k of keys.slice(0, -1)) obj = obj[k] as Record<string, unknown>;
  obj[keys.at(-1)!] = value;
}

async function send(input: { text?: string; replyId?: string; replyTitle?: string }) {
  options = [];
  await app.router.handleInbound({
    messageId: `sim.${++seq}`,
    from: boss.phone,
    timestamp: new Date(clock),
    type: input.replyId ? "reply" : "text",
    text: input.text,
    replyId: input.replyId,
    replyTitle: input.replyTitle,
  });
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("Sharker Boss Assistant — simulator");
  console.log(`AI assistant: ${assistant ? config.ai.model : "off (set ANTHROPIC_API_KEY to enable)"}`);
  console.log("Type a message, a number to tap an option, or /help.\n");
  console.log(`You are ${boss.firstName} (${boss.brandName}). Say "hi" to start.\n`);

  const prompt = () => process.stdout.write(`\x1b[33m${boss.firstName} ›\x1b[0m `);
  prompt();
  for await (const raw of rl) {
    const line = raw.trim();
    if (!process.stdin.isTTY && line) console.log(line);
    await handleLine(line);
    if (line === "/quit" || line === "/exit") break;
    prompt();
  }
  rl.close();
  app.store.close();
}

async function handleLine(line: string): Promise<void> {
  if (!line || line === "/quit" || line === "/exit") return;
  if (line === "/help") {
    console.log("/boss [n] · /set path=json · /nudge · /time +3d · /quit");
    return;
  }
  if (line.startsWith("/boss")) {
    const all = platform.all();
    const n = Number(line.split(" ")[1]);
    if (n >= 1 && n <= all.length) {
      boss = all[n - 1]!;
      console.log(`Now chatting as ${boss.firstName} (${boss.brandName}).`);
    } else all.forEach((b, i) => console.log(`${i + 1}. ${b.firstName} — ${b.brandName} (${b.id})`));
    return;
  }
  if (line.startsWith("/set ")) {
    const [path, raw] = line.slice(5).split("=");
    try {
      const current = (await platform.getBoss(boss.id))!;
      setPath(current as unknown as Record<string, unknown>, path!.trim(), JSON.parse(raw!.trim()));
      platform.upsert(current);
      boss = current;
      console.log(`✔ ${path} = ${raw}`);
    } catch (err) {
      console.log(`✘ ${(err as Error).message}`);
    }
    return;
  }
  if (line.startsWith("/time ")) {
    const m = /^\+(\d+(?:\.\d+)?)([dh])$/.exec(line.slice(6).trim());
    if (m) {
      clock += Number(m[1]) * (m[2] === "d" ? 86_400_000 : 3_600_000);
      console.log(`🕒 ${new Date(clock).toISOString()}`);
    }
    return;
  }
  if (line === "/nudge") {
    options = [];
    const decision = await app.retention.runForBoss((await platform.getBoss(boss.id))!);
    if (!decision.sent) {
      console.log(`(no nudge: ${decision.blocked}; candidates: ${decision.candidates.map((c) => c.trigger).join(", ") || "none"})`);
    }
    return;
  }
  const n = Number(line);
  if (Number.isInteger(n) && n >= 1 && n <= options.length) {
    const opt = options[n - 1]!;
    console.log(`\x1b[2m(tapped “${opt.title}”)\x1b[0m`);
    await send({ replyId: opt.id, replyTitle: opt.title });
  } else {
    await send({ text: line });
  }
}

void main();
