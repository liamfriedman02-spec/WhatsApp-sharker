import Anthropic from "@anthropic-ai/sdk";
import { ClaudeAssistant, type Assistant } from "./ai/assistant.js";
import { LogSupportDesk, WebhookSupportDesk, type SupportDesk } from "./bot/handoff.js";
import { CoachService } from "./coach/service.js";
import { BotRouter } from "./bot/router.js";
import type { Config } from "./config.js";
import type { Logger } from "./logger.js";
import { InMemoryPlatform, demoBosses } from "./platform/mockPlatform.js";
import { SharkerApiPlatform } from "./platform/sharkerApi.js";
import type { SharkerPlatform } from "./platform/types.js";
import { RetentionEngine } from "./retention/engine.js";
import { SqliteStore, type Store } from "./store/store.js";
import { CloudApiMessenger } from "./whatsapp/cloudApi.js";
import { RecordingMessenger, renderMessage } from "./whatsapp/consoleMessenger.js";
import type { Messenger } from "./whatsapp/types.js";

export interface App {
  config: Config;
  logger: Logger;
  platform: SharkerPlatform;
  store: Store;
  messenger: Messenger;
  assistant: Assistant | null;
  supportDesk: SupportDesk;
  coach: CoachService;
  router: BotRouter;
  retention: RetentionEngine;
}

export interface AppOverrides {
  platform?: SharkerPlatform;
  store?: Store;
  messenger?: Messenger;
  assistant?: Assistant | null;
  supportDesk?: SupportDesk;
  now?: () => Date;
}

/** Wires every dependency from config. Tests and the simulator pass overrides. */
export function createApp(config: Config, logger: Logger, overrides: AppOverrides = {}): App {
  const platform =
    overrides.platform ??
    (config.sharker.apiBaseUrl
      ? new SharkerApiPlatform({ baseUrl: config.sharker.apiBaseUrl, apiKey: config.sharker.apiKey })
      : (logger.warn("SHARKER_API_BASE_URL not set — using demo Bosses (development only)"), new InMemoryPlatform(demoBosses())));

  const store = overrides.store ?? new SqliteStore(config.databasePath);

  const messenger =
    overrides.messenger ??
    (config.whatsapp.dryRun
      ? (logger.warn("WhatsApp dry-run: messages are logged, not sent"),
        new RecordingMessenger((to, m) => logger.info("whatsapp dry-run send", { to, message: renderMessage(m) })))
      : new CloudApiMessenger({
          accessToken: config.whatsapp.accessToken!,
          phoneNumberId: config.whatsapp.phoneNumberId!,
          apiVersion: config.whatsapp.apiVersion,
          logger,
        }));

  let assistant: Assistant | null = null;
  if (overrides.assistant !== undefined) assistant = overrides.assistant;
  else if (config.ai.enabled && config.ai.apiKey) {
    assistant = new ClaudeAssistant({
      client: new Anthropic({ apiKey: config.ai.apiKey }),
      model: config.ai.model,
      effort: config.ai.effort,
      refusalFallback: config.ai.refusalFallback,
      logger,
    });
  } else {
    logger.warn("AI assistant disabled — free text uses keyword search over the knowledge base");
  }

  const supportDesk =
    overrides.supportDesk ??
    (config.support.webhookUrl ? new WebhookSupportDesk(config.support.webhookUrl, logger) : new LogSupportDesk(logger));

  const coach = new CoachService({ store, platform, logger });
  const router = new BotRouter({ platform, store, messenger, assistant, supportDesk, coach, config, logger, now: overrides.now });
  const retention = new RetentionEngine({ platform, store, messenger, coach, config, logger, now: overrides.now });

  return { config, logger, platform, store, messenger, assistant, supportDesk, coach, router, retention };
}
