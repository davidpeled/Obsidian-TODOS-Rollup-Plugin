import type { NoteRepository } from "../src/domain/ports.ts";
import { toggleTaskInContent } from "../src/domain/task-toggle.ts";
import { noteMeta, type DemoVault } from "./vault.ts";

/** The fake Obsidian: a NoteRepository over the in-memory vault. */
export class InMemoryNoteRepository implements NoteRepository {
  constructor(private vault: DemoVault) {}

  async loadTaskNotes() {
    // Only a read-saving hint, like Obsidian's metadata cache; parseTasks is the real filter.
    return this.vault.all().filter((n) => /\[.\]/.test(n.content)).map((n) => ({ ...noteMeta(n), content: n.content }));
  }

  loadRecentNotes(limit: number) {
    return this.vault
      .all()
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map(noteMeta);
  }

  async toggleTask(task: Parameters<NoteRepository["toggleTask"]>[0], done: boolean) {
    const n = this.vault.get(task.path);
    if (!n) throw new Error(`Couldn't find ${task.path}`);
    this.vault.update(task.path, toggleTaskInContent(n.content, task, done));
  }
}
