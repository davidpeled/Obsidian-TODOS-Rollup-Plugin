import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketFor, daysAgo, dueStateOf, parseLocalDate } from "./calendar.ts";

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const NOW = at(2026, 11, 8, 12);

test("daysAgo counts calendar days, not 24h blocks", () => {
  assert.equal(daysAgo(at(2026, 11, 8, 0, 1), at(2026, 11, 8, 23, 59)), 0);
  assert.equal(daysAgo(at(2026, 11, 7, 23, 59), at(2026, 11, 8, 0, 1)), 1);
  assert.equal(daysAgo(at(2026, 11, 9), NOW), -1);
});

test("daysAgo is stable across DST changes", () => {
  assert.equal(daysAgo(at(2026, 3, 7, 12), at(2026, 3, 9, 12)), 2);
  assert.equal(daysAgo(at(2026, 10, 31, 12), at(2026, 11, 2, 12)), 2);
});

test("bucket boundaries", () => {
  assert.equal(bucketFor(NOW - 1000, NOW), "today");
  assert.equal(bucketFor(at(2026, 11, 7), NOW), "yesterday");
  assert.equal(bucketFor(at(2026, 11, 2), NOW), "week"); // 6 days
  assert.equal(bucketFor(at(2026, 11, 1), NOW), "month"); // 7 days
  assert.equal(bucketFor(at(2026, 10, 9), NOW), "month"); // 30 days
  assert.equal(bucketFor(at(2026, 10, 8), NOW), "older"); // 31 days
});

test("due state", () => {
  assert.equal(dueStateOf(-1), "overdue");
  assert.equal(dueStateOf(0), "today");
  assert.equal(dueStateOf(6), "soon");
  assert.equal(dueStateOf(7), "later");
});

test("parseLocalDate is local midnight", () => {
  const d = new Date(parseLocalDate("2026-11-08"));
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 10, 8, 0]);
});
