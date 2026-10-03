import type { BotRouter } from "../bot/router.js";
import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import type { KeyedQueue } from "../util/keyedQueue.js";
import type { TelegramApi } from "./api.js";
import { parseTelegramUpdate, type TgUpdate } from "./updates.js";

export const TELEGRAM_COMMANDS = [
  { command: "menu", description: "Main menu" },
  { command: "plan", description: "My sprint or campaign today" },
  { command: "mission", description: "Today's mission" },
  { command: "texts", description: "Ready-to-send invites and posts" },
  { command: "money", description: "How many players my target takes" },
  { command: "progress", description: "My goal, level and streak" },
  { command: "help", description: "Get help" },
];

interface Deps {
  api: TelegramApi;
  router: BotRouter;
  queue: KeyedQueue;
  logger: Logger;
}

/** Handles one update (from the webhook or from polling): one chat's messages run in order. */
export function handleTelegramUpdate(update: TgUpdate, { api, router, queue, logger }: Deps): Promise<void> {
  const { message, callbackQueryId } = parseTelegramUpdate(update);
  if (callbackQueryId) void api.answerCallback(callbackQueryId).catch((err) => logger.debug("answerCallback failed", { err }));
  if (!message) return Promise.resolve();
  return queue.run(`tg:${message.from}`, () => router.handleInbound(message)).catch((err) => {
    logger.error("telegram: handler failed", { err });
  });
}

/**
 * Connects the bot to Telegram: registers the webhook when the server has a public URL,
 * otherwise long-polls (handy on a laptop: no tunnel needed). Returns a stop function.
 */
export async function startTelegram(config: Config, deps: Deps): Promise<() => void> {
  const { api, logger } = deps;
  const commands = config.sharker.apiBaseUrl
    ? TELEGRAM_COMMANDS
    : [...TELEGRAM_COMMANDS, { command: "demo", description: "Switch demo Boss profile" }];
  await api.setCommands(commands).catch((err) => logger.warn("telegram: setMyCommands failed", { err }));

  if (config.telegram.mode === "webhook") {
    if (!config.publicUrl) throw new Error("TELEGRAM_MODE=webhook needs PUBLIC_URL");
    await api.setWebhook(`${config.publicUrl}/webhooks/telegram`, config.telegram.webhookSecret);
    logger.info("telegram: webhook registered", { url: `${config.publicUrl}/webhooks/telegram` });
    return () => {};
  }

  await api.deleteWebhook();
  logger.info("telegram: long polling started");
  let stopped = false;
  void (async () => {
    let offset = 0;
    while (!stopped) {
      try {
        const updates = (await api.getUpdates(offset, 25)) as TgUpdate[];
        for (const u of updates) {
          offset = u.update_id + 1;
          await handleTelegramUpdate(u, deps);
        }
      } catch (err) {
        if (stopped) break;
        logger.warn("telegram: polling error", { err });
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();
  return () => {
    stopped = true;
  };
}
