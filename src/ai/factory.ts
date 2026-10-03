import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import { ClaudeAssistant, type Assistant } from "./assistant.js";
import { OpenAiAssistant } from "./openai.js";

/** The AI coach for this configuration: Claude when there's an Anthropic key, else OpenAI, else none. */
export function createAssistant(config: Config, logger: Logger): Assistant | null {
  const { ai } = config;
  if (!ai.enabled) return null;
  if (ai.apiKey) {
    return new ClaudeAssistant({ client: new Anthropic({ apiKey: ai.apiKey }), model: ai.model, effort: ai.effort, refusalFallback: ai.refusalFallback, logger });
  }
  if (ai.openaiApiKey) return new OpenAiAssistant({ apiKey: ai.openaiApiKey, model: ai.openaiModel, logger });
  return null;
}

/** "claude-opus-5", "openai:gpt-5-mini" or "disabled" (for logs and /health). */
export function assistantLabel(config: Config): string {
  const { ai } = config;
  if (!ai.enabled) return "disabled";
  if (ai.apiKey) return ai.model;
  if (ai.openaiApiKey) return `openai:${ai.openaiModel}`;
  return "disabled";
}
