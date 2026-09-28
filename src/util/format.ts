export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function num(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function plural(n: number, one: string, many: string): string {
  return `${num(n)} ${n === 1 ? one : many}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const NETWORK_NAMES: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  twitter: "X",
  youtube: "YouTube",
  telegram: "Telegram",
  threads: "Threads",
};

export function networkName(n: string): string {
  return NETWORK_NAMES[n.toLowerCase()] ?? capitalize(n);
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function shortDate(iso: string, timeZone = "UTC"): string {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 10);
  }
}
