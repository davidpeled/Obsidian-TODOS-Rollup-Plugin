import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { TodoBoard } from "../application/todo-board.ts";
import type { NoteWithContent } from "../domain/note.ts";
import type { NoteRepository } from "../domain/ports.ts";
import type { TodoPage as TodoPageClass } from "./todo-page.ts";

let TodoPage: typeof TodoPageClass;

before(async () => {
  GlobalRegistrator.register();
  await import("../test-support/obsidian-shim.ts");
  (globalThis as any).matchMedia = () => ({ matches: true }); // reduced motion: no animation delays
  ({ TodoPage } = await import("./todo-page.ts"));
});
after(() => GlobalRegistrator.unregister());

const note = (content: string): NoteWithContent => ({ path: "a.md", title: "a", folder: "", mtime: Date.now(), content });

function build(over: Partial<NoteRepository> = {}, filter: "open" | "all" = "all") {
  const messages: string[] = [];
  const repo: NoteRepository = {
    loadTaskNotes: async () => [note("- [ ] one\n- [x] two\n")],
    loadRecentNotes: () => [],
    toggleTask: async () => {},
    ...over,
  };
  const clock = { now: () => Date.now() };
  const board = new TodoBoard(repo, { notify: (m) => messages.push(m) }, clock, {
    showRecentNotes: false,
    recentNotesCount: 6,
    initialFilter: filter,
  });
  const el = document.createElement("div");
  const page = new TodoPage(el, {
    board,
    opener: { openNote() {}, openLink() {} },
    clock,
    vaultName: "V",
    showGreeting: true,
    showRecentNotes: false,
  });
  return { el, page, messages };
}

test("renders tasks grouped by note and respects the filter", async () => {
  const { el, page } = build({}, "open");
  await page.mount();
  assert.equal(el.querySelectorAll(".tr-note").length, 1);
  assert.equal(el.querySelectorAll(".tr-task").length, 1);
  page.destroy();
});

test("clicking a checkbox flips it instantly and writes once", async () => {
  const writes: boolean[] = [];
  const { el, page } = build({ toggleTask: async (_t, d) => void writes.push(d) });
  await page.mount();
  const check = el.querySelector<HTMLElement>(".tr-check")!;
  check.click();
  assert.equal(check.getAttribute("aria-checked"), "true");
  check.click(); // ignored while in flight
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(writes, [true]);
  page.destroy();
});

test("a failed write shows a notice", async () => {
  const { el, page, messages } = build({ toggleTask: async () => { throw new Error("changed"); } });
  await page.mount();
  el.querySelector<HTMLElement>(".tr-check")!.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(messages, ["changed"]);
  page.destroy();
});

test("destroy during the first scan leaves no timer behind", async () => {
  const realSet = window.setInterval;
  const realClear = window.clearInterval;
  const live = new Set<number>();
  window.setInterval = ((fn: () => void, ms: number) => {
    const id = realSet(fn, ms) as unknown as number;
    live.add(id);
    return id;
  }) as typeof window.setInterval;
  window.clearInterval = ((id: number) => (live.delete(id), realClear(id))) as typeof window.clearInterval;
  try {
    let release!: () => void;
    const { page } = build({ loadTaskNotes: () => new Promise((res) => (release = () => res([]))) });
    const mounting = page.mount();
    page.destroy();
    release();
    await mounting;
    assert.equal(live.size, 0);
  } finally {
    window.setInterval = realSet;
    window.clearInterval = realClear;
  }
});
