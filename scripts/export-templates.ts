/**
 * Prints the WhatsApp message-template payloads for every proactive nudge, ready to submit
 * to Meta (POST /{WABA_ID}/message_templates).
 *
 *   npm run templates:export                 # print JSON
 *   npm run templates:export -- --submit     # submit (needs WHATSAPP_WABA_ID + WHATSAPP_ACCESS_TOKEN)
 */
import { loadConfig } from "../src/config.js";
import { CTAS, ctaSuffix } from "../src/content/links.js";
import { NUDGES, type NudgeTemplate } from "../src/content/nudges.js";

const config = loadConfig({ ...process.env, NODE_ENV: "development" });
const hub = config.sharker.bossHubUrl;

export function templatePayload(t: NudgeTemplate, language: string) {
  const components: Record<string, unknown>[] = [
    { type: "BODY", text: t.body, ...(t.example.length ? { example: { body_text: [t.example] } } : {}) },
  ];
  if (t.footer) components.push({ type: "FOOTER", text: t.footer });
  const buttons: Record<string, unknown>[] = [];
  if (t.cta) {
    buttons.push({ type: "URL", text: CTAS[t.cta].label, url: `${hub}/{{1}}`, example: [`${hub}/${ctaSuffix(t.cta, t.name)}`] });
  }
  for (const q of t.quickReplies ?? []) buttons.push({ type: "QUICK_REPLY", text: q.title });
  if (buttons.length) components.push({ type: "BUTTONS", buttons });
  return { name: t.name, language, category: t.category, components };
}

const payloads = (Object.values(NUDGES) as NudgeTemplate[]).map((t) => templatePayload(t, config.whatsapp.templateLanguage));

if (process.argv.includes("--submit")) {
  const waba = process.env.WHATSAPP_WABA_ID;
  const token = config.whatsapp.accessToken;
  if (!waba || !token) {
    console.error("Set WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN to submit templates.");
    process.exit(1);
  }
  for (const p of payloads) {
    const res = await fetch(`https://graph.facebook.com/${config.whatsapp.apiVersion}/${waba}/message_templates`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(p),
    });
    console.log(`${p.name}: ${res.status} ${await res.text()}`);
  }
} else {
  console.log(JSON.stringify(payloads, null, 2));
}
