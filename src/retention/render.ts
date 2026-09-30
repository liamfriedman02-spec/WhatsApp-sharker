import type { ContentCtx } from "../content/context.js";
import { ctaLink, ctaSuffix } from "../content/links.js";
import { MENU_QUICK_REPLY, fillTemplate, type NudgeTemplate } from "../content/nudges.js";
import { LIMITS, type OutboundMessage, type TemplateButtonParam } from "../whatsapp/types.js";

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
  const target = template.cta ? (template.ctaFor?.(ctx) ?? template.cta) : undefined;

  if (channel === "template") {
    const buttonParams: TemplateButtonParam[] = [];
    if (target) buttonParams.push({ type: "url", index: 0, suffix: ctaSuffix(target, template.name) });
    const offset = template.cta ? 1 : 0;
    (template.quickReplies ?? []).forEach((q, i) =>
      buttonParams.push({ type: "quick_reply", index: i + offset, payload: q.payload }),
    );
    return {
      message: { kind: "template", name: template.name, language, bodyParams: params, buttonParams },
      text,
    };
  }

  const quick = (template.quickReplies ?? []).map((q) => ({ id: q.payload, title: q.title }));
  if (target && template.sessionLinkInline && quick.length > 0) {
    // Keep the quick replies (e.g. ✅ Done) and put the Boss Hub link in the text.
    const body = `${text}\n\n🔗 ${ctaLink(target, ctx.hubUrl, template.name).url}`;
    return {
      message: { kind: "buttons", body: body.slice(0, LIMITS.interactiveBody), footer: template.footer, buttons: quick.slice(0, LIMITS.maxButtons) },
      text,
    };
  }
  if (target) {
    return {
      message: { kind: "cta", body: text, footer: template.footer, cta: ctaLink(target, ctx.hubUrl, template.name) },
      text,
    };
  }
  const buttons = quick.length > 0 ? quick : [{ id: MENU_QUICK_REPLY.payload, title: MENU_QUICK_REPLY.title }];
  return { message: { kind: "buttons", body: text, footer: template.footer, buttons }, text };
}
