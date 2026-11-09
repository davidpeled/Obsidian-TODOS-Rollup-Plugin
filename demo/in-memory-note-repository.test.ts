import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks } from "../src/domain/task-parser.ts";
import { InMemoryNoteRepository } from "./in-memory-note-repository.ts";
import { DemoVault } from "./vault.ts";

// NoteRepository contract, run against the demo's in-memory implementation.

test("recent notes come newest first", () => {
  const repo = new InMemoryNoteRepository(new DemoVault());
  const recent = repo.loadRecentNotes(3);
  assert.equal(recent.length, 3);
  assert.ok(recent[0].mtime >= recent[1].mtime && recent[1].mtime >= recent[2].mtime);
});

test("task notes carry their content", async () => {
  const repo = new InMemoryNoteRepository(new DemoVault());
  const notes = await repo.loadTaskNotes();
  assert.ok(notes.length > 0 && notes.every((n) => typeof n.content === "string"));
});

test("toggleTask writes, and rejects when the line is gone or the note is missing", async () => {
  const vault = new DemoVault();
  const repo = new InMemoryNoteRepository(vault);
  const inbox = (await repo.loadTaskNotes()).find((n) => n.path === "Inbox.md")!;
  const task = parseTasks(inbox.path, inbox.content)[0];

  await repo.toggleTask(task, true);
  assert.match(vault.get("Inbox.md")!.content, /- \[x\] Try the/);

  vault.update("Inbox.md", "totally different content");
  await assert.rejects(repo.toggleTask(task, true));
  await assert.rejects(repo.toggleTask({ ...task, path: "missing.md" }, true));
});
