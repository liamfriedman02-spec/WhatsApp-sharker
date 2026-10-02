import Anthropic from "@anthropic-ai/sdk";
import { ClaudeAssistant, type Assistant } from "./ai/assistant.js";
import { LogSupportDesk, WebhookSupportDesk, type SupportDesk } from "./bot/handoff.js";
import { ChannelMessenger } from "./channels.js";
import { CoachService } from "./coach/service.js";
import { BotRouter } from "./bot/router.js";
import type { Config } from "./config.js";
import type { Logger } from "./logger.js";
import { InMemoryPlatform, demoBosses } from "./platform/mockPlatform.js";
import { SharkerApiPlatform } from "./platform/sharkerApi.js";
import type { SharkerPlatform } from "./platform/types.js";
import { RetentionEngine } from "./retention/engine.js";
import { SqliteStore, type Store } from "./store/store.js";
import { TelegramApi, TelegramMessenger } from "./telegram/api.js";
import { CloudApiMessenger } from "./whatsapp/cloudApi.js";
import { RecordingMessenger, renderMessage } from "./whatsapp/consoleMessenger.js";
import type { Messenger } from "./whatsapp/types.js";

export interface App {
  config: Config;
  logger: Logger;
  platform: SharkerPlatform;
  store: Store;
  messenger: Messenger;
  /** Set when TELEGRAM_BOT_TOKEN is configured. */
  telegramApi: TelegramApi | null;
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
  const platform = overrides.platform ?? createPlatform(config, logger);

  const store = overrides.store ?? new SqliteStore(config.databasePath);

  const whatsapp: Messenger = config.whatsapp.dryRun
    ? (logger.warn("WhatsApp dry-run: messages are logged, not sent"),
      new RecordingMessenger((to, m) => logger.info("whatsapp dry-run send", { to, message: renderMessage(m) })))
    : new CloudApiMessenger({
        accessToken: config.whatsapp.accessToken!,
        phoneNumberId: config.whatsapp.phoneNumberId!,
        apiVersion: config.whatsapp.apiVersion,
        logger,
      });
  const telegramApi = config.telegram.botToken ? new TelegramApi(config.telegram.botToken, logger) : null;
  const telegramEnabled = !!telegramApi;
  const messenger =
    overrides.messenger ??
    new ChannelMessenger({ whatsapp, telegram: telegramApi ? new TelegramMessenger(telegramApi, logger) : undefined });

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
  const router = new BotRouter({ platform, store, messenger, assistant, supportDesk, coach, config, logger, telegramEnabled, now: overrides.now });
  const retention = new RetentionEngine({ platform, store, messenger, coach, config, logger, telegramEnabled, now: overrides.now });

  return { config, logger, platform, store, messenger, telegramApi, assistant, supportDesk, coach, router, retention };
}

function createPlatform(config: Config, logger: Logger): SharkerPlatform {
  if (config.sharker.apiBaseUrl) {
    return new SharkerApiPlatform({ baseUrl: config.sharker.apiBaseUrl, apiKey: config.sharker.apiKey });
  }
  logger.warn("SHARKER_API_BASE_URL not set — using demo Bosses (development only)");
  const bosses = demoBosses();
  const { demoBossPhone, demoBossId } = config.sharker;
  if (demoBossPhone) {
    // Lets you test from your own WhatsApp before the Sharker API exists.
    const boss = bosses.find((b) => b.id === demoBossId);
    if (boss) boss.phone = demoBossPhone;
    logger.info("demo Boss linked to your WhatsApp number", { bossId: demoBossId });
  }
  return new InMemoryPlatform(bosses);
}
