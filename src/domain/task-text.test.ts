import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTaskText } from "./task-text.ts";

test("metadata and tokens", () => {
  const p = parseTaskText("Ship [[Plan|the plan]] #work `v2` 📅 2026-11-10 ⏫ ✅ 2026-11-01");
  assert.equal(p.due, "2026-11-10");
  assert.equal(p.priority, "high");
  assert.deepEqual(p.tokens.map((t) => t.kind), ["text", "wikilink", "text", "tag", "text", "code"]);
  assert.equal(parseTaskText("snake_case_name stays").tokens.length, 1);
  assert.equal(parseTaskText("[due:: 2026-01-02] dv").due, "2026-01-02");
});

const kinds = (s: string) => parseTaskText(s).tokens.map((t) => t.kind);

test("only web and mail links become clickable", () => {
  assert.deepEqual(kinds("[a](https://x.com)"), ["link"]);
  assert.deepEqual(kinds("[a](mailto:me@x.com)"), ["link"]);
  assert.deepEqual(kinds("[a](javascript:alert(1))"), ["text"]);
  assert.deepEqual(kinds("[a](data:text/html,x)"), ["text"]);
});
