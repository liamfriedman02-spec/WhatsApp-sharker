export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export function daysBetween(fromIso: string | null, now: Date): number | null {
  if (!fromIso) return null;
  return (now.getTime() - new Date(fromIso).getTime()) / DAY;
}

export interface LocalTime {
  hour: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** YYYY-MM-DD in the local timezone */
  date: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function localTime(now: Date, timeZone: string): LocalTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    return localTime(now, "UTC");
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    hour: Number(get("hour")) % 24,
    weekday: WEEKDAYS.indexOf(get("weekday")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/** True when `hour` falls in the [start, end) quiet window, which may wrap midnight. */
export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
