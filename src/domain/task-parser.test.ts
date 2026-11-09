import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks } from "./task-parser.ts";

const note = `---
tags: [x]
- [ ] not a task, frontmatter
---
# Title
- [ ] top
  - [x] child done
    - [/] grandchild in progress
- [-] cancelled
1. [ ] numbered
* [X] star bullet
> - [ ] in a quote
\`\`\`
- [ ] in code
\`\`\`
- [] not a task
Plain line
- [ ] after paragraph`;

test("finds tasks, skips frontmatter and code", () => {
  const t = parseTasks("a.md", note);
  assert.deepEqual(t.map((x) => x.text), [
    "top", "child done", "grandchild in progress", "cancelled", "numbered", "star bullet", "in a quote", "after paragraph",
  ]);
  assert.deepEqual(t.map((x) => x.status), ["open", "done", "in-progress", "cancelled", "open", "done", "open", "open"]);
  assert.deepEqual(t.slice(0, 4).map((x) => x.depth), [0, 1, 2, 0]);
  assert.equal(t[0].line, 5);
});

test("CRLF content keeps raw lines clean", () => {
  const t = parseTasks("a.md", "- [ ] one\r\n- [ ] two\r\n");
  assert.equal(t[1].raw, "- [ ] two");
});

test("identical lines get an occurrence index", () => {
  const t = parseTasks("a.md", "- [ ] same\n- [ ] other\n- [ ] same\n");
  assert.deepEqual(t.map((x) => [x.occurrence, x.occurrences]), [[0, 2], [0, 1], [1, 2]]);
});
