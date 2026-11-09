import { test } from "node:test";
import assert from "node:assert/strict";
import { count, describeDue, greeting, relativeTime } from "./format.ts";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 11, 8, 12);

test("relativeTime", () => {
  assert.equal(relativeTime(NOW - 10_000, NOW), "just now");
  assert.equal(relativeTime(NOW - 5 * 60_000, NOW), "5m ago");
  assert.equal(relativeTime(NOW - 3 * 3_600_000, NOW), "3h ago");
});

test("describeDue labels and states", () => {
  assert.equal(describeDue("2026-11-07", NOW).state, "overdue");
  assert.equal(describeDue("2026-11-07", NOW).label, "Yesterday");
  assert.equal(describeDue("2026-11-08", NOW).state, "today");
  assert.equal(describeDue("2026-11-09", NOW).label, "Tomorrow");
  assert.equal(describeDue("2026-11-12", NOW).state, "soon");
  assert.equal(describeDue("2026-12-25", NOW).state, "later");
});

test("greeting and count", () => {
  assert.equal(greeting(at(2026, 1, 1, 3)), "Good night");
  assert.equal(greeting(at(2026, 1, 1, 9)), "Good morning");
  assert.equal(greeting(at(2026, 1, 1, 14)), "Good afternoon");
  assert.equal(greeting(at(2026, 1, 1, 20)), "Good evening");
  assert.equal(count(1, "task", "tasks"), "1 task");
  assert.equal(count(2, "task", "tasks"), "2 tasks");
});
