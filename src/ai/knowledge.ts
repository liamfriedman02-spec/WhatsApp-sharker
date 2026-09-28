import { FAQ, FAQ_CATEGORIES } from "../content/faq.js";
import { GUIDES } from "../content/guides.js";
import { CTAS, CTA_IDS } from "../content/links.js";
import { TOPICS } from "../content/topics.js";

/**
 * Renders all bot content into one knowledge-base document for the assistant's system prompt.
 * Deterministic output (fixed order, no timestamps) so the prompt prefix stays cacheable.
 */
export function buildKnowledgeBase(): string {
  const topics = TOPICS.map((t) => `### ${stripEmoji(t.title)}\n${t.body}`).join("\n\n");
  const faq = FAQ_CATEGORIES.map((c) => {
    const entries = FAQ.filter((f) => f.category === c.id)
      .map((f) => `Q: ${f.question}\nA: ${f.answer}${f.suggestHuman ? "\n(If this doesn't solve it, a human should help.)" : ""}`)
      .join("\n\n");
    return `### ${stripEmoji(c.title)}\n${entries}`;
  }).join("\n\n");
  const guides = Object.values(GUIDES)
    .map((g) => `### Guide "${g.id}": ${g.title}\n${g.steps.map((s) => `- ${s.text}`).join("\n")}`)
    .join("\n\n");
  const ctas = CTA_IDS.map((id) => `- ${id}: "${CTAS[id].label}" button (Boss Hub → /${CTAS[id].path})`).join("\n");

  return [
    "## Education topics",
    topics,
    "## Support FAQ",
    faq,
    "## Step-by-step guides (the bot can walk the Boss through these)",
    guides,
    "## Boss Hub buttons (cta ids)",
    ctas,
  ].join("\n\n");
}

function stripEmoji(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
