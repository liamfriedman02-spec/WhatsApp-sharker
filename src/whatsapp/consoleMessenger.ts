import type { Messenger, OutboundMessage, SendResult } from "./types.js";

/** Renders an outbound message as plain text (used by dry-run mode, the simulator and logs). */
export function renderMessage(message: OutboundMessage): string {
  switch (message.kind) {
    case "text":
      return message.text;
    case "buttons":
      return [
        message.header ? `*${message.header}*` : null,
        message.body,
        message.footer ? `_${message.footer}_` : null,
        message.buttons.map((b) => `[ ${b.title} ]`).join("  "),
      ]
        .filter(Boolean)
        .join("\n");
    case "list":
      return [
        message.header ? `*${message.header}*` : null,
        message.body,
        message.footer ? `_${message.footer}_` : null,
        `☰ ${message.buttonLabel}`,
        ...message.sections.flatMap((s) => [
          `  — ${s.title} —`,
          ...s.rows.map((r) => `  • ${r.title}${r.description ? ` · ${r.description}` : ""}`),
        ]),
      ]
        .filter(Boolean)
        .join("\n");
    case "cta":
      return [
        message.header ? `*${message.header}*` : null,
        message.body,
        message.footer ? `_${message.footer}_` : null,
        `[ ${message.cta.label} ↗ ] ${message.cta.url}`,
      ]
        .filter(Boolean)
        .join("\n");
    case "template":
      return `[template ${message.name}] params=${JSON.stringify(message.bodyParams)} buttons=${JSON.stringify(message.buttonParams)}`;
  }
}

/** Collects messages in memory instead of sending them. */
export class RecordingMessenger implements Messenger {
  readonly sent: { to: string; message: OutboundMessage }[] = [];
  readonly read: string[] = [];
  private seq = 0;

  constructor(private readonly onSend?: (to: string, message: OutboundMessage) => void) {}

  async send(to: string, message: OutboundMessage): Promise<SendResult> {
    this.sent.push({ to, message });
    this.onSend?.(to, message);
    return { messageId: `wamid.local.${++this.seq}` };
  }

  async markRead(messageId: string): Promise<void> {
    this.read.push(messageId);
  }

  to(phone: string): OutboundMessage[] {
    return this.sent.filter((s) => s.to === phone).map((s) => s.message);
  }

  clear(): void {
    this.sent.length = 0;
    this.read.length = 0;
  }
}
