import { test } from "node:test";
import assert from "node:assert/strict";
import type { NoteWithContent } from "../domain/note.ts";
import type { NoteRepository } from "../domain/ports.ts";
import type { Task } from "../domain/task.ts";
import { TodoBoard, type BoardOptions } from "./todo-board.ts";

const note = (path: string, content: string, mtime = 1): NoteWithContent => ({ path, title: path.replace(/\.md$/, ""), folder: "", mtime, content });

function setup(over: Partial<NoteRepository> = {}, opts: Partial<BoardOptions> = {}) {
  const messages: string[] = [];
  const writes: Array<[Task, boolean]> = [];
  const repo: NoteRepository = {
    loadTaskNotes: async () => [note("a.md", "- [ ] one\n- [x] two\n")],
    loadRecentNotes: () => [],
    toggleTask: async (t, d) => void writes.push([t, d]),
    ...over,
  };
  const board = new TodoBoard(repo, { notify: (m) => messages.push(m) }, { now: () => new Date(2026, 10, 8, 12).getTime() }, {
    showRecentNotes: false,
    recentNotesCount: 6,
    initialFilter: "all",
    ...opts,
  });
  return { board, messages, writes };
}

test("loads notes and counts open/done", async () => {
  const { board } = setup();
  await board.refresh();
  assert.equal(board.loaded, true);
  assert.deepEqual(board.totals(), { open: 1, done: 1, overdue: 0, today: 0, total: 2 });
});

test("counts overdue and due-today tasks", async () => {
  const { board } = setup({
    loadTaskNotes: async () => [note("a.md", "- [ ] a 📅 2026-11-07\n- [ ] b 📅 2026-11-08\n- [ ] c 📅 2026-11-20\n")],
  });
  await board.refresh();
  const t = board.totals();
  assert.equal(t.overdue, 1);
  assert.equal(t.today, 1);
});

test("filter and search narrow the visible groups; a note-title hit shows all its tasks", async () => {
  const { board } = setup({ loadTaskNotes: async () => [note("a.md", "- [ ] apple\n- [x] pear\n"), note("b.md", "- [ ] kiwi\n")] }, { initialFilter: "open" });
  await board.refresh();
  assert.deepEqual(board.visibleGroups().map((g) => g.tasks.length), [1, 1]);
  board.setFilter("done");
  assert.deepEqual(board.visibleGroups().map((g) => g.note.path), ["a.md"]);
  board.setFilter("all");
  board.setQuery("kiwi");
  assert.deepEqual(board.visibleGroups().map((g) => g.note.path), ["b.md"]);
  board.setQuery("a"); // matches the note title "a"
  assert.equal(board.visibleGroups()[0].tasks.length, 2);
});

test("filter changes are reported to the owner and emitted", async () => {
  const seen: string[] = [];
  const events: string[] = [];
  const { board } = setup({}, { onFilterChange: (f) => seen.push(f) });
  board.subscribe((e) => events.push(e));
  board.setFilter("open");
  board.setFilter("open"); // no change, no event
  assert.deepEqual(seen, ["open"]);
  assert.deepEqual(events, ["view"]);
});

test("a slower, older refresh never overwrites a newer one", async () => {
  let call = 0;
  const gates: Array<() => void> = [];
  const { board } = setup({
    loadTaskNotes: () => {
      const n = ++call;
      if (n === 1) return Promise.resolve([note("a.md", "- [ ] first\n")]);
      return new Promise((res) => gates.push(() => res([note("a.md", `- [ ] load${n}\n`)])));
    },
  });
  await board.refresh();
  const slow = board.refresh();
  const fast = board.refresh();
  gates[1]();
  await fast;
  gates[0]();
  await slow;
  assert.equal(board.notes[0].tasks[0].text, "load3");
});

test("unchanged notes reuse parsed tasks; changed content reparses", async () => {
  let content = "- [ ] one\n";
  const { board } = setup({ loadTaskNotes: async () => [note("a.md", content)] });
  await board.refresh();
  const first = board.notes[0].tasks;
  await board.refresh();
  assert.equal(board.notes[0].tasks, first);
  content = "- [ ] uno\n"; // same length
  await board.refresh();
  assert.equal(board.notes[0].tasks[0].text, "uno");
});

test("toggle is optimistic, writes once, ignores a second click, and refreshes", async () => {
  const { board, writes } = setup();
  await board.refresh();
  const task = board.notes[0].tasks[0];
  const events: string[] = [];
  board.subscribe((e) => events.push(e));
  const p = board.toggle(task);
  assert.equal(board.statusOf(task), "done"); // visible before the write finishes
  assert.deepEqual(events, ["pending"]);
  void board.toggle(task); // ignored while pending
  await p;
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1], true);
  assert.equal(events[events.length - 1], "loaded");
});

test("a pending row stays visible even if the filter would hide it", async () => {
  const { board } = setup({}, { initialFilter: "open" });
  await board.refresh();
  const task = board.notes[0].tasks[0];
  let release!: () => void;
  const p = board.toggle(task, () => new Promise<void>((r) => (release = r)));
  await Promise.resolve();
  assert.equal(board.visibleGroups()[0].tasks.length, 1);
  release();
  await p;
});

test("a failed write notifies and clears the pending state", async () => {
  const { board, messages } = setup({ toggleTask: async () => { throw new Error("changed"); } });
  await board.refresh();
  const task = board.notes[0].tasks[0];
  await board.toggle(task);
  assert.deepEqual(messages, ["changed"]);
  assert.equal(board.statusOf(task), "open");
});

test("dispose stops further updates", async () => {
  const { board } = setup();
  const events: string[] = [];
  board.subscribe((e) => events.push(e));
  board.dispose();
  await board.refresh();
  assert.deepEqual(events, []);
});
