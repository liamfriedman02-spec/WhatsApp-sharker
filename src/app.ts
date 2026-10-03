import type { Assistant } from "./ai/assistant.js";
import { assistantLabel, createAssistant } from "./ai/factory.js";
import { LogSupportDesk, WebhookSupportDesk, type SupportDesk } from "./bot/handoff.js";
import { ChannelMessenger } from "./channels.js";
import { CoachService } from "./coach/service.js";
import { BotRouter } from "./bot/router.js";
import type { Config } from "./config.js";
import type { Logger } from "./logger.js";
import { DemoPlatform, personaId } from "./platform/demoPlatform.js";
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
  const store = overrides.store ?? new SqliteStore(config.databasePath);
  const platform = overrides.platform ?? createPlatform(config, logger, store);
  const demo = platform instanceof DemoPlatform ? platform : undefined;

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
  else {
    assistant = createAssistant(config, logger);
    if (assistant) logger.info("AI coach enabled", { model: assistantLabel(config) });
    else logger.warn("AI coach disabled (set ANTHROPIC_API_KEY or OPENAI_API_KEY) — free text uses keyword search over the knowledge base");
  }

  const supportDesk =
    overrides.supportDesk ??
    (config.support.webhookUrl ? new WebhookSupportDesk(config.support.webhookUrl, logger) : new LogSupportDesk(logger));

  const coach = new CoachService({ store, platform, logger });
  const router = new BotRouter({ platform, store, messenger, assistant, supportDesk, coach, config, logger, telegramEnabled, demo, now: overrides.now });
  const retention = new RetentionEngine({ platform, store, messenger, coach, config, logger, telegramEnabled, now: overrides.now });

  return { config, logger, platform, store, messenger, telegramApi, assistant, supportDesk, coach, router, retention };
}

function createPlatform(config: Config, logger: Logger, store: Store): SharkerPlatform {
  if (config.sharker.apiBaseUrl) {
    return new SharkerApiPlatform({ baseUrl: config.sharker.apiBaseUrl, apiKey: config.sharker.apiKey });
  }
  logger.warn("SHARKER_API_BASE_URL not set — demo mode: every new number becomes a demo Boss (type DEMO to switch profile)");
  const { demoBossPhone, demoBossId } = config.sharker;
  const defaultPersona = personaId(demoBossId) ?? "carla";
  return new DemoPlatform({
    defaultPersona,
    preassigned: demoBossPhone ? { [demoBossPhone]: defaultPersona } : {},
    // Give each demo Boss a week of history so trends and insights show up right away.
    onCreate: async (boss, history) => {
      for (const snap of history) await store.saveSnapshot(boss.id, snap);
      logger.info("demo Boss created", { bossId: boss.id });
    },
  });
}
