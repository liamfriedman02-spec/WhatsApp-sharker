/**
 * Our copy is written in WhatsApp style (*bold*, _italic_). Telegram gets it as HTML, which
 * is robust: URLs (full of "_" in utm parameters) are left untouched instead of breaking
 * Markdown parsing.
 */
const URL_RE = /(https?:\/\/[^\s<>]+)/g;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatSegment(s: string): string {
  return escapeHtml(s)
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
    .replace(/(^|[^\p{L}\p{N}_])_([^_\n]+)_(?![\p{L}\p{N}_])/gu, "$1<i>$2</i>");
}

export function toTelegramHtml(text: string): string {
  return text
    .split(URL_RE)
    .map((part, i) => (i % 2 === 1 ? escapeHtml(retag(part)) : formatSegment(part)))
    .join("");
}

/** Links are built with utm_source=whatsapp; attribute Telegram traffic correctly. */
export function retag(url: string): string {
  return url.replace("utm_source=whatsapp", "utm_source=telegram");
}
