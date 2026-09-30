import { z } from "zod";

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0", "yes", "no"])
    .optional()
    .transform((v) => (v === undefined ? fallback : ["true", "1", "yes"].includes(v)));

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_PATH: z.string().default("./data/sharker-bot.db"),

  // WhatsApp Cloud API (Meta)
  WHATSAPP_ACCESS_TOKEN: optionalString,
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_VERIFY_TOKEN: optionalString,
  WHATSAPP_APP_SECRET: optionalString,
  WHATSAPP_API_VERSION: z.string().default("v23.0"),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en"),
  /** Log outbound messages instead of calling the Cloud API. */
  WHATSAPP_DRY_RUN: bool(false),

  // Claude (free-text support assistant)
  ANTHROPIC_API_KEY: optionalString,
  CLAUDE_MODEL: z.string().default("claude-opus-5"),
  CLAUDE_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("low"),
  /** Server-side refusal fallback (Claude API). Disable for platforms/models without it. */
  CLAUDE_REFUSAL_FALLBACK: bool(true),
  AI_ASSISTANT_ENABLED: bool(true),

  // Sharker platform
  SHARKER_API_BASE_URL: optionalString,
  SHARKER_API_KEY: optionalString,
  SHARKER_WEBHOOK_SECRET: optionalString,
  BOSS_HUB_URL: z.string().url().default("https://hub.sharker.example"),
  /** Demo mode only (no SHARKER_API_BASE_URL): your WhatsApp number becomes a demo Boss. */
  DEMO_BOSS_PHONE: optionalString,
  DEMO_BOSS_ID: z.enum(["boss_ana", "boss_bruno", "boss_carla", "boss_diego"]).default("boss_ana"),

  // Human support
  SUPPORT_WEBHOOK_URL: optionalString,
  SUPPORT_HOURS: z.string().default("Mon–Fri, 9:00–18:00"),
  HANDOFF_TIMEOUT_HOURS: z.coerce.number().positive().default(24),

  // Admin API
  ADMIN_API_KEY: optionalString,

  // Retention engine
  RETENTION_ENABLED: bool(true),
  RETENTION_INTERVAL_MINUTES: z.coerce.number().positive().default(60),
  DEFAULT_TIMEZONE: z.string().default("UTC"),
  QUIET_HOURS_START: z.coerce.number().int().min(0).max(23).default(21),
  QUIET_HOURS_END: z.coerce.number().int().min(0).max(23).default(9),
  MAX_NUDGES_PER_DAY: z.coerce.number().int().min(1).default(2),
  MAX_REMINDERS_PER_DAY: z.coerce.number().int().min(1).default(1),
});

export type Env = z.infer<typeof EnvSchema>;

export interface Config {
  env: Env["NODE_ENV"];
  port: number;
  logLevel: Env["LOG_LEVEL"];
  databasePath: string;
  whatsapp: {
    accessToken?: string;
    phoneNumberId?: string;
    verifyToken?: string;
    appSecret?: string;
    apiVersion: string;
    templateLanguage: string;
    dryRun: boolean;
  };
  ai: {
    enabled: boolean;
    apiKey?: string;
    model: string;
    effort: Env["CLAUDE_EFFORT"];
    refusalFallback: boolean;
  };
  sharker: {
    apiBaseUrl?: string;
    apiKey?: string;
    webhookSecret?: string;
    bossHubUrl: string;
    demoBossPhone?: string;
    demoBossId: string;
  };
  support: {
    webhookUrl?: string;
    hours: string;
    handoffTimeoutHours: number;
  };
  adminApiKey?: string;
  retention: {
    enabled: boolean;
    intervalMinutes: number;
    defaultTimezone: string;
    quietHoursStart: number;
    quietHoursEnd: number;
    maxNudgesPerDay: number;
    maxRemindersPerDay: number;
  };
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const e = parsed.data;
  const config: Config = {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databasePath: e.DATABASE_PATH,
    whatsapp: {
      accessToken: e.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID,
      verifyToken: e.WHATSAPP_VERIFY_TOKEN,
      appSecret: e.WHATSAPP_APP_SECRET,
      apiVersion: e.WHATSAPP_API_VERSION,
      templateLanguage: e.WHATSAPP_TEMPLATE_LANGUAGE,
      dryRun: e.WHATSAPP_DRY_RUN || !e.WHATSAPP_ACCESS_TOKEN || !e.WHATSAPP_PHONE_NUMBER_ID,
    },
    ai: {
      enabled: e.AI_ASSISTANT_ENABLED,
      apiKey: e.ANTHROPIC_API_KEY,
      model: e.CLAUDE_MODEL,
      effort: e.CLAUDE_EFFORT,
      refusalFallback: e.CLAUDE_REFUSAL_FALLBACK,
    },
    sharker: {
      apiBaseUrl: e.SHARKER_API_BASE_URL,
      apiKey: e.SHARKER_API_KEY,
      webhookSecret: e.SHARKER_WEBHOOK_SECRET,
      bossHubUrl: e.BOSS_HUB_URL.replace(/\/+$/, ""),
      demoBossPhone: e.DEMO_BOSS_PHONE?.replace(/\D/g, ""),
      demoBossId: e.DEMO_BOSS_ID,
    },
    support: {
      webhookUrl: e.SUPPORT_WEBHOOK_URL,
      hours: e.SUPPORT_HOURS,
      handoffTimeoutHours: e.HANDOFF_TIMEOUT_HOURS,
    },
    adminApiKey: e.ADMIN_API_KEY,
    retention: {
      enabled: e.RETENTION_ENABLED,
      intervalMinutes: e.RETENTION_INTERVAL_MINUTES,
      defaultTimezone: e.DEFAULT_TIMEZONE,
      quietHoursStart: e.QUIET_HOURS_START,
      quietHoursEnd: e.QUIET_HOURS_END,
      maxNudgesPerDay: e.MAX_NUDGES_PER_DAY,
      maxRemindersPerDay: e.MAX_REMINDERS_PER_DAY,
    },
  };

  if (config.env === "production") {
    const missing: string[] = [];
    if (!config.whatsapp.accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
    if (!config.whatsapp.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
    if (!config.whatsapp.verifyToken) missing.push("WHATSAPP_VERIFY_TOKEN");
    if (!config.whatsapp.appSecret) missing.push("WHATSAPP_APP_SECRET");
    if (!config.sharker.apiBaseUrl) missing.push("SHARKER_API_BASE_URL");
    if (!config.sharker.webhookSecret) missing.push("SHARKER_WEBHOOK_SECRET");
    if (!config.adminApiKey) missing.push("ADMIN_API_KEY");
    if (missing.length > 0) {
      throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
    }
  }
  return config;
}
