import { LIMITS, type OutboundMessage } from "./types.js";

/** Returns the WhatsApp limit violations of a message (empty = valid). */
export function validateMessage(m: OutboundMessage): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) errors.push(msg);
  };
  const headerFooter = (header?: string, footer?: string) => {
    if (header) check(header.length <= LIMITS.header, `header too long (${header.length}): ${header}`);
    if (footer) check(footer.length <= LIMITS.footer, `footer too long (${footer.length}): ${footer}`);
  };

  switch (m.kind) {
    case "text":
      check(m.text.length > 0 && m.text.length <= LIMITS.textBody, `text length ${m.text.length}`);
      break;
    case "buttons":
      headerFooter(m.header, m.footer);
      check(m.body.length <= LIMITS.interactiveBody, `body too long (${m.body.length})`);
      check(m.buttons.length >= 1 && m.buttons.length <= LIMITS.maxButtons, `buttons count ${m.buttons.length}`);
      check(new Set(m.buttons.map((b) => b.id)).size === m.buttons.length, "duplicate button ids");
      for (const b of m.buttons) {
        check(b.title.length <= LIMITS.buttonTitle, `button title too long (${b.title.length}): ${b.title}`);
        check(b.id.length <= LIMITS.buttonId, `button id too long: ${b.id}`);
      }
      break;
    case "list": {
      headerFooter(m.header, m.footer);
      check(m.body.length <= LIMITS.interactiveBody, `body too long (${m.body.length})`);
      check(m.buttonLabel.length <= LIMITS.listButtonLabel, `list button label too long: ${m.buttonLabel}`);
      const rows = m.sections.flatMap((s) => s.rows);
      check(rows.length >= 1 && rows.length <= LIMITS.maxRows, `row count ${rows.length}`);
      check(new Set(rows.map((r) => r.id)).size === rows.length, "duplicate row ids");
      for (const s of m.sections) check(s.title.length <= LIMITS.sectionTitle, `section title too long: ${s.title}`);
      for (const r of rows) {
        check(r.title.length <= LIMITS.rowTitle, `row title too long (${r.title.length}): ${r.title}`);
        check(!r.description || r.description.length <= LIMITS.rowDescription, `row description too long (${r.description?.length}): ${r.description}`);
        check(r.id.length <= LIMITS.rowId, `row id too long: ${r.id}`);
      }
      break;
    }
    case "cta":
      headerFooter(m.header, m.footer);
      check(m.body.length <= LIMITS.interactiveBody, `body too long (${m.body.length})`);
      check(m.cta.label.length <= LIMITS.ctaLabel, `cta label too long: ${m.cta.label}`);
      check(/^https:\/\//.test(m.cta.url), `cta url must be https: ${m.cta.url}`);
      break;
    case "template":
      check(/^[a-z0-9_]+$/.test(m.name), `bad template name: ${m.name}`);
      for (const p of m.bodyParams) check(!/[\n\t]| {5,}/.test(p) && p.length > 0, `bad template param: ${JSON.stringify(p)}`);
      break;
  }
  return errors;
}
