// Calendar rules: which day something falls on, how stale a note is, how urgent a due date is.

const DAY = 86_400_000;

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar-day difference: 0 = today, 1 = yesterday, -1 = tomorrow. */
export function daysAgo(t: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(t)) / DAY);
}

/** Parse a YYYY-MM-DD as a local date. */
export function parseLocalDate(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export type Bucket = "today" | "yesterday" | "week" | "month" | "older";

export function bucketFor(t: number, now: number): Bucket {
  const d = daysAgo(t, now);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return "week";
  if (d < 31) return "month";
  return "older";
}

export type DueState = "overdue" | "today" | "soon" | "later";

/** Days from `now` until the due date (negative when overdue). */
export const daysUntil = (due: string, now: number) => -daysAgo(parseLocalDate(due), now);

export function dueStateOf(days: number): DueState {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days < 7) return "soon";
  return "later";
}
