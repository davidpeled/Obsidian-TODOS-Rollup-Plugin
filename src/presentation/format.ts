// Turns domain values into the words and dates people read.
import { daysAgo, dueStateOf, daysUntil, parseLocalDate, type Bucket, type DueState } from "../domain/calendar.ts";

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const short = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const shortYear = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const full = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" });
const headerDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const plural = new Intl.PluralRules("en-US");

function absolute(t: number, now: number): string {
  return new Date(t).getFullYear() === new Date(now).getFullYear() ? short.format(t) : shortYear.format(t);
}

/** "just now", "5m ago", "3h ago", "yesterday", "3 days ago", then an absolute date after a week. */
export function relativeTime(t: number, now: number): string {
  const diff = now - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  const days = daysAgo(t, now);
  if (days === 0) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (days < 7) return rtf.format(-days, "day");
  return absolute(t, now);
}

export const fullDate = (t: number) => full.format(t);
export const formatHeaderDate = (t: number) => headerDate.format(t);

export const BUCKET_LABEL: Record<Bucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Earlier this week",
  month: "This month",
  older: "Older",
};

export function describeDue(due: string, now: number): { label: string; state: DueState; title: string } {
  const t = parseLocalDate(due);
  const d = daysUntil(due, now);
  const state = dueStateOf(d);
  const title = `Due ${shortYear.format(t)}`;
  if (d < 0) return { label: d === -1 ? "Yesterday" : absolute(t, now), state, title };
  if (d === 0) return { label: "Today", state, title };
  if (d === 1) return { label: "Tomorrow", state, title };
  if (d < 7) return { label: weekday.format(t), state, title };
  return { label: absolute(t, now), state, title };
}

export function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function count(n: number, one: string, many: string): string {
  return `${n} ${plural.select(n) === "one" ? one : many}`;
}
