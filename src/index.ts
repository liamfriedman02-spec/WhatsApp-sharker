import { assistantLabel } from "./ai/factory.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createHttpServer } from "./http/server.js";
import { createLogger } from "./logger.js";
import { startTelegram } from "./telegram/runtime.js";

const config = loadConfig();
const logger = createLogger(config.logLevel);
const app = createApp(config, logger);
const { http, queue } = createHttpServer(app);

const server = http.listen(config.port, () => {
  logger.info("Sharker Boss WhatsApp bot listening", {
    port: config.port,
    dryRun: config.whatsapp.dryRun,
    telegram: app.telegramApi ? config.telegram.mode : "disabled",
    ai: app.assistant ? assistantLabel(config) : "disabled",
  });
});

let stopTelegram: (() => void) | undefined;
if (app.telegramApi) {
  const api = app.telegramApi;
  // Retry with backoff so a Telegram hiccup at boot doesn't leave the webhook unregistered.
  const connect = (attempt: number): void => {
    startTelegram(config, { api, router: app.router, queue, logger })
      .then((stop) => (stopTelegram = stop))
      .catch((err) => {
        const delay = Math.min(30_000 * attempt, 300_000);
        logger.error("telegram: failed to start, retrying", { err, attempt, retryInSeconds: delay / 1000 });
        setTimeout(() => connect(attempt + 1), delay).unref();
      });
  };
  connect(1);
}

let timer: NodeJS.Timeout | undefined;
if (config.retention.enabled) {
  const everyMs = config.retention.intervalMinutes * 60_000;
  const tick = () => void app.retention.sweep().catch((err) => logger.error("retention sweep failed", { err }));
  timer = setInterval(tick, everyMs);
  setTimeout(tick, 10_000); // first sweep shortly after boot
  logger.info("retention engine scheduled", { everyMinutes: config.retention.intervalMinutes });
}

async function shutdown(signal: string) {
  logger.info("shutting down", { signal });
  if (timer) clearInterval(timer);
  stopTelegram?.();
  server.close();
  await queue.idle();
  app.store.close();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
