import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { defaultCoachState, type CoachState, type MissionRecord, type StatSnapshot } from "../coach/types.js";

export type DigestPref = "daily" | "weekly" | "off";

/**
 * bot              – normal assistant mode
 * awaiting_handoff – Boss asked for a human; the next message becomes the ticket description
 * human            – a support specialist owns the conversation; the bot stays quiet
 */
export type ConversationMode = "bot" | "awaiting_handoff" | "human";

export type Flow = { type: "guide"; guideId: string; step: number };

export interface BossState {
  bossId: string;
  phone: string;
  optedOut: boolean;
  digest: DigestPref;
  mode: ConversationMode;
  flow: Flow | null;
  /** Last message from the Boss on any channel (engagement, "is chatting"). */
  lastInboundAt: string | null;
  /** Last WhatsApp message from the Boss (opens WhatsApp's 24h free-form window). */
  waLastInboundAt: string | null;
  /** Channel the Boss last used — proactive messages go there. */
  channel: "whatsapp" | "telegram";
  telegramChatId: string | null;
  handoffId: number | null;
  updatedAt: string;
}

export interface TelegramLink {
  chatId: string;
  bossId: string;
  phone: string;
  linkedAt: string;
}

export interface MessageRecord {
  direction: "in" | "out";
  text: string;
  source: string;
  createdAt: string;
}

export type NudgeCategory = "milestone" | "reminder" | "digest";

export interface NudgeRecord {
  bossId: string;
  trigger: string;
  category: NudgeCategory;
  channel: "session" | "template";
  step: number;
  messageId: string | null;
  sentAt: string;
}

export interface SeriesState {
  count: number;
  lastSentAt: string;
}

export interface Handoff {
  id: number;
  bossId: string;
  phone: string;
  status: "open" | "resolved";
  topic: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Persistence for conversation state, the proactive-message log and handoffs.
 * The interface is async so it can be swapped for Postgres/Redis without touching callers.
 */
export interface Store {
  getState(bossId: string, phone: string): Promise<BossState>;
  /** Persists the state as given (callers stamp `updatedAt` with their clock). */
  saveState(state: BossState): Promise<void>;

  logMessage(bossId: string, direction: "in" | "out", text: string, source: string, at?: Date): Promise<void>;
  recentMessages(bossId: string, limit: number): Promise<MessageRecord[]>;

  /** Returns true the first time an id is seen (webhook de-duplication). */
  markProcessed(kind: "message" | "event", id: string): Promise<boolean>;

  recordNudge(nudge: NudgeRecord): Promise<void>;
  nudgesSince(bossId: string, since: Date): Promise<NudgeRecord[]>;
  hasEverSent(bossId: string, trigger: string): Promise<boolean>;
  /** trigger id → ISO timestamp of the most recent send. */
  lastSentByTrigger(bossId: string): Promise<Record<string, string>>;
  getSeries(bossId: string, trigger: string): Promise<SeriesState | null>;
  bumpSeries(bossId: string, trigger: string, at: Date): Promise<SeriesState>;
  resetSeries(bossId: string, trigger: string): Promise<void>;

  createHandoff(bossId: string, phone: string, topic: string | null, summary: string | null): Promise<Handoff>;
  getHandoff(id: number): Promise<Handoff | null>;
  listHandoffs(status?: Handoff["status"]): Promise<Handoff[]>;
  updateHandoff(id: number, patch: Partial<Pick<Handoff, "status" | "summary">>): Promise<void>;

  getCoachState(bossId: string): Promise<CoachState>;
  saveCoachState(bossId: string, state: CoachState): Promise<void>;

  assignMission(bossId: string, missionId: string, date: string, at: Date): Promise<MissionRecord>;
  /** Missions assigned for local dates >= sinceDate (YYYY-MM-DD), oldest first. */
  missionsSince(bossId: string, sinceDate: string): Promise<MissionRecord[]>;
  updateMission(id: number, status: MissionRecord["status"], completedAt: Date | null): Promise<void>;

  saveSnapshot(bossId: string, snapshot: StatSnapshot): Promise<void>;
  /** Snapshots for local dates >= sinceDate, oldest first. */
  snapshotsSince(bossId: string, sinceDate: string): Promise<StatSnapshot[]>;

  getTelegramLink(chatId: string): Promise<TelegramLink | null>;
  saveTelegramLink(link: TelegramLink): Promise<void>;

  close(): void;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS boss_state (
  boss_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  opted_out INTEGER NOT NULL DEFAULT 0,
  digest TEXT NOT NULL DEFAULT 'weekly',
  mode TEXT NOT NULL DEFAULT 'bot',
  flow_json TEXT,
  last_inbound_at TEXT,
  handoff_id INTEGER,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  text TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_boss ON messages(boss_id, id);
CREATE TABLE IF NOT EXISTS nudges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  step INTEGER NOT NULL,
  message_id TEXT,
  sent_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS nudges_boss ON nudges(boss_id, sent_at);
CREATE TABLE IF NOT EXISTS trigger_series (
  boss_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  count INTEGER NOT NULL,
  last_sent_at TEXT NOT NULL,
  PRIMARY KEY (boss_id, trigger)
);
CREATE TABLE IF NOT EXISTS handoffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  topic TEXT,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coach_state (
  boss_id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS missions_boss ON missions(boss_id, date);
CREATE TABLE IF NOT EXISTS snapshots (
  boss_id TEXT NOT NULL,
  date TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (boss_id, date)
);
CREATE TABLE IF NOT EXISTS telegram_links (
  chat_id TEXT PRIMARY KEY,
  boss_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  linked_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS processed (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
`;

type Row = Record<string, unknown>;

export class SqliteStore implements Store {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(SCHEMA);
    // Columns added after the first release (existing databases are upgraded in place).
    this.addColumns("boss_state", {
      wa_last_inbound_at: "TEXT",
      channel: "TEXT NOT NULL DEFAULT 'whatsapp'",
      telegram_chat_id: "TEXT",
    });
  }

  private addColumns(table: string, columns: Record<string, string>): void {
    const existing = new Set((this.db.prepare(`PRAGMA table_info(${table})`).all() as Row[]).map((r) => String(r.name)));
    for (const [name, def] of Object.entries(columns)) {
      if (!existing.has(name)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    }
  }

  async getState(bossId: string, phone: string): Promise<BossState> {
    const row = this.db.prepare("SELECT * FROM boss_state WHERE boss_id = ?").get(bossId) as Row | undefined;
    if (!row) {
      return {
        bossId,
        phone,
        optedOut: false,
        digest: "weekly",
        mode: "bot",
        flow: null,
        lastInboundAt: null,
        waLastInboundAt: null,
        channel: "whatsapp",
        telegramChatId: null,
        handoffId: null,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      bossId,
      phone: String(row.phone),
      optedOut: Number(row.opted_out) === 1,
      digest: row.digest as DigestPref,
      mode: row.mode as ConversationMode,
      flow: row.flow_json ? (JSON.parse(String(row.flow_json)) as Flow) : null,
      lastInboundAt: (row.last_inbound_at as string | null) ?? null,
      waLastInboundAt: (row.wa_last_inbound_at as string | null) ?? null,
      channel: row.channel === "telegram" ? "telegram" : "whatsapp",
      telegramChatId: (row.telegram_chat_id as string | null) ?? null,
      handoffId: row.handoff_id === null || row.handoff_id === undefined ? null : Number(row.handoff_id),
      updatedAt: String(row.updated_at),
    };
  }

  async saveState(s: BossState): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO boss_state (boss_id, phone, opted_out, digest, mode, flow_json, last_inbound_at, wa_last_inbound_at,
                                 channel, telegram_chat_id, handoff_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(boss_id) DO UPDATE SET
           phone = excluded.phone, opted_out = excluded.opted_out, digest = excluded.digest, mode = excluded.mode,
           flow_json = excluded.flow_json, last_inbound_at = excluded.last_inbound_at,
           wa_last_inbound_at = excluded.wa_last_inbound_at, channel = excluded.channel,
           telegram_chat_id = excluded.telegram_chat_id, handoff_id = excluded.handoff_id, updated_at = excluded.updated_at`,
      )
      .run(
        s.bossId,
        s.phone,
        s.optedOut ? 1 : 0,
        s.digest,
        s.mode,
        s.flow ? JSON.stringify(s.flow) : null,
        s.lastInboundAt,
        s.waLastInboundAt,
        s.channel,
        s.telegramChatId,
        s.handoffId,
        s.updatedAt,
      );
  }

  async logMessage(bossId: string, direction: "in" | "out", text: string, source: string, at = new Date()): Promise<void> {
    this.db
      .prepare("INSERT INTO messages (boss_id, direction, text, source, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(bossId, direction, text, source, at.toISOString());
  }

  async recentMessages(bossId: string, limit: number): Promise<MessageRecord[]> {
    const rows = this.db
      .prepare("SELECT direction, text, source, created_at FROM messages WHERE boss_id = ? ORDER BY id DESC LIMIT ?")
      .all(bossId, limit) as Row[];
    return rows.reverse().map((r) => ({
      direction: r.direction as "in" | "out",
      text: String(r.text),
      source: String(r.source),
      createdAt: String(r.created_at),
    }));
  }

  async markProcessed(kind: "message" | "event", id: string): Promise<boolean> {
    const res = this.db
      .prepare("INSERT OR IGNORE INTO processed (kind, id, created_at) VALUES (?, ?, ?)")
      .run(kind, id, new Date().toISOString());
    return Number(res.changes) > 0;
  }

  async recordNudge(n: NudgeRecord): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO nudges (boss_id, trigger, category, channel, step, message_id, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(n.bossId, n.trigger, n.category, n.channel, n.step, n.messageId, n.sentAt);
  }

  async nudgesSince(bossId: string, since: Date): Promise<NudgeRecord[]> {
    const rows = this.db
      .prepare("SELECT * FROM nudges WHERE boss_id = ? AND sent_at >= ? ORDER BY sent_at ASC")
      .all(bossId, since.toISOString()) as Row[];
    return rows.map((r) => ({
      bossId: String(r.boss_id),
      trigger: String(r.trigger),
      category: r.category as NudgeCategory,
      channel: r.channel as "session" | "template",
      step: Number(r.step),
      messageId: (r.message_id as string | null) ?? null,
      sentAt: String(r.sent_at),
    }));
  }

  async hasEverSent(bossId: string, trigger: string): Promise<boolean> {
    return !!this.db.prepare("SELECT 1 FROM nudges WHERE boss_id = ? AND trigger = ? LIMIT 1").get(bossId, trigger);
  }

  async lastSentByTrigger(bossId: string): Promise<Record<string, string>> {
    const rows = this.db
      .prepare("SELECT trigger, MAX(sent_at) AS last FROM nudges WHERE boss_id = ? GROUP BY trigger")
      .all(bossId) as Row[];
    return Object.fromEntries(rows.map((r) => [String(r.trigger), String(r.last)]));
  }

  async getSeries(bossId: string, trigger: string): Promise<SeriesState | null> {
    const row = this.db
      .prepare("SELECT count, last_sent_at FROM trigger_series WHERE boss_id = ? AND trigger = ?")
      .get(bossId, trigger) as Row | undefined;
    return row ? { count: Number(row.count), lastSentAt: String(row.last_sent_at) } : null;
  }

  async bumpSeries(bossId: string, trigger: string, at: Date): Promise<SeriesState> {
    this.db
      .prepare(
        `INSERT INTO trigger_series (boss_id, trigger, count, last_sent_at) VALUES (?, ?, 1, ?)
         ON CONFLICT(boss_id, trigger) DO UPDATE SET count = count + 1, last_sent_at = excluded.last_sent_at`,
      )
      .run(bossId, trigger, at.toISOString());
    return (await this.getSeries(bossId, trigger))!;
  }

  async resetSeries(bossId: string, trigger: string): Promise<void> {
    this.db.prepare("DELETE FROM trigger_series WHERE boss_id = ? AND trigger = ?").run(bossId, trigger);
  }

  async createHandoff(bossId: string, phone: string, topic: string | null, summary: string | null): Promise<Handoff> {
    const now = new Date().toISOString();
    const res = this.db
      .prepare(
        "INSERT INTO handoffs (boss_id, phone, status, topic, summary, created_at, updated_at) VALUES (?, ?, 'open', ?, ?, ?, ?)",
      )
      .run(bossId, phone, topic, summary, now, now);
    return (await this.getHandoff(Number(res.lastInsertRowid)))!;
  }

  async getHandoff(id: number): Promise<Handoff | null> {
    const row = this.db.prepare("SELECT * FROM handoffs WHERE id = ?").get(id) as Row | undefined;
    return row ? toHandoff(row) : null;
  }

  async listHandoffs(status?: Handoff["status"]): Promise<Handoff[]> {
    const rows = (
      status
        ? this.db.prepare("SELECT * FROM handoffs WHERE status = ? ORDER BY id DESC").all(status)
        : this.db.prepare("SELECT * FROM handoffs ORDER BY id DESC").all()
    ) as Row[];
    return rows.map(toHandoff);
  }

  async updateHandoff(id: number, patch: Partial<Pick<Handoff, "status" | "summary">>): Promise<void> {
    const current = await this.getHandoff(id);
    if (!current) return;
    this.db
      .prepare("UPDATE handoffs SET status = ?, summary = ?, updated_at = ? WHERE id = ?")
      .run(patch.status ?? current.status, patch.summary ?? current.summary, new Date().toISOString(), id);
  }

  async getCoachState(bossId: string): Promise<CoachState> {
    const row = this.db.prepare("SELECT json FROM coach_state WHERE boss_id = ?").get(bossId) as Row | undefined;
    return row ? { ...defaultCoachState(), ...(JSON.parse(String(row.json)) as Partial<CoachState>) } : defaultCoachState();
  }

  async saveCoachState(bossId: string, state: CoachState): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO coach_state (boss_id, json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(boss_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      )
      .run(bossId, JSON.stringify(state), new Date().toISOString());
  }

  async assignMission(bossId: string, missionId: string, date: string, at: Date): Promise<MissionRecord> {
    const res = this.db
      .prepare("INSERT INTO missions (boss_id, mission_id, date, status, assigned_at) VALUES (?, ?, ?, 'open', ?)")
      .run(bossId, missionId, date, at.toISOString());
    const row = this.db.prepare("SELECT * FROM missions WHERE id = ?").get(Number(res.lastInsertRowid)) as Row;
    return toMission(row);
  }

  async missionsSince(bossId: string, sinceDate: string): Promise<MissionRecord[]> {
    const rows = this.db
      .prepare("SELECT * FROM missions WHERE boss_id = ? AND date >= ? ORDER BY date ASC, id ASC")
      .all(bossId, sinceDate) as Row[];
    return rows.map(toMission);
  }

  async updateMission(id: number, status: MissionRecord["status"], completedAt: Date | null): Promise<void> {
    this.db.prepare("UPDATE missions SET status = ?, completed_at = ? WHERE id = ?").run(status, completedAt?.toISOString() ?? null, id);
  }

  async saveSnapshot(bossId: string, snapshot: StatSnapshot): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO snapshots (boss_id, date, json) VALUES (?, ?, ?)
         ON CONFLICT(boss_id, date) DO UPDATE SET json = excluded.json`,
      )
      .run(bossId, snapshot.date, JSON.stringify(snapshot));
  }

  async snapshotsSince(bossId: string, sinceDate: string): Promise<StatSnapshot[]> {
    const rows = this.db
      .prepare("SELECT json FROM snapshots WHERE boss_id = ? AND date >= ? ORDER BY date ASC")
      .all(bossId, sinceDate) as Row[];
    return rows.map((r) => JSON.parse(String(r.json)) as StatSnapshot);
  }

  async getTelegramLink(chatId: string): Promise<TelegramLink | null> {
    const row = this.db.prepare("SELECT * FROM telegram_links WHERE chat_id = ?").get(chatId) as Row | undefined;
    return row
      ? { chatId: String(row.chat_id), bossId: String(row.boss_id), phone: String(row.phone), linkedAt: String(row.linked_at) }
      : null;
  }

  async saveTelegramLink(link: TelegramLink): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO telegram_links (chat_id, boss_id, phone, linked_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(chat_id) DO UPDATE SET boss_id = excluded.boss_id, phone = excluded.phone, linked_at = excluded.linked_at`,
      )
      .run(link.chatId, link.bossId, link.phone, link.linkedAt);
  }

  close(): void {
    this.db.close();
  }
}

function toMission(r: Row): MissionRecord {
  return {
    id: Number(r.id),
    bossId: String(r.boss_id),
    missionId: String(r.mission_id),
    date: String(r.date),
    status: r.status as MissionRecord["status"],
    assignedAt: String(r.assigned_at),
    completedAt: (r.completed_at as string | null) ?? null,
  };
}

function toHandoff(r: Row): Handoff {
  return {
    id: Number(r.id),
    bossId: String(r.boss_id),
    phone: String(r.phone),
    status: r.status as Handoff["status"],
    topic: (r.topic as string | null) ?? null,
    summary: (r.summary as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
