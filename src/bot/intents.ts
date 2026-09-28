import { FAQ, type FaqEntry } from "../content/faq.js";
import { TOPICS, type Topic } from "../content/topics.js";

export type Command = "menu" | "help" | "human" | "stop" | "start" | "settings" | "business" | "agent" | "learn";

/** Short exact-match commands (after normalization). Everything else goes to the assistant. */
const COMMANDS: Record<Command, string[]> = {
  menu: ["menu", "hi", "hello", "hey", "hola", "oi", "ola", "main menu", "home", "back", "inicio"],
  help: ["help", "support", "ajuda", "ayuda", "faq"],
  human: ["human", "talk to a human", "real person", "person", "operator", "talk to someone", "support team", "atendente", "agente humano"],
  stop: ["stop", "unsubscribe", "pause tips", "stop tips", "pausar"],
  start: ["start", "resume", "resume tips", "subscribe"],
  settings: ["settings", "notifications", "preferences"],
  business: ["my business", "stats", "my stats", "dashboard", "report", "summary", "performance"],
  agent: ["my ai agent", "ai agent", "my agent", "agent status"],
  learn: ["learn", "education", "course", "topics", "tutorial"],
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCommand(text: string): Command | null {
  const n = normalize(text);
  for (const [cmd, phrases] of Object.entries(COMMANDS) as [Command, string[]][]) {
    if (phrases.includes(n)) return cmd;
  }
  return null;
}

const AFFIRMATIVE = ["done", "ok", "okay", "next", "yes", "ready", "finished", "did it", "listo", "pronto", "feito", "hecho"];

export function isAffirmative(text: string): boolean {
  return AFFIRMATIVE.includes(normalize(text));
}

export type KnowledgeMatch = { type: "faq"; faq: FaqEntry; score: number } | { type: "topic"; topic: Topic; score: number };

/**
 * Keyword search over FAQ + topics. Used when the AI assistant is disabled or unavailable.
 * Multi-word keywords score higher than single words; FAQs win ties (they're more specific).
 */
export function searchKnowledge(text: string): KnowledgeMatch | null {
  const n = ` ${normalize(text)} `;
  const score = (keywords: string[]) =>
    keywords.reduce((sum, k) => {
      const kw = normalize(k);
      return n.includes(` ${kw} `) ? sum + kw.split(" ").length * 2 : sum;
    }, 0);

  let best: KnowledgeMatch | null = null;
  for (const faq of FAQ) {
    const s = score(faq.keywords) + 0.5;
    if (s > 0.5 && (!best || s > best.score)) best = { type: "faq", faq, score: s };
  }
  for (const topic of TOPICS) {
    const s = score(topic.keywords);
    if (s > 0 && (!best || s > best.score)) best = { type: "topic", topic, score: s };
  }
  return best;
}
