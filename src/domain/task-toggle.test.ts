import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks } from "./task-parser.ts";
import { toggleTaskInContent } from "./task-toggle.ts";

const note = "# T\n- [ ] top\n  - [x] child\n";

test("flips the right line and survives shifted lines", () => {
  const [top, child] = parseTasks("a.md", note);
  assert.equal(toggleTaskInContent(note, top, true), "# T\n- [x] top\n  - [x] child\n");
  assert.equal(toggleTaskInContent("new first line\n" + note, top, true), "new first line\n# T\n- [x] top\n  - [x] child\n");
  assert.equal(toggleTaskInContent(note, child, false), "# T\n- [ ] top\n  - [ ] child\n");
  assert.throws(() => toggleTaskInContent("nothing here", top, true));
});

test("CRLF content", () => {
  const c = "- [ ] one\r\n- [ ] two\r\n";
  const t = parseTasks("a.md", c);
  assert.equal(toggleTaskInContent(c, t[1], true), "- [ ] one\r\n- [x] two\r\n");
});

test("duplicate lines are told apart by order, and refused when the count changes", () => {
  const c = "- [ ] same\n- [ ] same\n";
  const [first, second] = parseTasks("a.md", c);
  assert.equal(toggleTaskInContent(c, second, true), "- [ ] same\n- [x] same\n");
  assert.equal(toggleTaskInContent(c, first, true), "- [x] same\n- [ ] same\n");
  // Shifted down by a line: the second duplicate is still found, not the first.
  assert.equal(toggleTaskInContent("new\n" + c, second, true), "new\n- [ ] same\n- [x] same\n");
  // A third copy appeared: we can't know which one was meant, so refuse.
  assert.throws(() => toggleTaskInContent(c + "- [ ] same\n", second, true));
  // One copy was removed: the survivor is now unique, so it is found by text.
  assert.equal(toggleTaskInContent("- [ ] same\n", first, true), "- [x] same\n");
});
