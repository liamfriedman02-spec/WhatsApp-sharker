import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createHttpServer } from "./http/server.js";
import { createLogger } from "./logger.js";

const config = loadConfig();
const logger = createLogger(config.logLevel);
const app = createApp(config, logger);
const { http, queue } = createHttpServer(app);

const server = http.listen(config.port, () => {
  logger.info("Sharker Boss WhatsApp bot listening", {
    port: config.port,
    dryRun: config.whatsapp.dryRun,
    ai: app.assistant ? config.ai.model : "disabled",
  });
});

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
  server.close();
  await queue.idle();
  app.store.close();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
