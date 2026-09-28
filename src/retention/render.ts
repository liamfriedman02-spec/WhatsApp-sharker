import type { ContentCtx } from "../content/context.js";
import { ctaLink, ctaSuffix } from "../content/links.js";
import { MENU_QUICK_REPLY, fillTemplate, type NudgeTemplate } from "../content/nudges.js";
import type { OutboundMessage, TemplateButtonParam } from "../whatsapp/types.js";

export type Channel = "session" | "template";

/** Renders a nudge as a free-form message (inside the 24h window) or as its approved template. */
export function renderNudge(
  template: NudgeTemplate,
  ctx: ContentCtx,
  channel: Channel,
  language: string,
): { message: OutboundMessage; text: string } {
  const params = template.params(ctx);
  const text = fillTemplate(template.body, params);

  if (channel === "template") {
    const buttonParams: TemplateButtonParam[] = [];
    if (template.cta) buttonParams.push({ type: "url", index: 0, suffix: ctaSuffix(template.cta, template.name) });
    const offset = template.cta ? 1 : 0;
    (template.quickReplies ?? []).forEach((q, i) =>
      buttonParams.push({ type: "quick_reply", index: i + offset, payload: q.payload }),
    );
    return {
      message: { kind: "template", name: template.name, language, bodyParams: params, buttonParams },
      text,
    };
  }

  if (template.cta) {
    return {
      message: { kind: "cta", body: text, footer: template.footer, cta: ctaLink(template.cta, ctx.hubUrl, template.name) },
      text,
    };
  }
  const buttons = (template.quickReplies ?? [MENU_QUICK_REPLY]).map((q) => ({ id: q.payload, title: q.title }));
  return { message: { kind: "buttons", body: text, footer: template.footer, buttons }, text };
}
